/**
 * Lỗi nghiệp vụ kèm HTTP status. Service ném lỗi này, error middleware
 * sẽ đọc `.status` để trả về mã HTTP tương ứng.
 */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
