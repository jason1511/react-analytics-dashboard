export interface Env {
  DB: D1Database;
  DATASETS: R2Bucket;
  AUTH_RATE_LIMITER: RateLimit;
  PASSWORD_PEPPER: string;
}

export type User = {
  id: string;
  username: string;
};

export type SessionUser = User & {
  tokenHash: string;
};

export type DatasetRow = {
  id: string;
  name: string;
  original_file_name: string;
  status: string;
  row_count: number | null;
  column_count: number | null;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  storage_key?: string | null;
};
