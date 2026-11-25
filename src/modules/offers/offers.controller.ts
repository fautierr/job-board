import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../shared/errors';
import * as offersService from './offers.service';
import type {
  ChangeOfferStatusDto,
  CreateOfferDto,
  OfferFilters,
  UpdateOfferDto,
} from './offers.schema';

function authenticatedUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user;
}

export async function listPublished(
  req: Request,
  res: Response,
): Promise<void> {
  const offers = await offersService.findPublished(req.query as OfferFilters);
  res.status(200).json({ offers });
}

export async function getPublishedById(
  req: Request,
  res: Response,
): Promise<void> {
  const offer = await offersService.findPublishedById(req.params.id);
  res.status(200).json({ offer });
}

export async function create(req: Request, res: Response): Promise<void> {
  const user = authenticatedUser(req);
  const offer = await offersService.create(req.body as CreateOfferDto, user.id);
  res.status(201).json({ offer });
}

export async function listOwned(req: Request, res: Response): Promise<void> {
  const user = authenticatedUser(req);
  const offers = await offersService.findByEmployer(user.id);
  res.status(200).json({ offers });
}

export async function update(req: Request, res: Response): Promise<void> {
  const user = authenticatedUser(req);
  const offer = await offersService.updateOwned(
    req.params.id,
    user.id,
    req.body as UpdateOfferDto,
  );
  res.status(200).json({ offer });
}

export async function changeStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const user = authenticatedUser(req);
  const offer = await offersService.changeStatus(
    req.params.id,
    user.id,
    req.body as ChangeOfferStatusDto,
  );
  res.status(200).json({ offer });
}
