import { AppDataSource } from '../../db/data-source';
import type { UserRole } from '../../shared/constants/work-offer-values';
import { User } from './users.entity';

const repository = () => AppDataSource.getRepository(User);

export async function findByEmail(email: string): Promise<User | null> {
  return repository().findOne({ where: { email } });
}

export async function findById(id: string): Promise<User | null> {
  return repository().findOne({ where: { id } });
}

export async function create(data: {
  email: string;
  passwordHash: string;
  role: UserRole;
}): Promise<User> {
  const user = repository().create(data);
  return repository().save(user);
}
