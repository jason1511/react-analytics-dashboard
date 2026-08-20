import type { Env, SessionUser, User } from "./types";

export const SESSION_COOKIE = "analytics_session";
// The Workers Free plan has a 10 ms CPU limit per request. Keep the Web Crypto
// password derivation within that budget while retaining a per-user random salt.
export const PASSWORD_ITERATIONS = 10_000;
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

export function normalizeUsername(username: string) {
  return username.trim().toUpperCase();
}

export function isValidUsername(username: string) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{2,39}$/.test(username.trim());
}

export function isValidPassword(password: string) {
  return password.length >= 10 && password.length <= 128;
}

export function randomHex(byteLength: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bytesToHex(bytes);
}

export async function hashPassword(
  password: string,
  saltHex: string,
  pepper: string,
  iterations = PASSWORD_ITERATIONS,
) {
  const pepperKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const pepperedPassword = await crypto.subtle.sign(
    "HMAC",
    pepperKey,
    encoder.encode(password),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    pepperedPassword,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: hexToBytes(saltHex),
      iterations,
    },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

export async function verifyPassword(
  password: string,
  saltHex: string,
  expectedHash: string,
  iterations: number,
  pepper: string,
) {
  const actual = await hashPassword(password, saltHex, pepper, iterations);
  if (actual.length !== expectedHash.length) return false;

  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  }
  return difference === 0;
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export function getCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return null;
}

export function sessionCookie(
  token: string,
  maxAge = SESSION_LIFETIME_SECONDS,
  secure = true,
) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function expiredSessionCookie(secure = true) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}

export async function createSession(env: Env, user: User) {
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_SECONDS * 1000);

  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  )
    .bind(tokenHash, user.id, now.toISOString(), expiresAt.toISOString())
    .run();

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function currentUser(request: Request, env: Env): Promise<SessionUser | null> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT users.id, users.username
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
  )
    .bind(tokenHash, new Date().toISOString())
    .first<User>();

  return row ? { ...row, tokenHash } : null;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  if (hex.length % 2 !== 0) throw new Error("Invalid hexadecimal value.");
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
