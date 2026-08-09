import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@config/env';
import { OperationalError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: number;
  user?: any;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(
      new OperationalError(401, 'Token no proporcionado'),
    );
  }

  try {
    const decoded: any = jwt.verify(token, config.jwt.secret);
    req.userId = decoded.id;
    req.user = decoded;
    next();
  } catch (error) {
    return next(
      new OperationalError(401, 'Token inválido o expirado'),
    );
  }
};
