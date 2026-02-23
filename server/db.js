import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_FILE = process.env.DB_FILE || path.join(process.cwd(), "valhalla.db");

// crea carpeta si hace falta (por si DB_FILE apunta a /var/data/valhalla.db)
const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_FILE);

// (Opcional) mejoras de sqlite
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export default db;