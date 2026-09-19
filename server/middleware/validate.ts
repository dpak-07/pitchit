import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      next(error);
    }
  };
}

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['auctioneer', 'player']),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createAuctionSchema = z.object({
  name: z.string().min(3, 'Auction name must be at least 3 characters'),
  scheduledAt: z.string().optional().or(z.date().optional()),
  mode: z.enum(['live', 'manual']),
  purse: z.number().min(10, 'Purse must be at least 10'),
  squadMin: z.number().min(2, 'Min squad must be at least 2'),
  squadMax: z.number().min(2, 'Max squad must be at least min squad'),
  yearFrom: z.number().min(1950).max(2030),
  yearTo: z.number().min(1950).max(2030),
  basePrice: z.number().min(1, 'Base price must be at least 1'),
  increment: z.number().min(1, 'Increment must be at least 1'),
  timerSeconds: z.number().min(5, 'Timer must be at least 5 seconds').max(120),
  maxTeams: z.number().min(2, 'Max teams must be at least 2').max(32),
}).refine(data => data.squadMax >= data.squadMin, {
  message: 'Max squad must be greater than or equal to min squad',
  path: ['squadMax'],
}).refine(data => data.yearTo >= data.yearFrom, {
  message: 'Year To must be greater than or equal to Year From',
  path: ['yearTo'],
});

export const joinAuctionSchema = z.object({
  roomCode: z.string().min(4, 'Room code is required').max(10),
  teamName: z.string().min(2, 'Team name must be at least 2 characters').max(30),
  color: z.string().optional(),
  logo: z.string().optional(),
});

export const manualSellSchema = z.object({
  unsold: z.boolean().optional(),
  teamId: z.string().optional(),
  amount: z.number().optional(),
});
