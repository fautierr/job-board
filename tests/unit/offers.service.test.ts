import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/offers/offers.repository', () => ({
  create: vi.fn(),
  findPublished: vi.fn(),
  findPublishedById: vi.fn(),
  findOwnedById: vi.fn(),
  findByEmployerId: vi.fn(),
  updateOwned: vi.fn(),
}));

import type { Offer } from '../../src/modules/offers/offers.entity';
import * as offersRepository from '../../src/modules/offers/offers.repository';
import * as offersService from '../../src/modules/offers/offers.service';

const mockedCreate = vi.mocked(offersRepository.create);
const mockedFindPublished = vi.mocked(offersRepository.findPublished);
const mockedFindPublishedById = vi.mocked(offersRepository.findPublishedById);
const mockedFindOwnedById = vi.mocked(offersRepository.findOwnedById);
const mockedFindByEmployerId = vi.mocked(offersRepository.findByEmployerId);
const mockedUpdateOwned = vi.mocked(offersRepository.updateOwned);

const createDto = {
  title: 'Desarrollador TypeScript',
  description: 'Desarrollo de APIs',
  category: 'TECHNOLOGY_SYSTEMS' as const,
  seniority: 'JUNIOR' as const,
  workMode: 'REMOTE' as const,
  workday: 'FULL_TIME' as const,
  contractType: 'EMPLOYMENT' as const,
};

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 'offer-1',
    employerId: 'employer-1',
    employer: { companyName: 'Acme S.A.' } as Offer['employer'],
    title: createDto.title,
    description: createDto.description,
    category: createDto.category,
    seniority: createDto.seniority,
    workMode: createDto.workMode,
    workday: createDto.workday,
    contractType: createDto.contractType,
    status: 'PUBLISHED',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as Offer;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('offers.service', () => {
  it('crea la oferta con el employerId autenticado y estado PUBLISHED', async () => {
    mockedCreate.mockResolvedValue(makeOffer());

    const result = await offersService.create(createDto, 'employer-token');

    expect(mockedCreate).toHaveBeenCalledWith({
      ...createDto,
      employerId: 'employer-token',
      status: 'PUBLISHED',
    });
    expect(result.status).toBe('PUBLISHED');
    expect(result).not.toHaveProperty('employerId');
  });

  it('pasa filtros y paginación al repositorio sin incluir datos del empleador', async () => {
    const filters = {
      category: 'ADMINISTRATION' as const,
      q: 'node',
      page: 2,
      limit: 20,
    };
    mockedFindPublished.mockResolvedValue({ offers: [makeOffer()], total: 21 });

    const result = await offersService.findPublished(filters);

    expect(mockedFindPublished).toHaveBeenCalledWith(filters);
    expect(result.offers[0]).toMatchObject({ companyName: 'Acme S.A.' });
    expect(result.offers[0]).not.toHaveProperty('employerId');
    expect(result.offers[0]).not.toHaveProperty('employer');
    expect(result.offers[0]).not.toHaveProperty('email');
    expect(result.offers[0]).not.toHaveProperty('passwordHash');
    expect(result.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 21,
      totalPages: 2,
      hasNext: false,
      hasPrevious: true,
    });
  });

  it('devuelve metadatos consistentes cuando no hay resultados', async () => {
    mockedFindPublished.mockResolvedValue({ offers: [], total: 0 });

    const result = await offersService.findPublished({ page: 3, limit: 10 });

    expect(result).toEqual({
      offers: [],
      pagination: {
        page: 3,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    });
  });

  it('busca el detalle público y lanza 404 si no está publicada', async () => {
    mockedFindPublishedById.mockResolvedValueOnce(makeOffer());
    mockedFindPublishedById.mockResolvedValueOnce(null);

    await expect(offersService.findPublishedById('offer-1')).resolves.toMatchObject({
      id: 'offer-1',
      companyName: 'Acme S.A.',
    });
    await expect(offersService.findPublishedById('offer-2')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('lista las ofertas propias con cualquier estado', async () => {
    mockedFindByEmployerId.mockResolvedValue([
      makeOffer({ status: 'PAUSED' }),
      makeOffer({ id: 'offer-2', status: 'CLOSED' }),
    ]);

    const result = await offersService.findByEmployer('employer-1');

    expect(mockedFindByEmployerId).toHaveBeenCalledWith('employer-1');
    expect(result.map((offer) => offer.status)).toEqual(['PAUSED', 'CLOSED']);
  });

  it('actualiza pasando el employerId al repositorio', async () => {
    mockedUpdateOwned.mockResolvedValue(
      makeOffer({ title: 'Nuevo título', category: 'ADMINISTRATION' }),
    );

    const result = await offersService.updateOwned('offer-1', 'employer-1', {
      title: 'Nuevo título',
      category: 'ADMINISTRATION',
    });

    expect(mockedUpdateOwned).toHaveBeenCalledWith('offer-1', 'employer-1', {
      title: 'Nuevo título',
      category: 'ADMINISTRATION',
    });
    expect(result.title).toBe('Nuevo título');
    expect(result.status).toBe('PUBLISHED');
  });

  it('rechaza la actualización si la oferta no pertenece al empleador', async () => {
    mockedUpdateOwned.mockResolvedValue(null);

    await expect(
      offersService.updateOwned('offer-1', 'employer-2', { title: 'Nuevo' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('permite las transiciones definidas', async () => {
    const cases = [
      { from: 'PUBLISHED' as const, to: 'PAUSED' as const },
      { from: 'PAUSED' as const, to: 'PUBLISHED' as const },
      { from: 'PUBLISHED' as const, to: 'CLOSED' as const },
      { from: 'PAUSED' as const, to: 'CLOSED' as const },
    ];

    for (const { from, to } of cases) {
      mockedFindOwnedById.mockResolvedValue(makeOffer({ status: from }));
      mockedUpdateOwned.mockResolvedValue(makeOffer({ status: to }));

      const result = await offersService.changeStatus('offer-1', 'employer-1', {
        status: to,
      });

      expect(result.status).toBe(to);
      expect(mockedUpdateOwned).toHaveBeenCalledWith('offer-1', 'employer-1', {
        status: to,
      });
    }
  });

  it('rechaza transiciones inválidas, repetidas y desde CLOSED', async () => {
    const cases = [
      { from: 'PUBLISHED' as const, to: 'PUBLISHED' as const },
      { from: 'PAUSED' as const, to: 'PAUSED' as const },
      { from: 'CLOSED' as const, to: 'PUBLISHED' as const },
      { from: 'CLOSED' as const, to: 'PAUSED' as const },
    ];

    for (const { from, to } of cases) {
      mockedFindOwnedById.mockResolvedValue(makeOffer({ status: from }));

      await expect(
        offersService.changeStatus('offer-1', 'employer-1', { status: to }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    expect(mockedUpdateOwned).not.toHaveBeenCalled();
  });

  it('rechaza el cambio de estado de una oferta ajena con 404', async () => {
    mockedFindOwnedById.mockResolvedValue(null);

    await expect(
      offersService.changeStatus('offer-1', 'employer-2', { status: 'PAUSED' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(mockedUpdateOwned).not.toHaveBeenCalled();
  });
});
