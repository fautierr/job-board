import type { NextFunction, Request, Response } from 'express';
import * as offersRepository from '../modules/offers/offers.repository';
import { NotFoundError, UnauthorizedError } from '../shared/errors';

export async function loadOwnedOffer(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const employerId = req.user?.id;
    if (!employerId) {
      throw new UnauthorizedError();
    }

    const offer = await offersRepository.findOwnedById(req.params.id, employerId);
    if (!offer) {
      throw new NotFoundError('Oferta no encontrada');
    }

    req.offer = offer;
    next();
  } catch (error) {
    next(error);
  }
}
