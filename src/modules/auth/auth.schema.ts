import { z } from 'zod';
import { USER_ROLES } from '../../shared/constants/work-offer-values';

const email = z.string().trim().toLowerCase().email();

export const registerSchema = z.object({
  email,
  password: z.string().min(8).max(128),
  role: z.enum([...USER_ROLES]),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
