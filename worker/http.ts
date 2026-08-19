export function json(data: unknown, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders,
  });
}

export function problem(title: string, status: number, detail?: string) {
  return json({ title, ...(detail ? { detail } : {}) }, status);
}

export function methodNotAllowed() {
  return problem("Method not allowed.", 405);
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return await request.json<T>();
  } catch {
    return null;
  }
}
