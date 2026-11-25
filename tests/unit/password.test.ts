import { describe, expect, it } from 'vitest';
import { comparePassword, hashPassword } from '../../src/modules/auth/password';

describe('password', () => {
  it('genera un hash distinto del plaintext y lo compara correctamente', async () => {
    const plain = 'password-de-prueba';
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(await comparePassword(plain, hash)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('password-correcta');

    expect(await comparePassword('password-incorrecta', hash)).toBe(false);
  });
});
