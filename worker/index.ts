import {
  PASSWORD_ITERATIONS,
  SESSION_COOKIE,
  createSession,
  currentUser,
  expiredSessionCookie,
  getCookie,
  hashPassword,
  isValidPassword,
  isValidUsername,
  normalizeUsername,
  randomHex,
  sessionCookie,
  sha256,
  verifyPassword,
} from "./auth";
import { inspectCsv } from "./csv";
import { json, methodNotAllowed, problem, readJson } from "./http";
import type { DatasetRow, Env, SessionUser, User } from "./types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type StoredUser = User & {
  password_hash: string;
  password_salt: string;
  password_iterations: number;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (!url.pathname.startsWith("/api/")) return problem("Not found.", 404);
      if (!isTrustedMutation(request, url)) return problem("Invalid request origin.", 403);

      if (url.pathname === "/api/health") {
        return request.method === "GET"
          ? json({ status: "ok", runtime: "cloudflare-workers" })
          : methodNotAllowed();
      }
      if (url.pathname.startsWith("/api/auth/")) {
        return handleAuth(request, env, url);
      }
      if (url.pathname === "/api/datasets" || url.pathname.startsWith("/api/datasets/")) {
        const user = await currentUser(request, env);
        if (!user) return problem("Authentication required.", 401);
        return handleDatasets(request, env, url, user);
      }

      return problem("Not found.", 404);
    } catch (error) {
      console.error("Unhandled API error", error);
      return problem("The server could not complete this request.", 500);
    }
  },
} satisfies ExportedHandler<Env>;

async function handleAuth(request: Request, env: Env, url: URL) {
  const secureCookie = url.protocol === "https:";

  if (url.pathname === "/api/auth/username-available") {
    if (request.method !== "GET") return methodNotAllowed();
    const username = (url.searchParams.get("username") ?? "").trim();
    if (!isValidUsername(username)) return json({ available: false });
    const existing = await env.DB.prepare(
      "SELECT 1 FROM users WHERE normalized_username = ? LIMIT 1",
    )
      .bind(normalizeUsername(username))
      .first();
    return json({ available: !existing });
  }

  if (url.pathname === "/api/auth/register") {
    if (request.method !== "POST") return methodNotAllowed();
    const body = await readCredentials(request);
    if (!body) return problem("Enter a valid username and password.", 400);

    const username = body.username.trim();
    const user: User = { id: crypto.randomUUID(), username };
    const salt = randomHex(16);
    const passwordHash = await hashPassword(body.password, salt);
    const now = new Date().toISOString();
    try {
      await env.DB.prepare(
        `INSERT INTO users
          (id, username, normalized_username, password_hash, password_salt, password_iterations, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          user.id,
          username,
          normalizeUsername(username),
          passwordHash,
          salt,
          PASSWORD_ITERATIONS,
          now,
        )
        .run();
    } catch (error) {
      if (String(error).toLowerCase().includes("unique")) {
        return problem("That username is already taken.", 409);
      }
      throw error;
    }

    const session = await createSession(env, user);
    return json(
      { expiresAt: session.expiresAt, user },
      201,
      { "set-cookie": sessionCookie(session.token, undefined, secureCookie) },
    );
  }

  if (url.pathname === "/api/auth/login") {
    if (request.method !== "POST") return methodNotAllowed();
    const body = await readCredentials(request, false);
    if (!body) return problem("Username or password is incorrect.", 401);

    const stored = await env.DB.prepare(
      `SELECT id, username, password_hash, password_salt, password_iterations
       FROM users WHERE normalized_username = ?`,
    )
      .bind(normalizeUsername(body.username))
      .first<StoredUser>();
    if (
      !stored ||
      !(await verifyPassword(
        body.password,
        stored.password_salt,
        stored.password_hash,
        stored.password_iterations,
      ))
    ) {
      return problem("Username or password is incorrect.", 401);
    }

    const user = { id: stored.id, username: stored.username };
    const session = await createSession(env, user);
    return json(
      { expiresAt: session.expiresAt, user },
      200,
      { "set-cookie": sessionCookie(session.token, undefined, secureCookie) },
    );
  }

  if (url.pathname === "/api/auth/me") {
    if (request.method !== "GET") return methodNotAllowed();
    const user = await currentUser(request, env);
    return user
      ? json({ id: user.id, username: user.username })
      : problem("Authentication required.", 401);
  }

  if (url.pathname === "/api/auth/logout") {
    if (request.method !== "POST") return methodNotAllowed();
    const token = getCookie(request, SESSION_COOKIE);
    if (token) {
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
        .bind(await sha256(token))
        .run();
    }
    return new Response(null, {
      status: 204,
      headers: { "set-cookie": expiredSessionCookie(secureCookie) },
    });
  }

  return problem("Not found.", 404);
}

async function handleDatasets(
  request: Request,
  env: Env,
  url: URL,
  user: SessionUser,
) {
  if (url.pathname === "/api/datasets") {
    if (request.method === "GET") return listDatasets(env, url, user);
    if (request.method === "POST") return createDataset(request, env, user);
    return methodNotAllowed();
  }
  if (url.pathname === "/api/datasets/upload") {
    return request.method === "POST"
      ? uploadDataset(request, env, user)
      : methodNotAllowed();
  }

  const match = url.pathname.match(
    /^\/api\/datasets\/([0-9a-f-]+)(?:\/(content|name))?$/i,
  );
  if (!match) return problem("Not found.", 404);
  const [, id, action] = match;

  if (action === "content") {
    return request.method === "GET"
      ? getDatasetContent(env, user, id)
      : methodNotAllowed();
  }
  if (action === "name") {
    return request.method === "PATCH"
      ? renameDataset(request, env, user, id)
      : methodNotAllowed();
  }
  if (request.method === "GET") return getDataset(env, user, id);
  if (request.method === "DELETE") return deleteDataset(env, user, id);
  return methodNotAllowed();
}

async function listDatasets(env: Env, url: URL, user: User) {
  const page = clampInteger(url.searchParams.get("page"), 1, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInteger(url.searchParams.get("pageSize"), 20, 1, 100);
  const offset = (page - 1) * pageSize;
  const [count, rows] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS count FROM datasets WHERE owner_id = ?").bind(user.id),
    env.DB.prepare(
      `SELECT id, name, original_file_name, status, row_count, column_count,
              size_bytes, created_at, updated_at
       FROM datasets WHERE owner_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ).bind(user.id, pageSize, offset),
  ]);
  const totalItems = Number((count.results[0] as { count?: number } | undefined)?.count ?? 0);
  return json({
    items: (rows.results as DatasetRow[]).map(datasetResponse),
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  });
}

async function getDataset(env: Env, user: User, id: string) {
  const dataset = await findDataset(env, user.id, id);
  return dataset ? json(datasetResponse(dataset)) : problem("Dataset not found.", 404);
}

async function createDataset(request: Request, env: Env, user: User) {
  const body = await readJson<{
    name?: unknown;
    originalFileName?: unknown;
    sizeBytes?: unknown;
  }>(request);
  if (
    !body ||
    typeof body.name !== "string" ||
    !normalizeDatasetName(body.name) ||
    typeof body.originalFileName !== "string" ||
    !body.originalFileName.trim() ||
    typeof body.sizeBytes !== "number" ||
    body.sizeBytes < 0
  ) {
    return problem("Enter valid dataset metadata.", 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO datasets
      (id, owner_id, name, original_file_name, status, size_bytes, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)`,
  )
    .bind(
      id,
      user.id,
      normalizeDatasetName(body.name),
      safeFileName(body.originalFileName),
      Math.floor(body.sizeBytes),
      now,
      now,
    )
    .run();
  return json(
    datasetResponse({
      id,
      name: normalizeDatasetName(body.name),
      original_file_name: safeFileName(body.originalFileName),
      status: "Pending",
      row_count: null,
      column_count: null,
      size_bytes: Math.floor(body.sizeBytes),
      created_at: now,
      updated_at: now,
    }),
    201,
  );
}

async function uploadDataset(request: Request, env: Env, user: User) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_SIZE + 1024 * 1024) {
    return problem("The CSV file exceeds the 10 MB limit.", 413);
  }

  const form = await request.formData();
  const value = form.get("file");
  if (!(value instanceof File) || value.size === 0) {
    return problem("Choose a non-empty CSV file.", 400);
  }
  if (value.size > MAX_FILE_SIZE) {
    return problem("The CSV file exceeds the 10 MB limit.", 400);
  }
  if (!value.name.toLowerCase().endsWith(".csv")) {
    return problem("Only .csv files are supported.", 400);
  }

  const bytes = await value.arrayBuffer();
  let inspection;
  try {
    inspection = inspectCsv(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    return problem(error instanceof Error ? error.message : "The CSV is invalid.", 400);
  }

  const id = crypto.randomUUID();
  const storageKey = `${user.id}/${id}.csv`;
  const originalFileName = safeFileName(value.name);
  const requestedName = form.get("name");
  const name = normalizeDatasetName(
    typeof requestedName === "string" && requestedName.trim()
      ? requestedName
      : originalFileName.replace(/\.csv$/i, ""),
  );
  if (!name) return problem("Dataset name cannot be blank.", 400);

  await env.DATASETS.put(storageKey, bytes, {
    httpMetadata: { contentType: "text/csv; charset=utf-8" },
  });

  const now = new Date().toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO datasets
        (id, owner_id, name, original_file_name, storage_key, status,
         row_count, column_count, size_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'Ready', ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        user.id,
        name,
        originalFileName,
        storageKey,
        inspection.rowCount,
        inspection.columnCount,
        value.size,
        now,
        now,
      )
      .run();
  } catch (error) {
    await env.DATASETS.delete(storageKey);
    throw error;
  }

  return json(
    datasetResponse({
      id,
      name,
      original_file_name: originalFileName,
      status: "Ready",
      row_count: inspection.rowCount,
      column_count: inspection.columnCount,
      size_bytes: value.size,
      created_at: now,
      updated_at: now,
    }),
    201,
  );
}

async function getDatasetContent(env: Env, user: User, id: string) {
  const dataset = await env.DB.prepare(
    `SELECT original_file_name, storage_key FROM datasets
     WHERE id = ? AND owner_id = ?`,
  )
    .bind(id, user.id)
    .first<{ original_file_name: string; storage_key: string | null }>();
  if (!dataset?.storage_key) return problem("Dataset not found.", 404);

  const object = await env.DATASETS.get(dataset.storage_key);
  if (!object) return problem("Stored dataset file not found.", 404);
  return new Response(object.body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(dataset.original_file_name)}`,
      "cache-control": "private, no-store",
    },
  });
}

async function renameDataset(
  request: Request,
  env: Env,
  user: User,
  id: string,
) {
  const body = await readJson<{ name?: unknown }>(request);
  const name = typeof body?.name === "string" ? normalizeDatasetName(body.name) : "";
  if (!name) return problem("Dataset name cannot be blank.", 400);

  const updatedAt = new Date().toISOString();
  const result = await env.DB.prepare(
    "UPDATE datasets SET name = ?, updated_at = ? WHERE id = ? AND owner_id = ?",
  )
    .bind(name, updatedAt, id, user.id)
    .run();
  if (!result.meta.changes) return problem("Dataset not found.", 404);
  return getDataset(env, user, id);
}

async function deleteDataset(env: Env, user: User, id: string) {
  const dataset = await env.DB.prepare(
    "SELECT storage_key FROM datasets WHERE id = ? AND owner_id = ?",
  )
    .bind(id, user.id)
    .first<{ storage_key: string | null }>();
  if (!dataset) return problem("Dataset not found.", 404);

  await env.DB.prepare("DELETE FROM datasets WHERE id = ? AND owner_id = ?")
    .bind(id, user.id)
    .run();
  if (dataset.storage_key) {
    try {
      await env.DATASETS.delete(dataset.storage_key);
    } catch (error) {
      console.warn("Dataset metadata deleted but R2 cleanup failed", id, error);
    }
  }
  return new Response(null, { status: 204 });
}

async function findDataset(env: Env, ownerId: string, id: string) {
  return env.DB.prepare(
    `SELECT id, name, original_file_name, status, row_count, column_count,
            size_bytes, created_at, updated_at
     FROM datasets WHERE id = ? AND owner_id = ?`,
  )
    .bind(id, ownerId)
    .first<DatasetRow>();
}

function datasetResponse(row: DatasetRow) {
  return {
    id: row.id,
    name: row.name,
    originalFileName: row.original_file_name,
    status: row.status,
    rowCount: row.row_count,
    columnCount: row.column_count,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function readCredentials(request: Request, enforceRegistrationRules = true) {
  const body = await readJson<{ username?: unknown; password?: unknown }>(request);
  if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
    return null;
  }
  if (enforceRegistrationRules) {
    if (!isValidUsername(body.username) || !isValidPassword(body.password)) return null;
  } else if (!body.username.trim() || !body.password) {
    return null;
  }
  return { username: body.username, password: body.password };
}

function normalizeDatasetName(value: string) {
  return value.trim().slice(0, 120);
}

function safeFileName(value: string) {
  return value.split(/[\\/]/).pop()?.trim().slice(0, 255) || "dataset.csv";
}

function clampInteger(
  raw: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

function isTrustedMutation(request: Request, url: URL) {
  if (!new Set(["POST", "PUT", "PATCH", "DELETE"]).has(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin || origin === url.origin) return true;

  try {
    const originUrl = new URL(origin);
    const localHosts = new Set(["localhost", "127.0.0.1"]);
    return localHosts.has(originUrl.hostname) && localHosts.has(url.hostname);
  } catch {
    return false;
  }
}
