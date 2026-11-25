import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../../src/modules/auth/auth.schema';

describe('auth schemas', () => {
  it('normaliza el email y acepta un registro válido', () => {
    const parsed = registerSchema.parse({
      email: '  Usuario@Example.COM ',
      password: 'password123',
      role: 'EMPLOYER',
    });

    expect(parsed).toEqual({
      email: 'usuario@example.com',
      password: 'password123',
      role: 'EMPLOYER',
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

  it('acepta login con cualquier password no vacío', () => {
    expect(
      loginSchema.parse({ email: 'usuario@example.com', password: 'x' }),
    ).toEqual({ email: 'usuario@example.com', password: 'x' });
  });

  it('rechaza login sin password', () => {
    expect(() => loginSchema.parse({ email: 'usuario@example.com' })).toThrow();
  });
});
