import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, UserRole } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_jwt_secret_football_auction_2026_key';

export interface AuthPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const decoded = verifyToken(token);
    const user = await db.users.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
    next();
  } catch (error: any) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access requires ${roles.join(' or ')} role` });
    }
    next();
  };
}
