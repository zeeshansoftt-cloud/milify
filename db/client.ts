import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

const raw = process.env.DATABASE_URL ?? "./milify.db";
const url = raw.startsWith("file:") || raw.startsWith("libsql:") || raw.startsWith("http")
  ? raw
  : `file:${path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)}`;

if (url.startsWith("file:")) {
  const abs = url.replace(/^file:/, "");
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const client = createClient({ url });

async function execWithRetry(stmt: string, tries = 8): Promise<void> {
  for (let i = 0; i < tries; i++) {
    try {
      await client.execute(stmt);
      return;
    } catch (err: unknown) {
      const e = err as { code?: string; rawCode?: number } | undefined;
      const busy =
        e?.rawCode === 5 ||
        (typeof e?.code === "string" && e.code.includes("BUSY"));
      if (busy && i < tries - 1) {
        await new Promise((r) => setTimeout(r, 50 * (i + 1) + Math.random() * 50));
        continue;
      }
      throw err;
    }
  }
}

await initSchema();

export const db = drizzle(client, { schema });

async function initSchema() {
  const stmts = [
    `PRAGMA journal_mode = WAL`,
    `PRAGMA busy_timeout = 5000`,
    `CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      locale TEXT NOT NULL DEFAULT 'sv',
      note TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id, sort_index)`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
    `CREATE TABLE IF NOT EXISTS checklists (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      frequency TEXT NOT NULL DEFAULT 'daily',
      token TEXT NOT NULL UNIQUE,
      is_archived INTEGER NOT NULL DEFAULT 0,
      sort_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_checklists_tenant ON checklists(tenant_id, is_archived, sort_index)`,
    `CREATE INDEX IF NOT EXISTS idx_checklists_dept ON checklists(department_id)`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      sort_index INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_checklist ON tasks(checklist_id, is_archived, sort_index)`,
    `CREATE TABLE IF NOT EXISTS task_completions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT NOT NULL DEFAULT '',
      period_key TEXT NOT NULL,
      note TEXT DEFAULT '',
      completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_completions_task_period ON task_completions(task_id, period_key)`,
    `CREATE INDEX IF NOT EXISTS idx_completions_task ON task_completions(task_id, completed_at)`,
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      author_name TEXT NOT NULL DEFAULT '',
      department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      source_lang TEXT NOT NULL DEFAULT 'sv',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_dept ON messages(department_id, created_at)`,
    `CREATE TABLE IF NOT EXISTS message_translations (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      lang TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_message_translations ON message_translations(message_id, lang)`,
    `CREATE TABLE IF NOT EXISTS parent_links (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
      token TEXT NOT NULL UNIQUE,
      language TEXT NOT NULL DEFAULT 'sv',
      label TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_parent_links_tenant ON parent_links(tenant_id)`,
  ];
  for (const s of stmts) {
    await execWithRetry(s);
  }
}
