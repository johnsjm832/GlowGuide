import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const db = new Database("skincare.db");

// Initialize DB for premium features
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT DEFAULT NULL,
    theme_primary_color TEXT DEFAULT NULL,
    theme_secondary_color TEXT DEFAULT NULL,
    routine TEXT DEFAULT '[]',
    skin_type TEXT DEFAULT NULL,
    sensitivity TEXT DEFAULT NULL,
    concerns TEXT DEFAULT '[]',
    breakout_frequency TEXT DEFAULT NULL,
    routine_size TEXT DEFAULT NULL,
    avoid_ingredients TEXT DEFAULT '[]',
    sunscreen_usage TEXT DEFAULT NULL,
    onboarding_completed BOOLEAN DEFAULT 0,
    tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'none',
    subscription_end_date DATETIME DEFAULT NULL,
    trial_end_date DATETIME DEFAULT NULL
  );
  CREATE TABLE IF NOT EXISTS saved_routines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS saved_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS check_ins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    dryness INTEGER,
    breakouts INTEGER,
    irritation INTEGER,
    sunscreen BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anon_client_id TEXT,
    user_id INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS saved_comparisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS routine_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'morning' or 'night'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS skin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    acne INTEGER,
    oiliness INTEGER,
    dryness INTEGER,
    irritation INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT NULL,
    email TEXT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  
  -- Migration: Reset old green theme colors to NULL to respect new default theme
  UPDATE users SET theme_primary_color = NULL, theme_secondary_color = NULL WHERE theme_primary_color = '#10b981';
`);

// Migration: Add missing columns to users table if they don't exist
const columns = [
  ['name', 'TEXT DEFAULT NULL'],
  ['skin_type', 'TEXT DEFAULT NULL'],
  ['sensitivity', 'TEXT DEFAULT NULL'],
  ['concerns', "TEXT DEFAULT '[]'"],
  ['breakout_frequency', 'TEXT DEFAULT NULL'],
  ['routine_size', 'TEXT DEFAULT NULL'],
  ['avoid_ingredients', "TEXT DEFAULT '[]'"],
  ['sunscreen_usage', 'TEXT DEFAULT NULL'],
  ['onboarding_completed', 'BOOLEAN DEFAULT 0'],
  ['theme_id', "TEXT DEFAULT 'glow'"],
  ['tier', "TEXT DEFAULT 'free'"],
  ['subscription_status', "TEXT DEFAULT 'none'"],
  ['subscription_end_date', 'DATETIME DEFAULT NULL'],
  ['trial_end_date', 'DATETIME DEFAULT NULL'],
  ['firebase_uid', 'TEXT DEFAULT NULL']
];

for (const [name, def] of columns) {
  try {
    db.exec(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
    console.log(`Migration: Added column ${name} to users table.`);
  } catch (e) {
    // Column likely already exists, ignore
  }
}

// Migration: Add user_id to usage_logs if it doesn't exist
try {
  db.exec(`ALTER TABLE usage_logs ADD COLUMN user_id INTEGER DEFAULT NULL`);
  console.log(`Migration: Added column user_id to usage_logs table.`);
} catch (e) {}

// Migration: Add zones_data to skin_logs if it doesn't exist
try {
  db.exec(`ALTER TABLE skin_logs ADD COLUMN zones_data TEXT DEFAULT NULL`);
  console.log(`Migration: Added column zones_data to skin_logs table.`);
} catch (e) {}

const FIREBASE_API_KEY = "AIzaSyADqoiz6sPyiUwcrpzHC3W29hHaDpNecxs";
const tokenCache = new Map<string, { uid: string; email: string; expires: number }>();

async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email: string } | null> {
  const cached = tokenCache.get(idToken);
  if (cached && cached.expires > Date.now()) {
    return { uid: cached.uid, email: cached.email };
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json() as any;
    if (data && data.users && data.users.length > 0) {
      const u = data.users[0];
      const result = { uid: u.localId, email: u.email };
      // Cache for 5 minutes
      tokenCache.set(idToken, { ...result, expires: Date.now() + 5 * 60 * 1000 });
      return result;
    }
    return null;
  } catch (err) {
    console.error("Firebase ID Token verification error:", err);
    return null;
  }
}

const getUserFromDb = (userId: any) => {
  if (!userId) return null;
  let user = db.prepare("SELECT * FROM users WHERE firebase_uid = ?").get(String(userId)) as any;
  if (!user && !isNaN(Number(userId))) {
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(userId)) as any;
  }
  return user;
};

async function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const verified = await verifyFirebaseToken(token);
    if (verified) {
      let user = db.prepare("SELECT * FROM users WHERE firebase_uid = ? OR email = ?").get(verified.uid, verified.email) as any;
      if (!user) {
        const info = db.prepare("INSERT INTO users (firebase_uid, email, password) VALUES (?, ?, ?)")
          .run(verified.uid, verified.email, "firebase-auth-managed");
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      } else if (!user.firebase_uid) {
        db.prepare("UPDATE users SET firebase_uid = ? WHERE id = ?").run(verified.uid, user.id);
        user.firebase_uid = verified.uid;
      }
      req.user = user;
    } else {
      return res.status(401).json({ error: "INVALID_TOKEN" });
    }
  }
  next();
}

function requireUserAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: "UNAUTHORIZED_NO_SESSION" });
  }
  
  const requestedUserId = req.params.userId || req.body.userId;
  if (requestedUserId) {
    if (req.user.firebase_uid !== String(requestedUserId) && String(req.user.id) !== String(requestedUserId)) {
      return res.status(403).json({ error: "FORBIDDEN_USER_MISMATCH" });
    }
  }
  next();
}

app.use(express.json());
app.use(authMiddleware);

const safeJsonParse = (str: string | null, fallback: any = []) => {
  if (!str || str === "undefined") return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error("Failed to parse JSON:", e, "String:", str);
    return fallback;
  }
};

// --- API Routes ---

// 1. Usage Tracking (Tiered Limits)
app.post("/api/usage/check", (req: any, res) => {
  const { clientId, userId } = req.body;

  // Cleanup old logs (older than 24 hours)
  db.prepare("DELETE FROM usage_logs WHERE created_at < datetime('now', '-24 hours')").run();

  if (userId) {
    if (!req.user || (req.user.firebase_uid !== String(userId) && String(req.user.id) !== String(userId))) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const user = req.user;
    if (user.tier === 'premium') {
      return res.json({ allowed: true, tier: 'premium' });
    }

    // Free tier: 3 per 24 hours
    const row = db.prepare("SELECT COUNT(*) as count FROM usage_logs WHERE (user_id = ? OR user_id = ?) AND created_at > datetime('now', '-24 hours')")
      .get(user.id, user.firebase_uid || '') as { count: number };
    
    if (row.count >= 3) {
      return res.json({ allowed: false, error: "FREE_LIMIT_REACHED", count: row.count, tier: 'free' });
    }
    return res.json({ allowed: true, count: row.count, tier: 'free' });
  }

  // Guest tier: 1 per 24 hours
  if (!clientId) {
    return res.status(400).json({ error: "MISSING_CLIENT_ID" });
  }

  const row = db.prepare("SELECT COUNT(*) as count FROM usage_logs WHERE anon_client_id = ? AND created_at > datetime('now', '-24 hours')").get(clientId) as { count: number };

  if (row.count >= 1) {
    return res.json({ allowed: false, error: "GUEST_LIMIT_REACHED", count: row.count, tier: 'guest' });
  }

  res.json({ allowed: true, count: row.count, tier: 'guest' });
});

app.post("/api/usage/log", (req: any, res) => {
  const { clientId, userId } = req.body;

  if (userId) {
    if (!req.user || (req.user.firebase_uid !== String(userId) && String(req.user.id) !== String(userId))) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    db.prepare("INSERT INTO usage_logs (user_id) VALUES (?)").run(req.user.id);
  } else if (clientId) {
    db.prepare("INSERT INTO usage_logs (anon_client_id) VALUES (?)").run(clientId);
  }

  res.json({ success: true });
});

// 2. Authentication and Account Access
app.post("/api/auth/login", (req, res) => {
  const { email } = req.body;
  
  // Try to find user or create one for this demo
  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  if (!user) {
    const info = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)").run(email, 'password');
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  }

  res.json({ 
    id: user.id, 
    email: user.email, 
    name: user.name || null,
    token: "mock-jwt-token",
    theme_primary_color: user.theme_primary_color || null,
    theme_secondary_color: user.theme_secondary_color || null,
    routine: safeJsonParse(user.routine),
    skinType: user.skin_type || null,
    sensitivity: user.sensitivity || null,
    concerns: safeJsonParse(user.concerns),
    breakoutFrequency: user.breakout_frequency || null,
    routineSize: user.routine_size || null,
    avoidIngredients: safeJsonParse(user.avoid_ingredients),
    sunscreenUsage: user.sunscreen_usage || null,
    onboardingCompleted: !!user.onboarding_completed,
    theme_id: user.theme_id || 'glow',
    tier: user.tier || 'free',
    subscriptionStatus: user.subscription_status || 'none',
    subscriptionEndDate: user.subscription_end_date || null,
    trialEndDate: user.trial_end_date || null
  });
});

const profanity = [
  "fuck", "shit", "asshole", "bitch", "dick", "pussy", "cunt", "bastard", "idiot", "stupid", "dumb", "moron",
  "nigger", "faggot", "retard", "slut", "whore", "rape", "kill", "die", "suicide", "porn", "sex", "naked"
];

app.post("/api/user/profile", requireUserAuth, (req: any, res) => {
  const { 
    userId, 
    name,
    skinType, 
    sensitivity, 
    concerns, 
    breakoutFrequency, 
    routineSize, 
    avoidIngredients, 
    sunscreenUsage,
    onboardingCompleted 
  } = req.body;

  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });

  // Profanity check for name
  if (name) {
    const lower = name.toLowerCase();
    if (profanity.some(p => lower.includes(p))) {
      return res.status(400).json({ error: "INVALID_NAME" });
    }
  }

  db.prepare(`
    UPDATE users SET 
      name = COALESCE(?, name),
      skin_type = COALESCE(?, skin_type), 
      sensitivity = COALESCE(?, sensitivity), 
      concerns = COALESCE(?, concerns), 
      breakout_frequency = COALESCE(?, breakout_frequency), 
      routine_size = COALESCE(?, routine_size), 
      avoid_ingredients = COALESCE(?, avoid_ingredients), 
      sunscreen_usage = COALESCE(?, sunscreen_usage),
      onboarding_completed = COALESCE(?, onboarding_completed)
    WHERE id = ?
  `).run(
    name || null,
    skinType || null, 
    sensitivity || null, 
    concerns ? JSON.stringify(concerns) : null, 
    breakoutFrequency || null, 
    routineSize || null, 
    avoidIngredients ? JSON.stringify(avoidIngredients) : null, 
    sunscreenUsage || null,
    onboardingCompleted !== undefined ? (onboardingCompleted ? 1 : 0) : null,
    req.user.id
  );

  res.json({ success: true });
});

app.post("/api/user/theme", requireUserAuth, (req: any, res) => {
  const { userId, themeId, primaryColor, secondaryColor } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }

  // Validation
  if (themeId) {
    const validThemes = ['glow', 'calm', 'clinical', 'midnight', 'rose'];
    if (!validThemes.includes(themeId)) {
      return res.status(400).json({ error: "INVALID_THEME_ID" });
    }
  }

  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (primaryColor && secondaryColor) {
    if (!hexRegex.test(primaryColor) || !hexRegex.test(secondaryColor)) {
      return res.status(400).json({ error: "INVALID_HEX" });
    }
  }

  db.prepare("UPDATE users SET theme_id = ?, theme_primary_color = ?, theme_secondary_color = ? WHERE id = ?").run(
    themeId || 'glow',
    primaryColor || null,
    secondaryColor || null,
    req.user.id
  );

  res.json({ success: true });
});

app.post("/api/user/routine", requireUserAuth, (req: any, res) => {
  const { userId, routine } = req.body;
  if (!userId || userId <= 0) return res.status(401).json({ error: "UNAUTHORIZED" });
  
  db.prepare("UPDATE users SET routine = ? WHERE id = ?").run(JSON.stringify(routine), req.user.id);
  res.json({ success: true });
});

app.get("/api/user/routine/:userId", requireUserAuth, (req: any, res) => {
  const { userId } = req.params;
  const user = db.prepare("SELECT routine FROM users WHERE id = ?").get(req.user.id) as any;
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });
  
  res.json({ routine: safeJsonParse(user.routine) });
});

app.post("/api/user/analysis", requireUserAuth, (req: any, res) => {
  const { userId, analysis } = req.body;
  if (!userId || userId <= 0) return res.status(401).json({ error: "UNAUTHORIZED" });
  
  db.prepare("INSERT INTO saved_analyses (user_id, data) VALUES (?, ?)").run(req.user.id, JSON.stringify(analysis));
  res.json({ success: true });
});

app.get("/api/user/analyses/:userId", requireUserAuth, (req: any, res) => {
  const { userId } = req.params;
  const rows = db.prepare("SELECT id, data, created_at FROM saved_analyses WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id) as any[];
  
  res.json({ analyses: rows.map(r => ({ id: r.id, ...safeJsonParse(r.data, {}), createdAt: r.created_at })) });
});

app.delete("/api/user/analysis/:id", requireUserAuth, (req: any, res) => {
  const { id } = req.params;
  const analysis = db.prepare("SELECT user_id FROM saved_analyses WHERE id = ?").get(id) as any;
  if (analysis) {
    if (analysis.user_id !== req.user.id) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    db.prepare("DELETE FROM saved_analyses WHERE id = ?").run(id);
  }
  res.json({ success: true });
});

app.post("/api/user/saved-routine", requireUserAuth, (req: any, res) => {
  const { userId, routine } = req.body;
  if (!userId || userId <= 0) return res.status(401).json({ error: "UNAUTHORIZED" });
  
  db.prepare("INSERT INTO saved_routines (user_id, data) VALUES (?, ?)").run(req.user.id, JSON.stringify(routine));
  res.json({ success: true });
});

app.get("/api/user/saved-routines/:userId", requireUserAuth, (req: any, res) => {
  const { userId } = req.params;
  const rows = db.prepare("SELECT id, data, created_at FROM saved_routines WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id) as any[];
  
  res.json({ routines: rows.map(r => ({ id: r.id, ...safeJsonParse(r.data, {}), createdAt: r.created_at })) });
});

app.delete("/api/user/saved-routine/:id", requireUserAuth, (req: any, res) => {
  const { id } = req.params;
  const routine = db.prepare("SELECT user_id FROM saved_routines WHERE id = ?").get(id) as any;
  if (routine) {
    if (routine.user_id !== req.user.id) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    db.prepare("DELETE FROM saved_routines WHERE id = ?").run(id);
  }
  res.json({ success: true });
});

app.post("/api/user/comparison", requireUserAuth, (req: any, res) => {
  const { userId, comparison } = req.body;
  if (!userId || userId <= 0) return res.status(401).json({ error: "UNAUTHORIZED" });
  
  db.prepare("INSERT INTO saved_comparisons (user_id, data) VALUES (?, ?)").run(req.user.id, JSON.stringify(comparison));
  res.json({ success: true });
});

app.get("/api/user/comparisons/:userId", requireUserAuth, (req: any, res) => {
  const { userId } = req.params;
  const rows = db.prepare("SELECT id, data, created_at FROM saved_comparisons WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id) as any[];
  
  res.json({ comparisons: rows.map(r => ({ id: r.id, ...safeJsonParse(r.data, {}), createdAt: r.created_at })) });
});

app.delete("/api/user/comparison/:id", requireUserAuth, (req: any, res) => {
  const { id } = req.params;
  const comparison = db.prepare("SELECT user_id FROM saved_comparisons WHERE id = ?").get(id) as any;
  if (comparison) {
    if (comparison.user_id !== req.user.id) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    db.prepare("DELETE FROM saved_comparisons WHERE id = ?").run(id);
  }
  res.json({ success: true });
});

app.get("/api/dashboard/data/:userId", requireUserAuth, (req: any, res) => {
  const { userId } = req.params;
  const dbUserId = req.user.id;

  const routines = db.prepare("SELECT id, data, created_at FROM saved_routines WHERE user_id = ? ORDER BY created_at DESC LIMIT 5").all(dbUserId) as any[];
  const analyses = db.prepare("SELECT id, data, created_at FROM saved_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 5").all(dbUserId) as any[];
  const lastCheckIn = db.prepare("SELECT * FROM skin_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(dbUserId);
  const routine = db.prepare("SELECT routine FROM users WHERE id = ?").get(dbUserId) as any;
  const comparisons = db.prepare("SELECT id, data, created_at FROM saved_comparisons WHERE user_id = ? ORDER BY created_at DESC LIMIT 5").all(dbUserId) as any[];

  // Calculate Streak
  const logs = db.prepare(`
    SELECT DISTINCT date(created_at) as log_date 
    FROM routine_logs 
    WHERE user_id = ? 
    ORDER BY log_date DESC
  `).all(dbUserId) as { log_date: string }[];

  let streak = 0;
  if (logs.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastLogDate = new Date(logs[0].log_date);
    lastLogDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      streak = 1;
      for (let i = 1; i < logs.length; i++) {
        const prev = new Date(logs[i-1].log_date);
        const curr = new Date(logs[i].log_date);
        prev.setHours(0, 0, 0, 0);
        curr.setHours(0, 0, 0, 0);
        if ((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24) === 1) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  // Weekly Completion Rate
  const weeklyLogs = db.prepare(`
    SELECT COUNT(*) as count 
    FROM routine_logs 
    WHERE user_id = ? AND created_at > datetime('now', '-7 days')
  `).get(dbUserId) as { count: number };
  const weeklyCompletionRate = Math.min(100, Math.round((weeklyLogs.count / 14) * 100));

  // Last Routine Logged
  const lastRoutine = db.prepare("SELECT * FROM routine_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(dbUserId);

  // Skin Trends (Last 30 days)
  const skinTrends = db.prepare("SELECT * FROM skin_logs WHERE user_id = ? AND created_at > datetime('now', '-30 days') ORDER BY created_at ASC").all(dbUserId) as any[];

  // Health Score Calculation
  const calculateHealthScore = (logs: any[], completionRate: number) => {
    if (logs.length === 0) return 50 + (completionRate * 0.5); // Baseline if no skin logs
    
    const latest = logs[logs.length - 1];
    const acneScore = (10 - (latest.acne || 0)) * 10;
    const irritationScore = (10 - (latest.irritation || 0)) * 10;
    const balanceScore = Math.max(0, (10 - (Math.abs(5 - (latest.dryness || 5)) + Math.abs(5 - (latest.oiliness || 5)))) * 10);
    
    const conditionScore = (acneScore + irritationScore + balanceScore) / 3;
    return Math.round((completionRate * 0.4) + (conditionScore * 0.6));
  };

  const healthScore = calculateHealthScore(skinTrends, weeklyCompletionRate);
  
  // Previous week score for trend
  const prevWeeklyLogs = db.prepare(`
    SELECT COUNT(*) as count 
    FROM routine_logs 
    WHERE user_id = ? AND created_at BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days')
  `).get(dbUserId) as { count: number };
  const prevWeeklyCompletionRate = Math.min(100, Math.round((prevWeeklyLogs.count / 14) * 100));
  
  const prevSkinLogs = db.prepare(`
    SELECT * FROM skin_logs 
    WHERE user_id = ? AND created_at BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days')
    ORDER BY created_at ASC
  `).all(dbUserId);
  
  const prevScore = calculateHealthScore(prevSkinLogs, prevWeeklyCompletionRate);
  const healthScoreTrend = healthScore - prevScore;

  res.json({
    savedRoutines: routines.map(r => ({ id: r.id, ...safeJsonParse(r.data, {}), createdAt: r.created_at })),
    savedAnalyses: analyses.map(r => ({ id: r.id, ...safeJsonParse(r.data, {}), createdAt: r.created_at })),
    savedComparisons: comparisons.map(r => ({ id: r.id, ...safeJsonParse(r.data, {}), createdAt: r.created_at })),
    lastCheckIn,
    routineScore: 85, // Mock score for now
    scansCount: analyses.length,
    streak,
    weeklyCompletionRate,
    lastRoutine,
    skinTrends,
    healthScore,
    healthScoreTrend
  });
});

app.post("/api/routine/log", requireUserAuth, (req: any, res) => {
  const { userId, type } = req.body;
  if (!userId || userId <= 0) return res.status(401).json({ error: "UNAUTHORIZED" });

  // Prevent double logging same type on same day
  const existing = db.prepare(`
    SELECT id FROM routine_logs 
    WHERE user_id = ? AND type = ? AND date(created_at) = date('now')
  `).get(req.user.id, type);

  if (existing) {
    return res.status(400).json({ error: "ALREADY_LOGGED_TODAY" });
  }

  db.prepare("INSERT INTO routine_logs (user_id, type) VALUES (?, ?)").run(req.user.id, type);
  res.json({ success: true });
});

app.post("/api/skin/log", requireUserAuth, (req: any, res) => {
  const { userId, acne, oiliness, dryness, irritation, zonesData, zones_data } = req.body;
  if (!userId || userId <= 0) return res.status(401).json({ error: "UNAUTHORIZED" });

  const finalZonesData = zones_data || (zonesData ? JSON.stringify(zonesData) : null);

  // Only one skin log per day
  const existing = db.prepare(`
    SELECT id FROM skin_logs 
    WHERE user_id = ? AND date(created_at) = date('now')
  `).get(req.user.id);

  if (existing) {
    db.prepare(`
      UPDATE skin_logs 
      SET acne = ?, oiliness = ?, dryness = ?, irritation = ?, zones_data = ? 
      WHERE id = ?
    `).run(acne, oiliness, dryness, irritation, finalZonesData, existing.id);
  } else {
    db.prepare(`
      INSERT INTO skin_logs (user_id, acne, oiliness, dryness, irritation, zones_data) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, acne, oiliness, dryness, irritation, finalZonesData);
  }
  
  res.json({ success: true });
});

app.post("/api/dashboard/check-in", requireUserAuth, (req: any, res) => {
  res.json({ success: true });
});

// 8. Subscriptions
app.post("/api/subscription/start-trial", requireUserAuth, (req: any, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });

  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7);

  db.prepare(`
    UPDATE users SET 
      tier = 'premium',
      subscription_status = 'trialing',
      trial_end_date = ?
    WHERE id = ?
  `).run(trialEndDate.toISOString(), req.user.id);

  res.json({ success: true, tier: 'premium', subscriptionStatus: 'trialing', trialEndDate: trialEndDate.toISOString() });
});

app.post("/api/subscription/subscribe", requireUserAuth, (req: any, res) => {
  const { userId, plan } = req.body; // 'monthly' or 'yearly'
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });

  const endDate = new Date();
  if (plan === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  db.prepare(`
    UPDATE users SET 
      tier = 'premium',
      subscription_status = 'active',
      subscription_end_date = ?
    WHERE id = ?
  `).run(endDate.toISOString(), req.user.id);

  res.json({ success: true, tier: 'premium', subscriptionStatus: 'active', subscriptionEndDate: endDate.toISOString() });
});

app.post("/api/subscription/cancel", requireUserAuth, (req: any, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });

  db.prepare(`
    UPDATE users SET 
      subscription_status = 'canceled'
    WHERE id = ?
  `).run(req.user.id);

  res.json({ success: true, subscriptionStatus: 'canceled' });
});

app.post("/api/feedback", (req: any, res) => {
  const { userId, email, message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "MISSING_MESSAGE" });
  }

  let dbUserId = null;
  if (userId) {
    if (!req.user || (req.user.firebase_uid !== String(userId) && String(req.user.id) !== String(userId))) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    dbUserId = req.user.id;
  }

  db.prepare("INSERT INTO feedback (user_id, email, message) VALUES (?, ?, ?)").run(
    dbUserId,
    email || null,
    message
  );

  res.json({ success: true });
});

// --- Backend Gemini API integration ---

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

const getLanguageInstruction = (lang?: string) => {
  if (!lang || lang === 'en') return "Response language: English.";
  if (lang === 'es') return "CRITICAL: You MUST write all textual explanations, summaries, guidelines, bullet points, warnings, descriptions, recommendations, and text content values in Spanish (Español). Do not modify JSON keys.";
  if (lang === 'fr') return "CRITICAL: You MUST write all textual explanations, summaries, guidelines, bullet points, warnings, descriptions, recommendations, and text content values in French (Français). Do not modify JSON keys.";
  if (lang === 'ko') return "CRITICAL: You MUST write all textual explanations, summaries, guidelines, bullet points, warnings, descriptions, recommendations, and text content values in Korean (한국어). Do not modify JSON keys.";
  return "Response language: English.";
};

function checkUsageLimit(clientId: string | null, userId: number | null) {
  // Cleanup old logs (older than 24 hours)
  db.prepare("DELETE FROM usage_logs WHERE created_at < datetime('now', '-24 hours')").run();

  if (userId) {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user) return { allowed: false, error: "USER_NOT_FOUND", tier: 'free' };

    if (user.tier === 'premium') {
      return { allowed: true, tier: 'premium' };
    }

    // Free tier: 3 per 24 hours
    const row = db.prepare("SELECT COUNT(*) as count FROM usage_logs WHERE user_id = ? AND created_at > datetime('now', '-24 hours')").get(userId) as { count: number };
    
    if (row.count >= 3) {
      return { allowed: false, error: "FREE_LIMIT_REACHED", count: row.count, tier: 'free' };
    }
    return { allowed: true, count: row.count, tier: 'free' };
  }

  // Guest tier: 1 per 24 hours
  if (!clientId) {
    return { allowed: false, error: "MISSING_CLIENT_ID", tier: 'guest' };
  }

  const row = db.prepare("SELECT COUNT(*) as count FROM usage_logs WHERE anon_client_id = ? AND created_at > datetime('now', '-24 hours')").get(clientId) as { count: number };

  if (row.count >= 1) {
    return { allowed: false, error: "GUEST_LIMIT_REACHED", count: row.count, tier: 'guest' };
  }

  return { allowed: true, count: row.count, tier: 'guest' };
}

function logUsageLimit(clientId: string | null, userId: number | null) {
  if (userId && userId > 0) {
    db.prepare("INSERT INTO usage_logs (user_id) VALUES (?)").run(userId);
  } else if (clientId) {
    db.prepare("INSERT INTO usage_logs (anon_client_id) VALUES (?)").run(clientId);
  }
}

app.post("/api/gemini/analyze-ingredients", async (req, res) => {
  const { productName, ingredients, skinType, language, clientId, userId } = req.body;
  
  // Enforce usage limits on the backend on every analytical query
  const status = checkUsageLimit(clientId, userId || null);
  if (!status.allowed) {
    return res.status(403).json({ error: status.error });
  }

  try {
    const langInst = getLanguageInstruction(language);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Analyze these skincare ingredients for "${productName}"${skinType ? ` specifically for ${skinType} skin` : ""}:\n\n${ingredients}`,
      config: {
        systemInstruction: `You are an expert dermatological chemist. Analyze product ingredients objectively. Provide insights on compatibility, strengths, potential concerns, and best use cases. If no ingredients are provided, analyze based on the product name if possible, but prioritize the list. Include an 'insight' object with observation, cause, and action. ${langInst}`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            compatibilityScore: { type: Type.NUMBER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            potentialConcerns: { type: Type.ARRAY, items: { type: Type.STRING } },
            bestFor: { type: Type.ARRAY, items: { type: Type.STRING } },
            ingredientHighlights: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["name", "description"]
              }
            },
            suitableFor: { type: Type.STRING },
            lessSuitableFor: { type: Type.STRING },
            keyIngredients: { type: Type.STRING },
            irritationWatchouts: { type: Type.STRING },
            routineCompatibility: { type: Type.STRING },
            insightObservation: { type: Type.STRING },
            insightCause: { type: Type.STRING },
            insightAction: { type: Type.STRING }
          },
          required: [
            "compatibilityScore", "strengths", "potentialConcerns", "bestFor", 
            "ingredientHighlights", "suitableFor", "lessSuitableFor", "keyIngredients", 
            "irritationWatchouts", "routineCompatibility", "insightObservation", 
            "insightCause", "insightAction"
          ]
        }
      }
    });

    // Track usage only upon successful analysis
    logUsageLimit(clientId, userId || null);

    res.json(JSON.parse(response.text || "{}"));
  } catch (err: any) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: err.message || "Failed to analyze ingredients with Gemini" });
  }
});

app.post("/api/gemini/analyze-routine", async (req, res) => {
  const { products, language } = req.body;
  try {
    const langInst = getLanguageInstruction(language);
    const productsList = products.map((p: any) => `${p.name} (${p.time}, ${p.frequency}): ${p.ingredients}`).join("\n\n");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Analyze this skincare routine for safety and compatibility:\n\n${productsList}`,
      config: {
        systemInstruction: `You are a professional esthetician. Evaluate the routine for ingredient conflicts, overall balance, and safety. Identify specific conflicts. Include an 'insight' section. ${langInst}`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            safetyScore: { type: Type.NUMBER },
            compatibilityScore: { type: Type.NUMBER },
            balanceScore: { type: Type.NUMBER },
            conflicts: { 
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  ingredients: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  recommendation: { type: Type.STRING }
                },
                required: ["ingredients", "explanation", "recommendation"]
              }
            },
            summary: { type: Type.STRING },
            insightObservation: { type: Type.STRING },
            insightCause: { type: Type.STRING },
            insightAction: { type: Type.STRING }
          },
          required: [
            "score", "safetyScore", "compatibilityScore", "balanceScore", 
            "conflicts", "summary", "insightObservation", "insightCause", "insightAction"
          ]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (err: any) {
    console.error("Gemini Routine Error:", err);
    res.status(500).json({ error: err.message || "Failed to analyze routine with Gemini" });
  }
});

app.post("/api/gemini/compare-products", async (req, res) => {
  const { productA, productB, language } = req.body;
  try {
    const langInst = getLanguageInstruction(language);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Compare product A: ${productA.name}\nIngredients: ${productA.ingredients}\n\nWith product B: ${productB.name}\nIngredients: ${productB.ingredients}`,
      config: {
        systemInstruction: `You are a skincare product formulator. Compare two products across hydration, irritation, pore clogging, barrier support, and active strength. Provide a detailed summary and verdict. Include an 'insight' section in the summary object. ${langInst}`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hydrationSupport: { 
              type: Type.OBJECT, 
              properties: { scoreA: { type: Type.NUMBER }, scoreB: { type: Type.NUMBER }, explanation: { type: Type.STRING } },
              required: ["scoreA", "scoreB", "explanation"]
            },
            irritationRisk: { 
              type: Type.OBJECT, 
              properties: { scoreA: { type: Type.NUMBER }, scoreB: { type: Type.NUMBER }, explanation: { type: Type.STRING } },
              required: ["scoreA", "scoreB", "explanation"]
            },
            poreClogRisk: { 
              type: Type.OBJECT, 
              properties: { scoreA: { type: Type.NUMBER }, scoreB: { type: Type.NUMBER }, explanation: { type: Type.STRING } },
              required: ["scoreA", "scoreB", "explanation"]
            },
            barrierSupport: { 
              type: Type.OBJECT, 
              properties: { scoreA: { type: Type.NUMBER }, scoreB: { type: Type.NUMBER }, explanation: { type: Type.STRING } },
              required: ["scoreA", "scoreB", "explanation"]
            },
            activeStrength: { 
              type: Type.OBJECT, 
              properties: { scoreA: { type: Type.NUMBER }, scoreB: { type: Type.NUMBER }, explanation: { type: Type.STRING } },
              required: ["scoreA", "scoreB", "explanation"]
            },
            skinTypeCompatibility: {
              type: Type.OBJECT,
              properties: { productA: { type: Type.STRING }, productB: { type: Type.STRING }, comparison: { type: Type.STRING } },
              required: ["productA", "productB", "comparison"]
            },
            summary: {
              type: Type.OBJECT,
              properties: {
                betterForDry: { type: Type.STRING },
                betterForOily: { type: Type.STRING },
                higherIrritationRisk: { type: Type.STRING },
                strongerHydration: { type: Type.STRING },
                finalVerdict: { type: Type.STRING },
                insightObservation: { type: Type.STRING },
                insightCause: { type: Type.STRING },
                insightAction: { type: Type.STRING }
              },
              required: [
                "betterForDry", "betterForOily", "higherIrritationRisk", 
                "strongerHydration", "finalVerdict", "insightObservation", 
                "insightCause", "insightAction"
              ]
            }
          },
          required: [
            "hydrationSupport", "irritationRisk", "poreClogRisk", 
            "barrierSupport", "activeStrength", "skinTypeCompatibility", "summary"
          ]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (err: any) {
    console.error("Gemini Compare Error:", err);
    res.status(500).json({ error: err.message || "Failed to compare products with Gemini" });
  }
});

app.post("/api/gemini/generate-routine", async (req, res) => {
  const { formData, language } = req.body;
  try {
    const langInst = getLanguageInstruction(language);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a skincare routine based on these preferences: ${JSON.stringify(formData)}`,
      config: {
        systemInstruction: `You are a clinical dermatologist. Generate a morning and evening routine. Identify what to pause and what to introduce slowly. Include an 'insight' section. ${langInst}`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            safetyScore: { type: Type.NUMBER },
            compatibilityScore: { type: Type.NUMBER },
            balanceScore: { type: Type.NUMBER },
            morningRoutine: { type: Type.STRING },
            eveningRoutine: { type: Type.STRING },
            whatToPause: { type: Type.STRING },
            whatToIntroduceSlowly: { type: Type.STRING },
            likelyMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
            expectedResults: { type: Type.STRING },
            insightObservation: { type: Type.STRING },
            insightCause: { type: Type.STRING },
            insightAction: { type: Type.STRING }
          },
          required: [
            "score", "safetyScore", "compatibilityScore", "balanceScore", 
            "morningRoutine", "eveningRoutine", "whatToPause", 
            "whatToIntroduceSlowly", "likelyMistakes", "expectedResults", 
            "insightObservation", "insightCause", "insightAction"
          ]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (err: any) {
    console.error("Gemini Generate Routine Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate routine with Gemini" });
  }
});

// --- Vite Integration ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
