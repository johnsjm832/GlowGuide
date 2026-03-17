import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const db = new Database("skincare.db");

// Initialize DB for "paid" mode stub
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
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
    onboarding_completed BOOLEAN DEFAULT 0
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
  
  -- Migration: Reset old green theme colors to NULL to respect new default theme
  UPDATE users SET theme_primary_color = NULL, theme_secondary_color = NULL WHERE theme_primary_color = '#10b981';
`);

// Migration: Add missing columns to users table if they don't exist
const columns = [
  ['skin_type', 'TEXT DEFAULT NULL'],
  ['sensitivity', 'TEXT DEFAULT NULL'],
  ['concerns', "TEXT DEFAULT '[]'"],
  ['breakout_frequency', 'TEXT DEFAULT NULL'],
  ['routine_size', 'TEXT DEFAULT NULL'],
  ['avoid_ingredients', "TEXT DEFAULT '[]'"],
  ['sunscreen_usage', 'TEXT DEFAULT NULL'],
  ['onboarding_completed', 'BOOLEAN DEFAULT 0'],
  ['theme_id', "TEXT DEFAULT 'glow'"]
];

for (const [name, def] of columns) {
  try {
    db.exec(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
    console.log(`Migration: Added column ${name} to users table.`);
  } catch (e) {
    // Column likely already exists, ignore
  }
}

app.use(express.json());

// --- API Routes ---

// 1. Usage Tracking (Anonymous Limits)
app.post("/api/usage/check", (req, res) => {
  const { clientId, userId } = req.body;

  // Authenticated users have no limit
  if (userId) {
    return res.json({ allowed: true });
  }

  if (!clientId) {
    return res.status(400).json({ error: "MISSING_CLIENT_ID" });
  }

  // Cleanup old logs (older than 24 hours)
  db.prepare("DELETE FROM usage_logs WHERE created_at < datetime('now', '-24 hours')").run();

  // Count usage in last 24 hours
  const row = db.prepare("SELECT COUNT(*) as count FROM usage_logs WHERE anon_client_id = ? AND created_at > datetime('now', '-24 hours')").get(clientId) as { count: number };

  if (row.count >= 3) {
    return res.json({ allowed: false, error: "ANALYZE_LIMIT_REACHED", count: row.count });
  }

  res.json({ allowed: true, count: row.count });
});

app.post("/api/usage/log", (req, res) => {
  const { clientId, userId } = req.body;

  // Only log for anonymous users
  if (!userId && clientId) {
    db.prepare("INSERT INTO usage_logs (anon_client_id) VALUES (?)").run(clientId);
  }

  res.json({ success: true });
});

// 2. Auth Placeholder (Paid Mode Stub)
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
    token: "mock-jwt-token",
    theme_primary_color: user.theme_primary_color || null,
    theme_secondary_color: user.theme_secondary_color || null,
    routine: JSON.parse(user.routine || '[]'),
    skinType: user.skin_type || null,
    sensitivity: user.sensitivity || null,
    concerns: JSON.parse(user.concerns || '[]'),
    breakoutFrequency: user.breakout_frequency || null,
    routineSize: user.routine_size || null,
    avoidIngredients: JSON.parse(user.avoid_ingredients || '[]'),
    sunscreenUsage: user.sunscreen_usage || null,
    onboardingCompleted: !!user.onboarding_completed,
    theme_id: user.theme_id || 'glow'
  });
});

app.post("/api/user/profile", (req, res) => {
  const { 
    userId, 
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

  db.prepare(`
    UPDATE users SET 
      skin_type = ?, 
      sensitivity = ?, 
      concerns = ?, 
      breakout_frequency = ?, 
      routine_size = ?, 
      avoid_ingredients = ?, 
      sunscreen_usage = ?,
      onboarding_completed = ?
    WHERE id = ?
  `).run(
    skinType, 
    sensitivity, 
    JSON.stringify(concerns || []), 
    breakoutFrequency, 
    routineSize, 
    JSON.stringify(avoidIngredients || []), 
    sunscreenUsage,
    onboardingCompleted ? 1 : 0,
    userId
  );

  res.json({ success: true });
});

app.post("/api/user/theme", (req, res) => {
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
    userId
  );

  res.json({ success: true });
});

app.post("/api/user/routine", (req, res) => {
  const { userId, routine } = req.body;
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
  
  db.prepare("UPDATE users SET routine = ? WHERE id = ?").run(JSON.stringify(routine), userId);
  res.json({ success: true });
});

app.get("/api/user/routine/:userId", (req, res) => {
  const { userId } = req.params;
  const user = db.prepare("SELECT routine FROM users WHERE id = ?").get(userId) as any;
  if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });
  
  res.json({ routine: JSON.parse(user.routine || '[]') });
});

app.post("/api/user/analysis", (req, res) => {
  const { userId, analysis } = req.body;
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
  
  db.prepare("INSERT INTO saved_analyses (user_id, data) VALUES (?, ?)").run(userId, JSON.stringify(analysis));
  res.json({ success: true });
});

app.get("/api/user/analyses/:userId", (req, res) => {
  const { userId } = req.params;
  const rows = db.prepare("SELECT id, data, created_at FROM saved_analyses WHERE user_id = ? ORDER BY created_at DESC").all(userId) as any[];
  
  res.json({ analyses: rows.map(r => ({ id: r.id, ...JSON.parse(r.data), createdAt: r.created_at })) });
});

app.delete("/api/user/analysis/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM saved_analyses WHERE id = ?").run(id);
  res.json({ success: true });
});

app.post("/api/user/saved-routine", (req, res) => {
  const { userId, routine } = req.body;
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
  
  db.prepare("INSERT INTO saved_routines (user_id, data) VALUES (?, ?)").run(userId, JSON.stringify(routine));
  res.json({ success: true });
});

app.get("/api/user/saved-routines/:userId", (req, res) => {
  const { userId } = req.params;
  const rows = db.prepare("SELECT id, data, created_at FROM saved_routines WHERE user_id = ? ORDER BY created_at DESC").all(userId) as any[];
  
  res.json({ routines: rows.map(r => ({ id: r.id, ...JSON.parse(r.data), createdAt: r.created_at })) });
});

app.delete("/api/user/saved-routine/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM saved_routines WHERE id = ?").run(id);
  res.json({ success: true });
});

app.post("/api/user/comparison", (req, res) => {
  const { userId, comparison } = req.body;
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });
  
  db.prepare("INSERT INTO saved_comparisons (user_id, data) VALUES (?, ?)").run(userId, JSON.stringify(comparison));
  res.json({ success: true });
});

app.get("/api/user/comparisons/:userId", (req, res) => {
  const { userId } = req.params;
  const rows = db.prepare("SELECT id, data, created_at FROM saved_comparisons WHERE user_id = ? ORDER BY created_at DESC").all(userId) as any[];
  
  res.json({ comparisons: rows.map(r => ({ id: r.id, ...JSON.parse(r.data), createdAt: r.created_at })) });
});

app.delete("/api/user/comparison/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM saved_comparisons WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/api/dashboard/data/:userId", (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });

  const routines = db.prepare("SELECT id, data, created_at FROM saved_routines WHERE user_id = ? ORDER BY created_at DESC LIMIT 5").all(userId) as any[];
  const analyses = db.prepare("SELECT id, data, created_at FROM saved_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 5").all(userId) as any[];
  const lastCheckIn = db.prepare("SELECT * FROM skin_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId);
  const routine = db.prepare("SELECT routine FROM users WHERE id = ?").get(userId) as any;
  const comparisons = db.prepare("SELECT id, data, created_at FROM saved_comparisons WHERE user_id = ? ORDER BY created_at DESC LIMIT 5").all(userId) as any[];

  // Calculate Streak
  const logs = db.prepare(`
    SELECT DISTINCT date(created_at) as log_date 
    FROM routine_logs 
    WHERE user_id = ? 
    ORDER BY log_date DESC
  `).all(userId) as { log_date: string }[];

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
  `).get(userId) as { count: number };
  const weeklyCompletionRate = Math.min(100, Math.round((weeklyLogs.count / 14) * 100));

  // Last Routine Logged
  const lastRoutine = db.prepare("SELECT * FROM routine_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId);

  // Skin Trends (Last 30 days)
  const skinTrends = db.prepare("SELECT * FROM skin_logs WHERE user_id = ? AND created_at > datetime('now', '-30 days') ORDER BY created_at ASC").all(userId) as any[];

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
  `).get(userId) as { count: number };
  const prevWeeklyCompletionRate = Math.min(100, Math.round((prevWeeklyLogs.count / 14) * 100));
  
  const prevSkinLogs = db.prepare(`
    SELECT * FROM skin_logs 
    WHERE user_id = ? AND created_at BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days')
    ORDER BY created_at ASC
  `).all(userId);
  
  const prevScore = calculateHealthScore(prevSkinLogs, prevWeeklyCompletionRate);
  const healthScoreTrend = healthScore - prevScore;

  res.json({
    savedRoutines: routines.map(r => ({ id: r.id, ...JSON.parse(r.data), createdAt: r.created_at })),
    savedAnalyses: analyses.map(r => ({ id: r.id, ...JSON.parse(r.data), createdAt: r.created_at })),
    savedComparisons: comparisons.map(r => ({ id: r.id, ...JSON.parse(r.data), createdAt: r.created_at })),
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

app.post("/api/routine/log", (req, res) => {
  const { userId, type } = req.body;
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });

  // Prevent double logging same type on same day
  const existing = db.prepare(`
    SELECT id FROM routine_logs 
    WHERE user_id = ? AND type = ? AND date(created_at) = date('now')
  `).get(userId, type);

  if (existing) {
    return res.status(400).json({ error: "ALREADY_LOGGED_TODAY" });
  }

  db.prepare("INSERT INTO routine_logs (user_id, type) VALUES (?, ?)").run(userId, type);
  res.json({ success: true });
});

app.post("/api/skin/log", (req, res) => {
  const { userId, acne, oiliness, dryness, irritation } = req.body;
  if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });

  // Only one skin log per day
  const existing = db.prepare(`
    SELECT id FROM skin_logs 
    WHERE user_id = ? AND date(created_at) = date('now')
  `).get(userId);

  if (existing) {
    db.prepare(`
      UPDATE skin_logs 
      SET acne = ?, oiliness = ?, dryness = ?, irritation = ? 
      WHERE id = ?
    `).run(acne, oiliness, dryness, irritation, existing.id);
  } else {
    db.prepare(`
      INSERT INTO skin_logs (user_id, acne, oiliness, dryness, irritation) 
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, acne, oiliness, dryness, irritation);
  }
  
  res.json({ success: true });
});

app.post("/api/dashboard/check-in", (req, res) => {
  res.json({ success: true });
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
