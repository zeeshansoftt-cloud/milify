/* eslint-disable no-console */
import { config as loadEnv } from "dotenv";
import path from "node:path";
import fs from "node:fs";

const envLocal = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) loadEnv({ path: envLocal });
loadEnv();

import postgres from "postgres";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

function getUrl(): string {
  const url =
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL;
  if (!url) {
    console.error(
      "[seed] No connection string found. Set one of: POSTGRES_URL_NON_POOLING, DATABASE_URL, POSTGRES_URL."
    );
    process.exit(1);
  }
  return url;
}

async function main() {
  const sql = postgres(getUrl(), { prepare: false, max: 1 });

  console.log("[seed] Connected. Ensuring schema...");
  await ensureSchema(sql);
  console.log("[seed] Schema ready.");

  await bootstrapAdmin(sql);

  await sql.end({ timeout: 5 });
  console.log("[seed] Done.");
}

async function ensureSchema(sql: postgres.Sql) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS tenants (
       id TEXT PRIMARY KEY,
       name TEXT NOT NULL,
       token TEXT NOT NULL UNIQUE,
       locale TEXT NOT NULL DEFAULT 'sv',
       note TEXT,
       is_active BOOLEAN NOT NULL DEFAULT TRUE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS departments (
       id TEXT PRIMARY KEY,
       tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
       name TEXT NOT NULL,
       sort_index INTEGER NOT NULL DEFAULT 0,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
       is_active BOOLEAN NOT NULL DEFAULT TRUE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)`,
    `CREATE TABLE IF NOT EXISTS sessions (
       id TEXT PRIMARY KEY,
       user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       expires_at TIMESTAMPTZ NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
       is_archived BOOLEAN NOT NULL DEFAULT FALSE,
       sort_index INTEGER NOT NULL DEFAULT 0,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_checklists_tenant ON checklists(tenant_id, is_archived, sort_index)`,
    `CREATE INDEX IF NOT EXISTS idx_checklists_dept ON checklists(department_id)`,
    `CREATE TABLE IF NOT EXISTS tasks (
       id TEXT PRIMARY KEY,
       checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
       title TEXT NOT NULL,
       assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
       sort_index INTEGER NOT NULL DEFAULT 0,
       is_archived BOOLEAN NOT NULL DEFAULT FALSE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_checklist ON tasks(checklist_id, is_archived, sort_index)`,
    `CREATE TABLE IF NOT EXISTS task_completions (
       id TEXT PRIMARY KEY,
       task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
       user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
       user_name TEXT NOT NULL DEFAULT '',
       period_key TEXT NOT NULL,
       note TEXT DEFAULT '',
       completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_dept ON messages(department_id, created_at)`,
    `CREATE TABLE IF NOT EXISTS message_translations (
       id TEXT PRIMARY KEY,
       message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
       lang TEXT NOT NULL,
       title TEXT NOT NULL,
       body TEXT NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_message_translations ON message_translations(message_id, lang)`,
    `CREATE TABLE IF NOT EXISTS parent_links (
       id TEXT PRIMARY KEY,
       tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
       department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
       token TEXT NOT NULL UNIQUE,
       language TEXT NOT NULL DEFAULT 'sv',
       label TEXT NOT NULL DEFAULT '',
       is_active BOOLEAN NOT NULL DEFAULT TRUE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_parent_links_tenant ON parent_links(tenant_id)`,
  ];

  for (const stmt of statements) {
    await sql.unsafe(stmt);
  }
}

async function bootstrapAdmin(sql: postgres.Sql) {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!email || !password) {
    console.log(
      "[seed] ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD not set — skipping admin bootstrap."
    );
    return;
  }

  const existing = await sql<{ id: string }[]>`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  `;
  if (existing.length > 0) {
    console.log(`[seed] Admin user already exists for ${email} — skipping.`);
    return;
  }

  const id = nanoid(16);
  const hash = await bcrypt.hash(password, 10);
  await sql`
    INSERT INTO users (id, tenant_id, department_id, role, email, password_hash, name, is_active)
    VALUES (${id}, NULL, NULL, 'admin', ${email}, ${hash}, 'Administrator', TRUE)
  `;
  console.log(`[seed] Created admin user: ${email}`);
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
