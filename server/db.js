import Database from "better-sqlite3";

const DB_PATH = process.env.DB_PATH || "valhalla.db";
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','client'))
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  routine TEXT DEFAULT '',
  goalWeight TEXT DEFAULT '',
  assignedUserId TEXT DEFAULT '',
  nutrition TEXT NOT NULL DEFAULT '{}',
  progress TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (assignedUserId) REFERENCES users(id)
);
`);

export default db;