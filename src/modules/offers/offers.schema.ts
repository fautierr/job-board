import { z } from 'zod';
import {
  CONTRACT_TYPES,
  JOB_CATEGORIES,
  OFFER_STATUSES,
  SENIORITIES,
  WORKDAYS,
  WORK_MODES,
} from '../../shared/constants/work-offer-values';

const title = z.string().trim().min(1).max(120);
const description = z.string().trim().min(1).max(5000);

const offerFields = z.object({
  title,
  description,
  category: z.enum([...JOB_CATEGORIES]),
  seniority: z.enum([...SENIORITIES]),
  workMode: z.enum([...WORK_MODES]),
  workday: z.enum([...WORKDAYS]),
  contractType: z.enum([...CONTRACT_TYPES]),
});

export const createOfferSchema = offerFields.strict();

export const updateOfferSchema = offerFields.partial().strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Debe enviar al menos un campo' },
);

export const changeOfferStatusSchema = z
  .object({ status: z.enum([...OFFER_STATUSES]) })
  .strict();

export const offerFiltersSchema = z.object({
  category: z.enum([...JOB_CATEGORIES]).optional(),
  seniority: z.enum([...SENIORITIES]).optional(),
  workMode: z.enum([...WORK_MODES]).optional(),
  workday: z.enum([...WORKDAYS]).optional(),
  contractType: z.enum([...CONTRACT_TYPES]).optional(),
});

export const offerIdParamSchema = z.object({ id: z.uuid() }).strict();

export type CreateOfferDto = z.infer<typeof createOfferSchema>;
export type UpdateOfferDto = z.infer<typeof updateOfferSchema>;
export type ChangeOfferStatusDto = z.infer<typeof changeOfferStatusSchema>;
export type OfferFilters = z.infer<typeof offerFiltersSchema>;
