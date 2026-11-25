import type { OfferStatus } from '../../shared/constants/work-offer-values';
import { ConflictError, NotFoundError } from '../../shared/errors';
import type { Offer } from './offers.entity';
import * as offersRepository from './offers.repository';
import type {
  ChangeOfferStatusDto,
  CreateOfferDto,
  OfferFilters,
  UpdateOfferDto,
} from './offers.schema';

export interface OfferDto {
  id: string;
  title: string;
  description: string;
  category: Offer['category'];
  seniority: Offer['seniority'];
  workMode: Offer['workMode'];
  workday: Offer['workday'];
  contractType: Offer['contractType'];
  status: OfferStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ALLOWED_TRANSITIONS: Record<OfferStatus, readonly OfferStatus[]> = {
  PUBLISHED: ['PAUSED', 'CLOSED'],
  PAUSED: ['PUBLISHED', 'CLOSED'],
  CLOSED: [],
};

function toOfferDto(offer: Offer): OfferDto {
  return {
    id: offer.id,
    title: offer.title,
    description: offer.description,
    category: offer.category,
    seniority: offer.seniority,
    workMode: offer.workMode,
    workday: offer.workday,
    contractType: offer.contractType,
    status: offer.status,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}

export async function create(
  dto: CreateOfferDto,
  employerId: string,
): Promise<OfferDto> {
  const offer = await offersRepository.create({
    ...dto,
    employerId,
    status: 'PUBLISHED',
  });

  return toOfferDto(offer);
}

export async function findPublished(filters: OfferFilters): Promise<OfferDto[]> {
  const offers = await offersRepository.findPublished(filters);
  return offers.map(toOfferDto);
}

export async function findPublishedById(id: string): Promise<OfferDto> {
  const offer = await offersRepository.findPublishedById(id);
  if (!offer) {
    throw new NotFoundError('Oferta no encontrada');
  }

  return toOfferDto(offer);
}

export async function findByEmployer(employerId: string): Promise<OfferDto[]> {
  const offers = await offersRepository.findByEmployerId(employerId);
  return offers.map(toOfferDto);
}

export async function updateOwned(
  id: string,
  employerId: string,
  dto: UpdateOfferDto,
): Promise<OfferDto> {
  const offer = await offersRepository.updateOwned(id, employerId, dto);
  if (!offer) {
    throw new NotFoundError('Oferta no encontrada');
  }

  return toOfferDto(offer);
}

export async function changeStatus(
  id: string,
  employerId: string,
  dto: ChangeOfferStatusDto,
): Promise<OfferDto> {
  const current = await offersRepository.findOwnedById(id, employerId);
  if (!current) {
    throw new NotFoundError('Oferta no encontrada');
  }

  if (
    current.status === dto.status ||
    !ALLOWED_TRANSITIONS[current.status].includes(dto.status)
  ) {
    throw new ConflictError(
      'Transición de estado no permitida',
      'INVALID_STATUS_TRANSITION',
    );
  }

  const updated = await offersRepository.updateOwned(id, employerId, {
    status: dto.status,
  });
  if (!updated) {
    throw new NotFoundError('Oferta no encontrada');
  }

  return toOfferDto(updated);
}
