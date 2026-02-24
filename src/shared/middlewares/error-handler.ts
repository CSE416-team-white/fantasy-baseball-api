import { type Request, type Response, type NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err.stack);

  const status = (err as Error & { status?: number }).status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ message });
}
