import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  changeOfferStatusSchema,
  createOfferSchema,
  offerFiltersSchema,
  offerIdParamSchema,
  updateOfferSchema,
} from '../../src/modules/offers/offers.schema';

const validOffer = {
  title: 'Desarrollador TypeScript',
  description: 'Desarrollo de APIs con Node.js y TypeScript',
  category: 'TECHNOLOGY_SYSTEMS',
  seniority: 'JUNIOR',
  workMode: 'REMOTE',
  workday: 'FULL_TIME',
  contractType: 'EMPLOYMENT',
};

describe('offers schemas', () => {
  it('acepta una creación válida y normaliza título y descripción', () => {
    const parsed = createOfferSchema.parse({
      ...validOffer,
      title: '  Desarrollador TypeScript  ',
      description: '  Desarrollo de APIs  ',
    });

    expect(parsed).toEqual({
      ...validOffer,
      title: 'Desarrollador TypeScript',
      description: 'Desarrollo de APIs',
    });
  });

  it('rechaza título y descripción vacíos o demasiado largos', () => {
    expect(() =>
      createOfferSchema.parse({ ...validOffer, title: '   ' }),
    ).toThrow();
    expect(() =>
      createOfferSchema.parse({ ...validOffer, description: '' }),
    ).toThrow();
    expect(() =>
      createOfferSchema.parse({ ...validOffer, title: 'a'.repeat(121) }),
    ).toThrow();
    expect(() =>
      createOfferSchema.parse({ ...validOffer, description: 'a'.repeat(5001) }),
    ).toThrow();
  });

  it('rechaza enumeraciones fuera del catálogo', () => {
    expect(() =>
      createOfferSchema.parse({ ...validOffer, category: 'TECNOLOGIA' }),
    ).toThrow();
    expect(() =>
      createOfferSchema.parse({ ...validOffer, workMode: 'EN_CASA' }),
    ).toThrow();
  });

  it('rechaza employerId y status enviados por el cliente', () => {
    expect(() =>
      createOfferSchema.parse({ ...validOffer, employerId: randomUUID() }),
    ).toThrow();
    expect(() =>
      createOfferSchema.parse({ ...validOffer, status: 'CLOSED' }),
    ).toThrow();
  });

  it('acepta actualización parcial y rechaza un body vacío', () => {
    expect(
      updateOfferSchema.parse({ title: 'Nuevo título', seniority: 'SENIOR' }),
    ).toEqual({ title: 'Nuevo título', seniority: 'SENIOR' });
    expect(updateOfferSchema.safeParse({}).success).toBe(false);
    expect(() => updateOfferSchema.parse({ status: 'CLOSED' })).toThrow();
  });

  it('valida estados, filtros e identificadores UUID', () => {
    expect(changeOfferStatusSchema.parse({ status: 'PAUSED' })).toEqual({
      status: 'PAUSED',
    });
    expect(() => changeOfferStatusSchema.parse({ status: 'DELETED' })).toThrow();

    expect(
      offerFiltersSchema.parse({
        category: 'ADMINISTRATION',
        seniority: 'SENIOR',
        workMode: 'HYBRID',
        workday: 'PART_TIME',
        contractType: 'INTERNSHIP',
      }),
    ).toEqual({
      category: 'ADMINISTRATION',
      seniority: 'SENIOR',
      workMode: 'HYBRID',
      workday: 'PART_TIME',
      contractType: 'INTERNSHIP',
    });
    expect(() =>
      offerFiltersSchema.parse({ contractType: 'DESCONOCIDO' }),
    ).toThrow();

    const id = randomUUID();
    expect(offerIdParamSchema.parse({ id })).toEqual({ id });
    expect(() => offerIdParamSchema.parse({ id: 'no-uuid' })).toThrow();
  });
});
