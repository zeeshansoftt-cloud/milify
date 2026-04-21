import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db/client";
import { sessions, tenants, users, type User } from "@/db/schema";
import { and, eq, gt, lt } from "drizzle-orm";
import { createId } from "@/lib/tokens";
import { cache } from "react";

const COOKIE_NAME = "milify_sid";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const s = process.env.SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set and at least 16 chars");
  }
  return s;
}

function sign(value: string): string {
  const h = crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
  return `${value}.${h}`;
}

function unsign(signed: string): string | null {
  const dot = signed.lastIndexOf(".");
  if (dot < 0) return null;
  const value = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  const expected = crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return value;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function signIn(email: string, password: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  await bootstrapFirstAdmin();

  const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  const user = rows[0];
  if (!user || !user.isActive) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;

  const sid = createId() + createId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db.insert(sessions).values({ id: sid, userId: user.id, expiresAt });

  const jar = await cookies();
  jar.set(COOKIE_NAME, sign(sid), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });

  return user;
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (raw) {
    const sid = unsign(raw);
    if (sid) {
      await db.delete(sessions).where(eq(sessions.id, sid));
    }
  }
  jar.delete(COOKIE_NAME);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const sid = unsign(raw);
  if (!sid) return null;

  const now = new Date().toISOString();
  const rows = await db
    .select({ s: sessions, u: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sid), gt(sessions.expiresAt, now)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (!row.u.isActive) return null;
  return row.u;
});

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) throw new Error("unauthenticated");
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("forbidden");
  return u;
}

export async function requireTenantMember(tenantId: string): Promise<User> {
  const u = await requireUser();
  if (u.role === "admin") return u;
  if (u.tenantId !== tenantId) throw new Error("forbidden");
  return u;
}

let bootstrapChecked = false;
export async function bootstrapFirstAdmin(): Promise<void> {
  if (bootstrapChecked) return;
  bootstrapChecked = true;
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) return;

  const any = await db.select({ id: users.id }).from(users).limit(1);
  if (any.length > 0) return;

  await db.insert(users).values({
    id: createId(),
    tenantId: null,
    departmentId: null,
    role: "admin",
    email,
    passwordHash: await hashPassword(password),
    name: "Administrator",
    isActive: true,
  });
}

export async function purgeExpiredSessions(): Promise<void> {
  const now = new Date().toISOString();
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}

export async function getTenantForUser(user: User) {
  if (!user.tenantId) return null;
  const rows = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
  return rows[0] ?? null;
}
