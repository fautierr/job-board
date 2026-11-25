import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { getEnv } from '../../src/config/env';
import { signToken, verifyToken } from '../../src/modules/auth/token';

describe('token', () => {
  it('firma y verifica un token válido', () => {
    const token = signToken({ sub: 'user-1', role: 'CANDIDATE' });

    expect(verifyToken(token)).toEqual({ sub: 'user-1', role: 'CANDIDATE' });
  });

  it('rechaza un token alterado', () => {
    const token = signToken({ sub: 'user-1', role: 'CANDIDATE' });

    expect(() => verifyToken(`${token}x`)).toThrow();
  });

  it('rechaza un token expirado', () => {
    const expired = jwt.sign(
      { sub: 'user-1', role: 'CANDIDATE' },
      getEnv().JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '-1s' },
    );

    expect(() => verifyToken(expired)).toThrow();
  });

  it('rechaza un token firmado con otro secreto', () => {
    const other = jwt.sign(
      { sub: 'user-1', role: 'CANDIDATE' },
      'otro-secreto-de-prueba',
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    expect(() => verifyToken(other)).toThrow();
  });
});
