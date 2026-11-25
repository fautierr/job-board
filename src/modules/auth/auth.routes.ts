import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import * as authController from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';

export const authRouter = Router();

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

function handle(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
}

authRouter.post(
  '/register',
  validate(registerSchema),
  handle(authController.register),
);

authRouter.post('/login', validate(loginSchema), handle(authController.login));

authRouter.get('/me', authenticate, handle(authController.me));
