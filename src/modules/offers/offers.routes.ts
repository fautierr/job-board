import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { loadOwnedOffer } from '../../middlewares/load-owned-offer';
import { requireRole } from '../../middlewares/require-role';
import { validate } from '../../middlewares/validate';
import * as offersController from './offers.controller';
import {
  changeOfferStatusSchema,
  createOfferSchema,
  offerFiltersSchema,
  offerIdParamSchema,
  updateOfferSchema,
} from './offers.schema';

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

function handle(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res).catch(next);
  };
}

export const offersRouter = Router();
export const myOffersRouter = Router();

offersRouter.get(
  '/',
  validate(offerFiltersSchema, 'query'),
  handle(offersController.listPublished),
);

offersRouter.get(
  '/:id',
  validate(offerIdParamSchema, 'params'),
  handle(offersController.getPublishedById),
);

offersRouter.post(
  '/',
  authenticate,
  requireRole('EMPLOYER'),
  validate(createOfferSchema),
  handle(offersController.create),
);

offersRouter.patch(
  '/:id/status',
  authenticate,
  requireRole('EMPLOYER'),
  validate(offerIdParamSchema, 'params'),
  loadOwnedOffer,
  validate(changeOfferStatusSchema),
  handle(offersController.changeStatus),
);

offersRouter.patch(
  '/:id',
  authenticate,
  requireRole('EMPLOYER'),
  validate(offerIdParamSchema, 'params'),
  loadOwnedOffer,
  validate(updateOfferSchema),
  handle(offersController.update),
);

myOffersRouter.get(
  '/',
  authenticate,
  requireRole('EMPLOYER'),
  handle(offersController.listOwned),
);
