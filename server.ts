import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

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
    routine TEXT DEFAULT '[]'
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
  
  -- Migration: Reset old green theme colors to NULL to respect new default theme
  UPDATE users SET theme_primary_color = NULL, theme_secondary_color = NULL WHERE theme_primary_color = '#10b981';
`);

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
    routine: JSON.parse(user.routine || '[]')
  });
});

app.post("/api/user/theme", (req, res) => {
  const { userId, primaryColor, secondaryColor } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }

  // Validation
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexRegex.test(primaryColor) || !hexRegex.test(secondaryColor)) {
    return res.status(400).json({ error: "INVALID_HEX" });
  }

  if (primaryColor === secondaryColor) {
    return res.status(400).json({ error: "COLORS_MUST_BE_DIFFERENT" });
  }

  db.prepare("UPDATE users SET theme_primary_color = ?, theme_secondary_color = ? WHERE id = ?").run(primaryColor, secondaryColor, userId);

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
  const lastCheckIn = db.prepare("SELECT * FROM check_ins WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(userId);
  const routine = db.prepare("SELECT routine FROM users WHERE id = ?").get(userId) as any;
  const comparisons = db.prepare("SELECT id, data, created_at FROM saved_comparisons WHERE user_id = ? ORDER BY created_at DESC LIMIT 5").all(userId) as any[];

  res.json({
    savedRoutines: routines.map(r => ({ id: r.id, ...JSON.parse(r.data), createdAt: r.created_at })),
    savedAnalyses: analyses.map(r => ({ id: r.id, ...JSON.parse(r.data), createdAt: r.created_at })),
    savedComparisons: comparisons.map(r => ({ id: r.id, ...JSON.parse(r.data), createdAt: r.created_at })),
    lastCheckIn,
    routineScore: 85, // Mock score for now
    scansCount: analyses.length,
    streak: 3 // Mock streak for now
  });
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
