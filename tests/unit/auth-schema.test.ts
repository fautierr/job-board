import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../../src/modules/auth/auth.schema';

describe('auth schemas', () => {
  it('normaliza el email y acepta un registro válido', () => {
    const parsed = registerSchema.parse({
      email: '  Usuario@Example.COM ',
      password: 'password123',
      role: 'EMPLOYER',
      companyName: '  Acme S.A.  ',
    });

    expect(parsed).toEqual({
      email: 'usuario@example.com',
      password: 'password123',
      role: 'EMPLOYER',
      companyName: 'Acme S.A.',
    });
  });

  it('rechaza email inválido, password corto y rol desconocido', () => {
    expect(() =>
      registerSchema.parse({
        email: 'no-es-email',
        password: 'corto',
        role: 'ADMIN',
      }),
    ).toThrow();
  });

  it('exige companyName no vacío y con longitud máxima para EMPLOYER', () => {
    const base = {
      email: 'empresa@example.com',
      password: 'password123',
      role: 'EMPLOYER',
    };

    expect(() => registerSchema.parse(base)).toThrow();
    expect(() => registerSchema.parse({ ...base, companyName: '   ' })).toThrow();
    expect(() =>
      registerSchema.parse({ ...base, companyName: 'x'.repeat(121) }),
    ).toThrow();
  });

  it('rechaza companyName en el registro de CANDIDATE', () => {
    expect(() =>
      registerSchema.parse({
        email: 'persona@example.com',
        password: 'password123',
        role: 'CANDIDATE',
        companyName: 'Acme S.A.',
      }),
    ).toThrow();
  });

  it('acepta login con cualquier password no vacío', () => {
    expect(
      loginSchema.parse({ email: 'usuario@example.com', password: 'x' }),
    ).toEqual({ email: 'usuario@example.com', password: 'x' });
  });

  it('rechaza login sin password', () => {
    expect(() => loginSchema.parse({ email: 'usuario@example.com' })).toThrow();
  });
});
