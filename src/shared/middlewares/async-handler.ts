import { type Request, type Response, type NextFunction } from 'express';

// Wraps an async route handler so thrown errors are passed to next().
// Eliminates try/catch boilerplate in every route.
//
// Usage:
//   router.get('/', asyncHandler(async (req, res) => {
//     const data = await someService();
//     res.json({ data });
//   }));

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
