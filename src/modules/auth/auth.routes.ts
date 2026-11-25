import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { loginSchema, registerSchema } from './auth.schema';
import * as authService from './auth.service';

export const authRouter = Router();

function handle<T>(
  fn: (req: Request) => Promise<T>,
  statusCode: number,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(statusCode).json(await fn(req));
    } catch (error) {
      next(error);
    }
  };
}

authRouter.post(
  '/register',
  validate(registerSchema),
  handle((req) => authService.register(req.body), 201),
);

authRouter.post(
  '/login',
  validate(loginSchema),
  handle((req) => authService.login(req.body), 200),
);

authRouter.get('/me', authenticate, (req: Request, res: Response): void => {
  res.status(200).json({ user: req.user });
});
