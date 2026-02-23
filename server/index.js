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
   CAPTURAR RAW BODY
====================== */
app.use(
  express.json({
    limit: "1mb",
    type: ["application/json", "*/json"],
    verify: (req, _res, buf) => {
      req.rawBody = buf?.toString("utf8") || "";
    },
  })
);

app.use(express.urlencoded({ extended: true }));

/* ======================
   CORS
====================== */
const allowed = new Set(
  [
    "http://localhost:5173",
    "http://localhost:5174",
    ...(process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
      : []),
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

app.options("*", cors());

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
  res.json({ ok: true, service: "Valhalla Gym API" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/* ======================
   BOOTSTRAP USERS
====================== */
function ensureUsers() {
  const exists = db.prepare("SELECT COUNT(*) as n FROM users").get();
  if (exists?.n > 0) return;

  const isProd = process.env.NODE_ENV === "production";

  const insert = db.prepare(
    "INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)"
  );

  if (isProd) {
    const adminUser = process.env.ADMIN_USER || "admin";
    const adminPass = process.env.ADMIN_PASS || "";

    if (!adminPass) return;

    const adminHash = bcrypt.hashSync(adminPass, 10);
    insert.run("admin", adminUser, adminHash, "admin");
    return;
  }

  const adminHash = bcrypt.hashSync("admin123", 10);
  const c1Hash = bcrypt.hashSync("1234", 10);
  const c2Hash = bcrypt.hashSync("1234", 10);

  insert.run("admin", "admin", adminHash, "admin");
  insert.run("cliente1", "cliente1", c1Hash, "client");
  insert.run("cliente2", "cliente2", c2Hash, "client");
}
ensureUsers();

/* ======================
   LOGIN
====================== */
app.post("/auth/login", (req, res) => {
  try {
    let { username, password } = req.body || {};

    if ((!username || !password) && req.rawBody) {
      const maybe = parseJSONSafe(req.rawBody, null);
      if (maybe) {
        username = maybe.username;
        password = maybe.password;
      }
    }

    if (!username || !password)
      return res.status(400).json({ error: "Faltan credenciales" });

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
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});

/* ======================
   USERS
====================== */
app.get("/users", authRequired, adminOnly, (_req, res) => {
  const users = db
    .prepare("SELECT id, username, role FROM users ORDER BY username ASC")
    .all();
  res.json(users);
});

app.post("/users", authRequired, adminOnly, (req, res) => {
  try {
    const { username, password, role } = req.body || {};

    if (!username || !password)
      return res.status(400).json({ error: "username y password requeridos" });

    const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (exists) return res.status(409).json({ error: "Ese username ya existe" });

    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync(password, 10);

    db.prepare(
      "INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)"
    ).run(id, username, hash, role || "client");

    res.json({ ok: true, user: { id, username, role: role || "client" } });
  } catch {
    res.status(500).json({ error: "Error creando usuario" });
  }
});

/* ======================
   CLIENTS GET  🔥 FIX
====================== */
app.get("/clients", authRequired, (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM clients ORDER BY id DESC").all();
    const parsed = rows.map(rowToClient); // 🔥 ESTO ARREGLA TODO
    res.json(parsed);
  } catch {
    res.status(500).json({ error: "Error obteniendo clientes" });
  }
});

/* ======================
   CLIENTS POST
====================== */
app.post("/clients", authRequired, adminOnly, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "Nombre requerido" });

  const emptyNutrition = JSON.stringify({ adherence: [] });
  const emptyProgress = JSON.stringify([]);

  const info = db.prepare(`
    INSERT INTO clients (name, active, routine, goalWeight, assignedUserId, nutrition, progress)
    VALUES (?, 1, '', '', NULL, ?, ?)
  `).run(name.trim(), emptyNutrition, emptyProgress);

  const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(info.lastInsertRowid);
  res.json(rowToClient(row));
});

/* ======================
   CLIENT PATCH
====================== */
app.patch("/clients/:id", authRequired, (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
    if (!current) return res.status(404).json({ error: "No encontrado" });

    const patch = req.body || {};
    const next = { ...current, ...patch };

    if (typeof next.nutrition === "object")
      next.nutrition = JSON.stringify(next.nutrition);

    if (Array.isArray(next.progress) || typeof next.progress === "object")
      next.progress = JSON.stringify(next.progress);

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
  } catch {
    res.status(500).json({ error: "Error actualizando cliente" });
  }
});

/* ======================
   START
====================== */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API corriendo en ${PORT}`);
});