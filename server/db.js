import Database from "better-sqlite3";

const db = new Database("valhalla.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ===== Helpers =====
function tableExists(name) {
  const r = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(name);
  return !!r;
}

function columnInfo(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all();
}

// ===== Base schema (NEW) =====
function createSchemaV2() {
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
      assignedUserId TEXT NULL,
      nutrition TEXT NOT NULL DEFAULT '{}',
      progress TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (assignedUserId) REFERENCES users(id)
    );
  `);
}

// ===== Migration: clients assignedUserId '' -> NULL + ensure FK ON =====
function migrateClientsToV2IfNeeded() {
  if (!tableExists("clients")) return; // no clients table yet

  const cols = columnInfo("clients");
  const assigned = cols.find((c) => c.name === "assignedUserId");

  // If no assignedUserId column, or we don't know type, we still migrate safely.
  // We'll migrate if we detect default '' or if table was created in older format.
  const needsMigration = !assigned || String(assigned.dflt_value || "").includes("''");

  if (!needsMigration) return;

  db.exec("BEGIN");

  try {
    // Rename old
    db.exec(`ALTER TABLE clients RENAME TO clients_old;`);

    // Create new v2 clients
    db.exec(`
      CREATE TABLE clients (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        routine TEXT DEFAULT '',
        goalWeight TEXT DEFAULT '',
        assignedUserId TEXT NULL,
        nutrition TEXT NOT NULL DEFAULT '{}',
        progress TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY (assignedUserId) REFERENCES users(id)
      );
    `);

    // Copy data converting '' to NULL
    db.exec(`
      INSERT INTO clients (id, name, active, routine, goalWeight, assignedUserId, nutrition, progress)
      SELECT
        id,
        name,
        active,
        COALESCE(routine,''),
        COALESCE(goalWeight,''),
        NULLIF(assignedUserId,''),
        COALESCE(nutrition,'{}'),
        COALESCE(progress,'[]')
      FROM clients_old;
    `);

    db.exec(`DROP TABLE clients_old;`);

    db.exec("COMMIT");
    console.log("✅ Migración clients → V2 completa (assignedUserId NULL).");
  } catch (e) {
    db.exec("ROLLBACK");
    console.error("❌ Error en migración clients:", e);
    throw e;
  }
}

// ===== Init =====
createSchemaV2();
migrateClientsToV2IfNeeded();

export default db;