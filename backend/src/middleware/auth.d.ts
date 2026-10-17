/**
 * Type declarations for auth.js middleware
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void;

export function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void;

export function generateToken(userId: string): string;

export function verifyToken(token: string): Promise<any>;

