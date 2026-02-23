// server/index.js
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
   JSON + RAW BODY (por si Render manda raro)
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
   ROOT + HEALTH
====================== */
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "Valhalla Gym API",
    health: "/health",
    build: "index-v4-ensure-admin",
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/* ======================
   BOOTSTRAP: ASEGURAR ADMIN SIEMPRE
====================== */
function ensureAdmin() {
  const adminUser = (process.env.ADMIN_USER || "admin").trim() || "admin";
  const adminPass = (process.env.ADMIN_PASS || "").trim();

  if (!adminPass) {
    console.log("⚠️ Falta ADMIN_PASS, no puedo asegurar admin.");
    return;
  }

  const existing = db
    .prepare("SELECT id, username FROM users WHERE id = 'admin' OR username = ?")
    .get(adminUser);

  const hash = bcrypt.hashSync(adminPass, 10);

  if (!existing) {
    db.prepare("INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)")
      .run("admin", adminUser, hash, "admin");
    console.log(`✅ Admin creado/asegurado: ${adminUser} (id=admin)`);
    return;
  }

  db.prepare("UPDATE users SET password_hash=?, role='admin' WHERE id = ?")
    .run(hash, existing.id);
  console.log(`✅ Admin actualizado/asegurado: ${adminUser} (id=${existing.id})`);
}

ensureAdmin();

/* ======================
   AUTH
====================== */
app.post("/auth/login", (req, res) => {
  try {
    let { username, password } = req.body || {};

    if ((!username || !password) && req.rawBody) {
      const maybe = parseJSONSafe(req.rawBody, null);
      if (maybe && typeof maybe === "object") {
        username = maybe.username;
        password = maybe.password;
      }
    }

    if (!username || !password) {
      return res.status(400).json({
        error: "Faltan credenciales",
        debug: {
          contentType: req.headers["content-type"] || null,
          rawLen: (req.rawBody || "").length,
          bodyKeys: req.body ? Object.keys(req.body) : null,
        },
      });
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
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    res.status(500).json({ error: "Error interno en login" });
  }
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
    const u = (username || "").trim();
    const p = (password || "").trim();
    const r = (role || "client").trim();

    if (!u || !p) return res.status(400).json({ error: "username y password requeridos" });
    if (!["admin", "client"].includes(r)) return res.status(400).json({ error: "role inválido" });

    const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(u);
    if (exists) return res.status(409).json({ error: "Ese username ya existe" });

    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync(p, 10);

    db.prepare("INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)")
      .run(id, u, hash, r);

    res.json({ ok: true, user: { id, username: u, role: r } });
  } catch (e) {
    console.error("POST /users ERROR:", e);
    res.status(500).json({ error: "Error creando usuario" });
  }
});

/* ======================
   CLIENTS
====================== */
app.get("/clients", authRequired, (_req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM clients ORDER BY id DESC").all();
    res.json(rows.map(rowToClient));
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo clientes" });
  }
});

app.post("/clients", authRequired, adminOnly, (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: "Nombre requerido" });

    const emptyNutrition = JSON.stringify({ adherence: [] });
    const emptyProgress = JSON.stringify([]);

    const info = db.prepare(`
      INSERT INTO clients (name, active, routine, goalWeight, assignedUserId, nutrition, progress)
      VALUES (?, 1, '', '', NULL, ?, ?)
    `).run(name.trim(), emptyNutrition, emptyProgress);

    const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(info.lastInsertRowid);
    res.json(rowToClient(row));
  } catch (e) {
    console.error("POST /clients ERROR:", e);
    res.status(500).json({ error: "Error creando cliente" });
  }
});

app.patch("/clients/:id", authRequired, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const current = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
    if (!current) return res.status(404).json({ error: "No encontrado" });

    const patch = req.body || {};
    const next = { ...current, ...patch };

    if (typeof next.nutrition === "object") next.nutrition = JSON.stringify(next.nutrition);
    if (Array.isArray(next.progress) || typeof next.progress === "object") {
      next.progress = JSON.stringify(next.progress);
    }

    if (req.user.role === "admin" && "assignedUserId" in patch) {
      let newUserId = patch.assignedUserId;
      if (newUserId === "") newUserId = null;
      if (typeof newUserId === "string") newUserId = newUserId.trim();

      if (newUserId) {
        const u = db.prepare("SELECT id FROM users WHERE id = ?").get(newUserId);
        if (!u) return res.status(400).json({ error: "Ese usuario no existe." });

        const taken = db
          .prepare("SELECT id, name FROM clients WHERE assignedUserId = ? AND id <> ?")
          .get(newUserId, id);

        if (taken) {
          return res.status(409).json({ error: `Ese usuario ya está asignado al cliente: ${taken.name}` });
        }
      }
      next.assignedUserId = newUserId || null;
    }

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
  } catch (e) {
    console.error("PATCH /clients ERROR:", e);
    res.status(500).json({ error: "Error actualizando cliente" });
  }
});

app.delete("/clients/:id", authRequired, adminOnly, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const current = db.prepare("SELECT id FROM clients WHERE id = ?").get(id);
    if (!current) return res.status(404).json({ error: "No encontrado" });

    db.prepare("DELETE FROM clients WHERE id = ?").run(id);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /clients ERROR:", e);
    res.status(500).json({ error: "Error eliminando cliente" });
  }
});

/* ======================
   START
====================== */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ API corriendo en puerto ${PORT}`);
});