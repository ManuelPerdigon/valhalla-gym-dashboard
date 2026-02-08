import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import db from "./db.js";
import { authRequired, adminOnly, signToken } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 5050;

/* ======================
   CORS + JSON (PROD)
====================== */
const allowed = [
  "http://localhost:5173",
  "http://localhost:5174",
  ...(process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : []),
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error("CORS bloqueado: " + origin));
    },
    credentials: true,
  })
);

app.use(express.json());

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
  res.json({ ok: true, service: "Valhalla Gym API", health: "/health" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/* ======================
   BOOTSTRAP USERS
====================== */
function ensureDefaultUsers() {
  // ✅ En producción NO crear usuarios demo
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) return;

  const exists = db.prepare("SELECT COUNT(*) as n FROM users").get();
  if (exists?.n > 0) return;

  const insert = db.prepare(
    "INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)"
  );

  const adminHash = bcrypt.hashSync("admin123", 10);
  const c1Hash = bcrypt.hashSync("1234", 10);
  const c2Hash = bcrypt.hashSync("1234", 10);

  insert.run("admin", "admin", adminHash, "admin");
  insert.run("cliente1", "cliente1", c1Hash, "client");
  insert.run("cliente2", "cliente2", c2Hash, "client");

  console.log("✅ Usuarios demo creados (solo local): admin/admin123, cliente1/1234, cliente2/1234");
}
ensureDefaultUsers();

/* ======================
   AUTH
====================== */
app.post("/auth/login", (req, res) => {
  try {
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
   USERS (solo admin)
====================== */
app.get("/users", authRequired, adminOnly, (_req, res) => {
  const users = db
    .prepare("SELECT id, username, role FROM users ORDER BY username ASC")
    .all();
  res.json(users);
});

/* ======================
   CLIENTS GET
====================== */
app.get("/clients", authRequired, (req, res) => {
  if (req.user.role === "admin") {
    const rows = db.prepare("SELECT * FROM clients ORDER BY id DESC").all();
    return res.json(rows.map(rowToClient));
  }

  const rows = db
    .prepare("SELECT * FROM clients WHERE assignedUserId = ? ORDER BY id DESC")
    .all(req.user.id);

  return res.json(rows.map(rowToClient));
});

/* ======================
   CLIENTS POST (solo admin)
====================== */
app.post("/clients", authRequired, adminOnly, (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: "Nombre requerido" });

    const stmt = db.prepare(`
      INSERT INTO clients (name, active, routine, goalWeight, assignedUserId, nutrition, progress)
      VALUES (?, 1, '', '', NULL, ?, ?)
    `);

    const emptyNutrition = JSON.stringify({ adherence: [] });
    const emptyProgress = JSON.stringify([]);

    const info = stmt.run(name.trim(), emptyNutrition, emptyProgress);

    const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(info.lastInsertRowid);
    res.json(rowToClient(row));
  } catch (e) {
    console.error("POST /clients ERROR:", e);
    res.status(500).json({ error: "Error creando cliente" });
  }
});

/* ======================
   CLIENTS PATCH
====================== */
app.patch("/clients/:id", authRequired, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const current = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
    if (!current) return res.status(404).json({ error: "No encontrado" });

    const patch = req.body || {};

    // Cliente solo puede tocar progress/nutrition
    if (req.user.role !== "admin") {
      const allowedKeys = ["progress", "nutrition"];
      for (const key of Object.keys(patch)) {
        if (!allowedKeys.includes(key)) return res.status(403).json({ error: "No permitido" });
      }
    }

    const next = { ...current, ...patch };

    if (typeof next.nutrition === "object") next.nutrition = JSON.stringify(next.nutrition);
    if (Array.isArray(next.progress) || typeof next.progress === "object") {
      next.progress = JSON.stringify(next.progress);
    }

    // ✅ Asignación robusta (solo admin)
    if (req.user.role === "admin" && "assignedUserId" in patch) {
      let newUserId = patch.assignedUserId;

      if (newUserId === "") newUserId = null;
      if (typeof newUserId === "string") newUserId = newUserId.trim();

      if (newUserId) {
        const u = db.prepare("SELECT id FROM users WHERE id = ?").get(newUserId);
        if (!u) return res.status(400).json({ error: "Ese usuario no existe." });

        // 1 usuario = 1 cliente
        const taken = db
          .prepare("SELECT id, name FROM clients WHERE assignedUserId = ? AND id <> ?")
          .get(newUserId, id);

        if (taken) {
          return res
            .status(409)
            .json({ error: `Ese usuario ya está asignado al cliente: ${taken.name}` });
        }
      }

      next.assignedUserId = newUserId || null;
    }

    const update = db.prepare(`
      UPDATE clients SET
        name = ?,
        active = ?,
        routine = ?,
        goalWeight = ?,
        assignedUserId = ?,
        nutrition = ?,
        progress = ?
      WHERE id = ?
    `);

    update.run(
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

/* ======================
   CLIENTS DELETE (solo admin) ✅ BORRADO REAL
====================== */
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