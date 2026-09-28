import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/, 'Alphanumeric and underscore only'),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  distributorId: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const placeOrderSchema = z.object({
  serviceId: z.string().min(1),
  link: z.string().url('Enter a valid URL'),
  quantity: z.coerce.number().int().positive(),
  runs: z.coerce.number().int().positive().optional(),
  interval: z.coerce.number().int().positive().optional(),
  comments: z.string().max(2000).optional(),
});
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
