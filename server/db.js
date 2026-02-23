import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Carpeta real donde vive este archivo (server/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Default: MISMA BD local de siempre en server/valhalla.db
// ✅ En Render: si defines DB_FILE=/var/data/valhalla.db lo usa
const DB_FILE = (process.env.DB_FILE || path.join(__dirname, "valhalla.db")).trim();

// Crear carpeta si no existe
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new Database(DB_FILE);

// PRAGMAS (ok)
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ✅ MIGRACIÓN: crea tablas si no existen
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','client'))
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  routine TEXT NOT NULL DEFAULT '',
  goalWeight TEXT NOT NULL DEFAULT '',
  assignedUserId TEXT DEFAULT NULL,
  nutrition TEXT NOT NULL DEFAULT '{"adherence":[]}',
  progress TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_clients_assignedUserId ON clients(assignedUserId);
`);

export default db;