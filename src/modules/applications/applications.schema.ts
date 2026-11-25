import { z } from 'zod';

export const createApplicationSchema = z
  .object({
    candidateName: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(1).max(50),
  })
  .strict();

export type CreateApplicationDto = z.infer<typeof createApplicationSchema>;
