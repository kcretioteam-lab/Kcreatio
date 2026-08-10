import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = (result.error as any).issues ?? (result.error as any).errors ?? [];
      const first = issues[0] ?? { message: 'Validation failed', path: [] };
      res.status(422).json({
        error: 'VALIDATION_ERROR',
        message: first.message,
        field: first.path?.join('.'),
        statusCode: 422,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
