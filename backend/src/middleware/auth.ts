import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequestUser, UserRole } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'danceflow-dev-secret';

export function signToken(payload: AuthRequestUser): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Требуется авторизация' });
    return;
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthRequestUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Сессия недействительна или истекла' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Требуется авторизация' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Недостаточно прав для этого действия' });
      return;
    }
    next();
  };
}
