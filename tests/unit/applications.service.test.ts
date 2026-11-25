import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/offers/offers.repository', () => ({
  findPublishedById: vi.fn(),
}));

vi.mock('../../src/modules/applications/applications.repository', () => ({
  create: vi.fn(),
  findByOfferId: vi.fn(),
  findByCandidateId: vi.fn(),
}));

import * as applicationsRepository from '../../src/modules/applications/applications.repository';
import * as applicationsService from '../../src/modules/applications/applications.service';
import type { Application } from '../../src/modules/applications/applications.entity';
import * as offersRepository from '../../src/modules/offers/offers.repository';
import type { Offer } from '../../src/modules/offers/offers.entity';

const mockedFindPublishedById = vi.mocked(offersRepository.findPublishedById);
const mockedCreate = vi.mocked(applicationsRepository.create);
const mockedFindByOfferId = vi.mocked(applicationsRepository.findByOfferId);
const mockedFindByCandidateId = vi.mocked(
  applicationsRepository.findByCandidateId,
);

const dto = {
  candidateName: 'Ana Pérez',
  phone: '+5491112345678',
};

const createdAt = new Date('2026-01-01T00:00:00.000Z');

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'application-1',
    offerId: 'offer-1',
    candidateId: 'candidate-1',
    candidateName: dto.candidateName,
    phone: dto.phone,
    createdAt,
    ...overrides,
  } as Application;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('applications.service', () => {
  it('persiste offerId y candidateId del contexto y devuelve DTO sin candidateId', async () => {
    mockedFindPublishedById.mockResolvedValue({ id: 'offer-1' } as Offer);
    mockedCreate.mockResolvedValue(makeApplication());

    const result = await applicationsService.create(
      dto,
      'offer-1',
      'candidate-1',
    );

    expect(mockedFindPublishedById).toHaveBeenCalledWith('offer-1');
    expect(mockedCreate).toHaveBeenCalledWith({
      ...dto,
      offerId: 'offer-1',
      candidateId: 'candidate-1',
    });
    expect(result).toEqual({
      id: 'application-1',
      offerId: 'offer-1',
      candidateName: dto.candidateName,
      phone: dto.phone,
      createdAt,
    });
    expect(result).not.toHaveProperty('candidateId');
    expect(result).not.toHaveProperty('offer');
    expect(result).not.toHaveProperty('candidate');
  });

  it('rechaza la postulación cuando la oferta no existe o no está publicada', async () => {
    mockedFindPublishedById.mockResolvedValue(null);

    await expect(
      applicationsService.create(dto, 'offer-1', 'candidate-1'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('transforma la violación de UQ_applications_offer_candidate en ALREADY_APPLIED', async () => {
    mockedFindPublishedById.mockResolvedValue({ id: 'offer-1' } as Offer);
    mockedCreate.mockRejectedValue({
      code: '23505',
      constraint: 'UQ_applications_offer_candidate',
    });

    await expect(
      applicationsService.create(dto, 'offer-1', 'candidate-1'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_APPLIED' });
  });

  it('no transforma otros errores de PostgreSQL', async () => {
    mockedFindPublishedById.mockResolvedValue({ id: 'offer-1' } as Offer);
    const error = { code: '23505', constraint: 'PK_applications' };
    mockedCreate.mockRejectedValue(error);

    await expect(
      applicationsService.create(dto, 'offer-1', 'candidate-1'),
    ).rejects.toBe(error);
  });

  it('lista las postulaciones propias sin candidateId', async () => {
    mockedFindByCandidateId.mockResolvedValue([makeApplication()]);

    const result = await applicationsService.findByCandidateId('candidate-1');

    expect(mockedFindByCandidateId).toHaveBeenCalledWith('candidate-1');
    expect(result[0]).not.toHaveProperty('candidateId');
    expect(result[0]).not.toHaveProperty('email');
    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  it('lista las postulaciones de una oferta con candidateId y sin datos privados', async () => {
    mockedFindByOfferId.mockResolvedValue([makeApplication()]);

    const result = await applicationsService.findByOfferId('offer-1');

    expect(mockedFindByOfferId).toHaveBeenCalledWith('offer-1');
    expect(result[0]).toMatchObject({ candidateId: 'candidate-1' });
    expect(result[0]).not.toHaveProperty('email');
    expect(result[0]).not.toHaveProperty('passwordHash');
    expect(result[0]).not.toHaveProperty('candidate');
    expect(result[0]).not.toHaveProperty('offer');
  });
});
