import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  locale: text("locale").notNull().default("sv"),
  note: text("note"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const departments = sqliteTable(
  "departments",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    byTenant: index("idx_departments_tenant").on(t.tenantId, t.sortIndex),
  })
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
    role: text("role", { enum: ["admin", "staff"] }).notNull().default("staff"),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull().default(""),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    emailUnique: uniqueIndex("ux_users_email").on(t.email),
    byTenant: index("idx_users_tenant").on(t.tenantId),
  })
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    byUser: index("idx_sessions_user").on(t.userId),
  })
);

export const checklists = sqliteTable(
  "checklists",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").default(""),
    frequency: text("frequency", { enum: ["daily", "weekly", "monthly", "custom"] })
      .notNull()
      .default("daily"),
    token: text("token").notNull().unique(),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    byTenant: index("idx_checklists_tenant").on(t.tenantId, t.isArchived, t.sortIndex),
    byDept: index("idx_checklists_dept").on(t.departmentId),
  })
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    checklistId: text("checklist_id")
      .notNull()
      .references(() => checklists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    assignedUserId: text("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    sortIndex: integer("sort_index").notNull().default(0),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    byChecklist: index("idx_tasks_checklist").on(t.checklistId, t.isArchived, t.sortIndex),
  })
);

export const taskCompletions = sqliteTable(
  "task_completions",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    userName: text("user_name").notNull().default(""),
    periodKey: text("period_key").notNull(),
    note: text("note").default(""),
    completedAt: text("completed_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    byTaskPeriod: index("idx_completions_task_period").on(t.taskId, t.periodKey),
    byTask: index("idx_completions_task").on(t.taskId, t.completedAt),
  })
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull().default(""),
    departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sourceLang: text("source_lang").notNull().default("sv"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    byTenant: index("idx_messages_tenant").on(t.tenantId, t.createdAt),
    byDept: index("idx_messages_dept").on(t.departmentId, t.createdAt),
  })
);

export const messageTranslations = sqliteTable(
  "message_translations",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    lang: text("lang").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    uniq: uniqueIndex("ux_message_translations").on(t.messageId, t.lang),
  })
);

export const parentLinks = sqliteTable(
  "parent_links",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
    token: text("token").notNull().unique(),
    language: text("language").notNull().default("sv"),
    label: text("label").notNull().default(""),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    byTenant: index("idx_parent_links_tenant").on(t.tenantId),
  })
);

export type Tenant = typeof tenants.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Checklist = typeof checklists.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MessageTranslation = typeof messageTranslations.$inferSelect;
export type ParentLink = typeof parentLinks.$inferSelect;
