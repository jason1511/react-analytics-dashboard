import { apiEmpty, apiRequest, apiText } from "./client";

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

export async function listDatasets(page = 1, pageSize = 50) {
  return apiRequest<PagedResponse<DatasetSummary>>(
    `/api/datasets?page=${page}&pageSize=${pageSize}`
  );
}

export async function uploadDataset(file: File, name?: string, originalFileName?: string) {
  const form = new FormData();
  form.append("file", file);
  if (name?.trim()) form.append("name", name.trim());
  if (originalFileName?.trim()) form.append("originalFileName", originalFileName.trim());

  return apiRequest<DatasetSummary>("/api/datasets/upload", {
    method: "POST",
    body: form,
  });
}

export async function loadDatasetContent(id: string) {
  return apiText(`/api/datasets/${id}/content`);
}

export async function deleteDataset(id: string) {
  return apiEmpty(`/api/datasets/${id}`, {
    method: "DELETE",
  });
}
