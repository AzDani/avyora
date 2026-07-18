import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

function init() {
  const dir = path.join(process.cwd(), "db");
  fs.mkdirSync(path.join(dir, "uploads"), { recursive: true });
  const db = new Database(path.join(dir, "renopilot.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      type_bien TEXT NOT NULL,
      surface REAL NOT NULL,
      code_postal TEXT NOT NULL,
      reponses_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      params_json TEXT NOT NULL,
      resultats_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      cle TEXT PRIMARY KEY,
      valeur TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS custom_questions (
      id TEXT PRIMARY KEY,
      section INTEGER NOT NULL DEFAULT 2,
      label TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'unique',
      corps TEXT NOT NULL DEFAULT 'divers',
      ordre INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS custom_options (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      label TEXT NOT NULL,
      prix REAL NOT NULL DEFAULT 0,
      mode TEXT NOT NULL DEFAULT 'forfait',
      ordre INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS artisans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      corps_etat TEXT NOT NULL DEFAULT 'divers',
      telephone TEXT,
      email TEXT,
      ville TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      nom TEXT NOT NULL,
      type_piece TEXT NOT NULL DEFAULT 'autre',
      longueur REAL NOT NULL,
      largeur REAL NOT NULL,
      hauteur REAL NOT NULL DEFAULT 2.5,
      portes INTEGER NOT NULL DEFAULT 1,
      fenetres INTEGER NOT NULL DEFAULT 1,
      carrelage_sol INTEGER NOT NULL DEFAULT 0,
      faience INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'photo',
      fichier TEXT NOT NULL,
      nom TEXT NOT NULL,
      note_ia TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      corps_etat TEXT NOT NULL,
      libelle TEXT NOT NULL,
      montant REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      corps_etat TEXT NOT NULL,
      titre TEXT NOT NULL,
      statut TEXT NOT NULL DEFAULT 'a_faire',
      ordre INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      nom TEXT NOT NULL,
      fichier TEXT,
      texte TEXT NOT NULL,
      analyse_json TEXT NOT NULL,
      note INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  // Migration : colonne d'archivage sur les bases existantes
  try {
    db.exec("ALTER TABLE projects ADD COLUMN archived INTEGER NOT NULL DEFAULT 0");
  } catch {
    // colonne déjà présente
  }
  return db;
}

const g = globalThis as unknown as { __renopilotDb?: Database.Database };
export const db = g.__renopilotDb ?? (g.__renopilotDb = init());

export const uploadsDir = path.join(process.cwd(), "db", "uploads");
