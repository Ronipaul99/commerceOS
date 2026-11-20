export class AdminError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "AdminError";
  }
}
