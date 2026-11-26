import { AppDataSource } from '../../db/data-source';
import type { OfferStatus } from '../../shared/constants/work-offer-values';
import { Offer } from './offers.entity';
import type {
  CreateOfferDto,
  OfferFilters,
  UpdateOfferDto,
} from './offers.schema';

const repository = () => AppDataSource.getRepository(Offer);

export interface CreateOfferData extends CreateOfferDto {
  employerId: string;
  status: OfferStatus;
}

export async function create(data: CreateOfferData): Promise<Offer> {
  const offer = repository().create({
    employerId: data.employerId,
    title: data.title,
    description: data.description,
    category: data.category,
    seniority: data.seniority,
    workMode: data.workMode,
    workday: data.workday,
    contractType: data.contractType,
    status: data.status,
  });

  return repository().save(offer);
}

export interface PublishedOffersResult {
  offers: Offer[];
  total: number;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function findPublished(
  filters: OfferFilters,
): Promise<PublishedOffersResult> {
  const query = repository()
    .createQueryBuilder('offer')
    .innerJoinAndSelect('offer.employer', 'employer')
    .where('offer.status = :status', { status: 'PUBLISHED' });

  if (filters.category) {
    query.andWhere('offer.category = :category', { category: filters.category });
  }
  if (filters.seniority) {
    query.andWhere('offer.seniority = :seniority', { seniority: filters.seniority });
  }
  if (filters.workMode) {
    query.andWhere('offer.workMode = :workMode', { workMode: filters.workMode });
  }
  if (filters.workday) {
    query.andWhere('offer.workday = :workday', { workday: filters.workday });
  }
  if (filters.contractType) {
    query.andWhere('offer.contractType = :contractType', {
      contractType: filters.contractType,
    });
  }
  if (filters.q) {
    query.andWhere(
      '(offer.title ILIKE :q OR offer.description ILIKE :q OR employer.companyName ILIKE :q)',
      { q: `%${escapeLike(filters.q)}%` },
    );
  }

  const [offers, total] = await query
    .orderBy('offer.createdAt', 'DESC')
    .skip((filters.page - 1) * filters.limit)
    .take(filters.limit)
    .getManyAndCount();

  return { offers, total };
}

export async function findPublishedById(id: string): Promise<Offer | null> {
  return repository().findOne({
    where: { id, status: 'PUBLISHED' },
    relations: { employer: true },
  });
}

export async function findOwnedById(
  id: string,
  employerId: string,
): Promise<Offer | null> {
  return repository().findOne({ where: { id, employerId } });
}

export async function findByEmployerId(employerId: string): Promise<Offer[]> {
  return repository().find({
    where: { employerId },
    order: { createdAt: 'DESC' },
  });
}

export async function updateOwned(
  id: string,
  employerId: string,
  patch: UpdateOfferDto | { status: OfferStatus },
): Promise<Offer | null> {
  const result = await repository()
    .createQueryBuilder()
    .update(Offer)
    .set({ ...patch, updatedAt: new Date() })
    .where('id = :id AND employer_id = :employerId', { id, employerId })
    .execute();

  if (result.affected !== 1) {
    return null;
  }

  return findOwnedById(id, employerId);
}
