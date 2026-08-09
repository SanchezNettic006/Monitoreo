import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  err.statusCode = err.statusCode || 500;

  const response = {
    status: err.statusCode,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  console.error(`[ERROR] ${err.statusCode} - ${err.message}`);

  res.status(err.statusCode).json(response);
};

// Clase para errores operacionales
export class OperationalError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  isOperational = true;
}
