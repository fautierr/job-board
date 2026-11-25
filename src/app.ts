import express, { type Express } from 'express';
import { errorHandler } from './middlewares/error-handler';
import { authRouter } from './modules/auth/auth.routes';
import { myOffersRouter, offersRouter } from './modules/offers/offers.routes';
import { NotFoundError } from './shared/errors';

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/offers', offersRouter);
  app.use('/api/me/offers', myOffersRouter);

  app.use((_req, _res, next) => {
    next(new NotFoundError());
  });

  app.use(errorHandler);

  return app;
}
