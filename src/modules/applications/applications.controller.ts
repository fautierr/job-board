import type { Request, Response } from 'express';
import { NotFoundError, UnauthorizedError } from '../../shared/errors';
import * as applicationsService from './applications.service';
import type { CreateApplicationDto } from './applications.schema';

function authenticatedUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user;
}

export async function create(req: Request, res: Response): Promise<void> {
  const user = authenticatedUser(req);
  const application = await applicationsService.create(
    req.body as CreateApplicationDto,
    req.params.id,
    user.id,
  );
  res.status(201).json({ application });
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const user = authenticatedUser(req);
  const applications = await applicationsService.findByCandidateId(user.id);
  res.status(200).json({ applications });
}

export async function listForOffer(req: Request, res: Response): Promise<void> {
  const offer = req.offer;
  if (!offer) {
    throw new NotFoundError('Oferta no encontrada');
  }

  const applications = await applicationsService.findByOfferId(offer.id);
  res.status(200).json({ applications });
}
