import { AppDataSource } from '../../db/data-source';
import { Application } from './applications.entity';
import type { CreateApplicationDto } from './applications.schema';

const repository = () => AppDataSource.getRepository(Application);

export interface CreateApplicationData extends CreateApplicationDto {
  offerId: string;
  candidateId: string;
}

export async function create(data: CreateApplicationData): Promise<Application> {
  const application = repository().create({
    offerId: data.offerId,
    candidateId: data.candidateId,
    candidateName: data.candidateName,
    phone: data.phone,
  });

  return repository().save(application);
}

export async function findByOfferId(offerId: string): Promise<Application[]> {
  return repository().find({
    where: { offerId },
    order: { createdAt: 'DESC' },
  });
}

export async function findByCandidateId(
  candidateId: string,
): Promise<Application[]> {
  return repository().find({
    where: { candidateId },
    order: { createdAt: 'DESC' },
  });
}
