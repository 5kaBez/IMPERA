import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'impera-secret-change-in-production';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Требуется авторизация' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

// Middleware to check if user is banned (use after authMiddleware)
export async function banCheckMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) { next(); return; }
  try {
    const prisma: PrismaClient = req.app.locals.prisma;
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { banned: true } });
    if (user?.banned) {
      res.status(403).json({ error: 'Ваш аккаунт заблокирован', banned: true });
      return;
    }
    next();
  } catch {
    next();
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Доступ запрещён' });
    return;
  }
  next();
}
