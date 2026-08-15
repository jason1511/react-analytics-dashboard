export type DatasetSummary = {
  id: string;
  name: string;
  originalFileName: string;
  status: string;
  rowCount: number | null;
  columnCount: number | null;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export type PagedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:5000")
  .replace(/\/$/, "");

export async function listDatasets(page = 1, pageSize = 50) {
  return request<PagedResponse<DatasetSummary>>(
    `/api/datasets?page=${page}&pageSize=${pageSize}`
  );
}

export async function uploadDataset(file: File, name?: string) {
  const form = new FormData();
  form.append("file", file);
  if (name?.trim()) form.append("name", name.trim());

  return request<DatasetSummary>("/api/datasets/upload", {
    method: "POST",
    body: form,
  });
}

export async function loadDatasetContent(id: string) {
  const response = await fetch(`${API_BASE_URL}/api/datasets/${id}/content`);
  if (!response.ok) throw await createApiError(response);
  return response.text();
}

export async function deleteDataset(id: string) {
  const response = await fetch(`${API_BASE_URL}/api/datasets/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) throw await createApiError(response);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) throw await createApiError(response);
  return response.json() as Promise<T>;
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
