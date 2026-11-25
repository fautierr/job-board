import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { loadOwnedOffer } from '../../middlewares/load-owned-offer';
import { requireRole } from '../../middlewares/require-role';
import { validate } from '../../middlewares/validate';
import { offerIdParamSchema } from '../offers/offers.schema';
import * as applicationsController from './applications.controller';
import { createApplicationSchema } from './applications.schema';

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

function handle(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
}

export const applicationsRouter = Router();
export const myApplicationsRouter = Router();

applicationsRouter.post(
  '/:id/applications',
  authenticate,
  requireRole('CANDIDATE'),
  validate(offerIdParamSchema, 'params'),
  validate(createApplicationSchema),
  handle(applicationsController.create),
);

applicationsRouter.get(
  '/:id/applications',
  authenticate,
  requireRole('EMPLOYER'),
  validate(offerIdParamSchema, 'params'),
  loadOwnedOffer,
  handle(applicationsController.listForOffer),
);

myApplicationsRouter.get(
  '/',
  authenticate,
  requireRole('CANDIDATE'),
  handle(applicationsController.listMine),
);
