import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/users/users.repository', () => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
}));

import { login, register } from '../../src/modules/auth/auth.service';
import { hashPassword } from '../../src/modules/auth/password';
import type { User } from '../../src/modules/users/users.entity';
import {
  create,
  findByEmail,
} from '../../src/modules/users/users.repository';

const mockedFindByEmail = vi.mocked(findByEmail);
const mockedCreate = vi.mocked(create);

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'usuario@example.com',
    passwordHash: 'hash',
    role: 'CANDIDATE',
    companyName: null,
    createdAt: new Date(),
    offers: [],
    applications: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('auth.service', () => {
  it('registra un usuario y devuelve token sin datos sensibles', async () => {
    mockedFindByEmail.mockResolvedValue(null);
    mockedCreate.mockImplementation(async (data) =>
      makeUser({
        id: 'user-1',
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      }),
    );

    const result = await register({
      email: 'usuario@example.com',
      password: 'password123',
      role: 'EMPLOYER',
      companyName: 'Acme S.A.',
    });

    expect(result.token).toEqual(expect.any(String));
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'usuario@example.com',
      role: 'EMPLOYER',
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'usuario@example.com',
        role: 'EMPLOYER',
        companyName: 'Acme S.A.',
      }),
    );
    expect(mockedCreate.mock.calls[0]?.[0].passwordHash).not.toBe('password123');
  });

  it('persiste companyName en null para CANDIDATE', async () => {
    mockedFindByEmail.mockResolvedValue(null);
    mockedCreate.mockImplementation(async (data) =>
      makeUser({
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        companyName: data.companyName,
      }),
    );

    await register({
      email: 'persona@example.com',
      password: 'password123',
      role: 'CANDIDATE',
    });

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'CANDIDATE',
        companyName: null,
      }),
    );
  });

  it('rechaza email duplicado antes de crear el usuario', async () => {
    mockedFindByEmail.mockResolvedValue(makeUser());

    await expect(
      register({
        email: 'usuario@example.com',
        password: 'password123',
        role: 'CANDIDATE',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
    });
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('traduce la violación UNIQUE de la BD a conflicto', async () => {
    mockedFindByEmail.mockResolvedValue(null);
    mockedCreate.mockRejectedValue({ code: '23505' });

    await expect(
      register({
        email: 'usuario@example.com',
        password: 'password123',
        role: 'CANDIDATE',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'EMAIL_ALREADY_EXISTS' });
  });

  it('hace login correcto', async () => {
    const passwordHash = await hashPassword('password123');
    mockedFindByEmail.mockResolvedValue(makeUser({ passwordHash }));

    const result = await login({
      email: 'usuario@example.com',
      password: 'password123',
    });

    expect(result.user.role).toBe('CANDIDATE');
    expect(result.token).toEqual(expect.any(String));
  });

  it('rechaza contraseña incorrecta con error genérico', async () => {
    const passwordHash = await hashPassword('password-correcta');
    mockedFindByEmail.mockResolvedValue(makeUser({ passwordHash }));

    await expect(
      login({ email: 'usuario@example.com', password: 'password-incorrecta' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciales inválidas',
    });
  });

  it('rechaza email inexistente con el mismo error genérico', async () => {
    mockedFindByEmail.mockResolvedValue(null);

    await expect(
      login({ email: 'ausente@example.com', password: 'password123' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciales inválidas',
    });
  });
});
