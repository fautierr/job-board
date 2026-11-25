import { z } from 'zod';

const email = z.string().trim().toLowerCase().email();

const registerBase = {
  email,
  password: z.string().min(8).max(128),
};

export const registerSchema = z.discriminatedUnion('role', [
  z
    .object({
      ...registerBase,
      role: z.literal('EMPLOYER'),
      companyName: z.string().trim().min(1).max(120),
    })
    .strict(),
  z
    .object({
      ...registerBase,
      role: z.literal('CANDIDATE'),
    })
    .strict(),
]);

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
