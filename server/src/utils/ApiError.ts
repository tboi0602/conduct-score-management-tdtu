export type ApiErrorFields = Record<string, string[]>;

/** Expected application error translated by the central HTTP error middleware. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: ApiErrorFields;

  constructor(status: number, message: string, code = "REQUEST_FAILED", fields?: ApiErrorFields) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
