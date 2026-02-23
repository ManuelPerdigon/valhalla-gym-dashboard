import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import db from "./db.js";
import { authRequired, adminOnly, signToken } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 5050;

/* ======================
   BODY
====================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ======================
   CORS
====================== */
const allowed = new Set(
  [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://valhalla-gym-dashboard.vercel.app",
  ].filter(Boolean)
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowed.has(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ======================
   HELPERS
====================== */
function parseJSONSafe(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function rowToClient(row) {
  return {
    ...row,
    nutrition: parseJSONSafe(row.nutrition, { adherence: [] }),
    progress: parseJSONSafe(row.progress, []),
  };
}

/* ======================
   ROOT
====================== */
app.get("/", (_req, res) => {
  res.json({ ok: true });
});

/* ======================
   AUTH
====================== */
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "Faltan credenciales" });
  }

  const user = db
    .prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?")
    .get(username);

  if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

  const token = signToken({ id: user.id, role: user.role });

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

/* ======================
   ME
====================== */
app.get("/me", authRequired, (req, res) => {
  const u = db
    .prepare("SELECT id, username, role FROM users WHERE id = ?")
    .get(req.user.id);

  if (!u) return res.status(401).json({ error: "Usuario no válido" });
  res.json({ user: u });
});

/* ======================
   USERS GET
====================== */
app.get("/users", authRequired, adminOnly, (_req, res) => {
  const users = db
    .prepare("SELECT id, username, role FROM users ORDER BY username ASC")
    .all();
  res.json(users);
});

/* ======================
   USERS CREATE
====================== */
app.post("/users", authRequired, adminOnly, (req, res) => {
  try {
    const { username, password, role } = req.body || {};

    if (!username || !password)
      return res.status(400).json({ error: "username y password requeridos" });

    const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (exists) return res.status(409).json({ error: "Ese username ya existe" });

    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync(password, 10);

    db.prepare("INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)")
      .run(id, username, hash, role || "client");

    res.json({ ok: true, user: { id, username, role: role || "client" } });
  } catch (e) {
    res.status(500).json({ error: "Error creando usuario" });
  }
});

/* ======================
   CLIENTS GET
====================== */
app.get("/clients", authRequired, (_req, res) => {
  const rows = db.prepare("SELECT * FROM clients ORDER BY id DESC").all();
  res.json(rows.map(rowToClient));
});

/* ======================
   CLIENTS POST
====================== */
app.post("/clients", authRequired, adminOnly, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "Nombre requerido" });

  const info = db.prepare(`
    INSERT INTO clients (name, active, routine, goalWeight, assignedUserId, nutrition, progress)
    VALUES (?, 1, '', '', NULL, ?, ?)
  `).run(
    name,
    JSON.stringify({ adherence: [] }),
    JSON.stringify([])
  );

  const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(info.lastInsertRowid);
  res.json(rowToClient(row));
});

/* ======================
   CLIENTS PATCH (FIX FINAL)
====================== */
app.patch("/clients/:id", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  if (!current) return res.status(404).json({ error: "No encontrado" });

  const patch = req.body || {};
  const next = { ...current, ...patch };

  // 🔥 FIX DEFINITIVO
  if ("assignedUserId" in patch && req.user.role === "admin") {

    let newUserId = patch.assignedUserId;

    if (!newUserId) {
      next.assignedUserId = null;
    } else {
      newUserId = String(newUserId).trim();

      const exists = db.prepare("SELECT id FROM users WHERE id = ?").get(newUserId);
      if (!exists) {
        return res.status(400).json({ error: "Ese usuario no existe." });
      }

      const taken = db
        .prepare("SELECT id FROM clients WHERE assignedUserId = ? AND id <> ?")
        .get(newUserId, id);

      if (taken) {
        return res.status(409).json({ error: "Ese usuario ya está asignado" });
      }

      next.assignedUserId = newUserId;
    }
  }

  if (typeof next.nutrition === "object") next.nutrition = JSON.stringify(next.nutrition);
  if (Array.isArray(next.progress)) next.progress = JSON.stringify(next.progress);

  db.prepare(`
    UPDATE clients SET
      name = ?,
      active = ?,
      routine = ?,
      goalWeight = ?,
      assignedUserId = ?,
      nutrition = ?,
      progress = ?
    WHERE id = ?
  `).run(
    next.name,
    next.active ? 1 : 0,
    next.routine || "",
    next.goalWeight || "",
    next.assignedUserId ?? null,
    next.nutrition || JSON.stringify({ adherence: [] }),
    next.progress || JSON.stringify([]),
    id
  );

  const updated = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  res.json(rowToClient(updated));
});

/* ======================
   DELETE
====================== */
app.delete("/clients/:id", authRequired, adminOnly, (req, res) => {
  db.prepare("DELETE FROM clients WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

/* ======================
   START
====================== */
app.listen(PORT, "0.0.0.0", () => {
  console.log("API corriendo");
});