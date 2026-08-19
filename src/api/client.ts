const API_BASE_URL = "";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  if (response.status === 401) {
    window.dispatchEvent(new Event("auth:unauthorized"));
  }
  if (!response.ok) throw await createApiError(response);
  return response.json() as Promise<T>;
}

export async function apiText(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  if (response.status === 401) {
    window.dispatchEvent(new Event("auth:unauthorized"));
  }
  if (!response.ok) throw await createApiError(response);
  return response.text();
}

export async function apiEmpty(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  if (response.status === 401) {
    window.dispatchEvent(new Event("auth:unauthorized"));
  }
  if (!response.ok) throw await createApiError(response);
}

async function createApiError(response: Response) {
  let message = `Request failed with status ${response.status}.`;
  try {
    const problem = (await response.json()) as {
      title?: string;
      detail?: string;
      errors?: Record<string, string[]>;
    };
    const validationMessage = problem.errors
      ? Object.values(problem.errors).flat()[0]
      : undefined;
    message = validationMessage ?? problem.detail ?? problem.title ?? message;
  } catch {
    // Keep the status-based fallback when the response is not JSON.
  }
  return new Error(message);
}
