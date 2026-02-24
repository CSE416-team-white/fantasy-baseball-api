// Custom error class with HTTP status code.
// Throw this in services — the error handler middleware picks up the status.
//
// Usage:
//   throw new ApiError(404, 'Player not found');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
