import { ConflictError, UnauthorizedError } from '../../shared/errors';
import type { UserRole } from '../../shared/constants/work-offer-values';
import * as usersRepository from '../users/users.repository';
import type { LoginDto, RegisterDto } from './auth.schema';
import { comparePassword, hashPassword } from './password';
import { signToken } from './token';

interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthResult {
  token: string;
  user: PublicUser;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

function toPublicUser(user: {
  id: string;
  email: string;
  role: UserRole;
}): PublicUser {
  return { id: user.id, email: user.email, role: user.role };
}

export async function register(dto: RegisterDto): Promise<AuthResult> {
  const existing = await usersRepository.findByEmail(dto.email);
  if (existing) {
    throw new ConflictError('El email ya está registrado', 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await hashPassword(dto.password);

  let user;
  try {
    user = await usersRepository.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      companyName: dto.role === 'EMPLOYER' ? dto.companyName : null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError('El email ya está registrado', 'EMAIL_ALREADY_EXISTS');
    }
    throw error;
  }

  return {
    token: signToken({ sub: user.id, role: user.role }),
    user: toPublicUser(user),
  };
}

export async function login(dto: LoginDto): Promise<AuthResult> {
  const user = await usersRepository.findByEmail(dto.email);
  const passwordMatches = user
    ? await comparePassword(dto.password, user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    throw new UnauthorizedError('Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

  return {
    token: signToken({ sub: user.id, role: user.role }),
    user: toPublicUser(user),
  };
}
