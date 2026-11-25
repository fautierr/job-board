import { ConflictError, NotFoundError } from '../../shared/errors';
import * as offersRepository from '../offers/offers.repository';
import * as applicationsRepository from './applications.repository';
import type { Application } from './applications.entity';
import type { CreateApplicationDto } from './applications.schema';

export interface ApplicationDto {
  id: string;
  offerId: string;
  candidateName: string;
  phone: string;
  createdAt: Date;
}

export interface EmployerApplicationDto extends ApplicationDto {
  candidateId: string;
}

const DUPLICATE_CONSTRAINT = 'UQ_applications_offer_candidate';

function isDuplicateApplicationError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error &&
    error.constraint === DUPLICATE_CONSTRAINT
  );
}

function toApplicationDto(application: Application): ApplicationDto {
  return {
    id: application.id,
    offerId: application.offerId,
    candidateName: application.candidateName,
    phone: application.phone,
    createdAt: application.createdAt,
  };
}

function toEmployerApplicationDto(
  application: Application,
): EmployerApplicationDto {
  return {
    ...toApplicationDto(application),
    candidateId: application.candidateId,
  };
}

export async function create(
  dto: CreateApplicationDto,
  offerId: string,
  candidateId: string,
): Promise<ApplicationDto> {
  const offer = await offersRepository.findPublishedById(offerId);
  if (!offer) {
    throw new NotFoundError('Oferta no encontrada');
  }

  try {
    const application = await applicationsRepository.create({
      ...dto,
      offerId,
      candidateId,
    });
    return toApplicationDto(application);
  } catch (error) {
    if (isDuplicateApplicationError(error)) {
      throw new ConflictError(
        'Ya te postulaste a esta oferta',
        'ALREADY_APPLIED',
      );
    }
    throw error;
  }
}

export async function findByCandidateId(
  candidateId: string,
): Promise<ApplicationDto[]> {
  const applications =
    await applicationsRepository.findByCandidateId(candidateId);
  return applications.map(toApplicationDto);
}

export async function findByOfferId(
  offerId: string,
): Promise<EmployerApplicationDto[]> {
  const applications = await applicationsRepository.findByOfferId(offerId);
  return applications.map(toEmployerApplicationDto);
}
