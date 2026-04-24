export interface ApiEnvelope<T> {
  data: T | null;
  error: ApiErrorEnvelope | null;
  pagination?: {
    limit: number;
    offset: number;
  };
}

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  detail?: unknown;
}

export interface PaginatedPayload<T> {
  items: T[];
  next_cursor: string | null;
}
