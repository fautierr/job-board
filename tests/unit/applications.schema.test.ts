import { describe, expect, it } from 'vitest';
import { createApplicationSchema } from '../../src/modules/applications/applications.schema';

describe('applications schema', () => {
  it('acepta y normaliza una postulación válida', () => {
    expect(
      createApplicationSchema.parse({
        candidateName: '  Ana Pérez  ',
        phone: '  +5491112345678  ',
      }),
    ).toEqual({
      candidateName: 'Ana Pérez',
      phone: '+5491112345678',
    });
  });

  it('rechaza campos vacíos y fuera de longitud', () => {
    expect(() =>
      createApplicationSchema.parse({ candidateName: '', phone: '123' }),
    ).toThrow();
    expect(() =>
      createApplicationSchema.parse({ candidateName: 'Ana', phone: '' }),
    ).toThrow();
    expect(() =>
      createApplicationSchema.parse({
        candidateName: 'x'.repeat(121),
        phone: '123',
      }),
    ).toThrow();
    expect(() =>
      createApplicationSchema.parse({
        candidateName: 'Ana',
        phone: 'x'.repeat(51),
      }),
    ).toThrow();
  });

  it('rechaza candidateId, offerId y campos extra', () => {
    const base = { candidateName: 'Ana', phone: '123' };

    expect(() =>
      createApplicationSchema.parse({ ...base, candidateId: 'candidate-1' }),
    ).toThrow();
    expect(() =>
      createApplicationSchema.parse({ ...base, offerId: 'offer-1' }),
    ).toThrow();
    expect(() =>
      createApplicationSchema.parse({ ...base, status: 'PUBLISHED' }),
    ).toThrow();
  });
});
