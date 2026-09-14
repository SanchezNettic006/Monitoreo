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
  let mensaje = err.message;

  // Errores de Multer (subida de archivos) llegan aquí con su propio 'code'
  // en vez de un mensaje pensado para mostrarse al usuario; se traducen a
  // algo legible en español.
  if ((err as any).code === 'LIMIT_FILE_SIZE') {
    err.statusCode = 400;
    const maxMb = Math.round(parseInt(process.env.MAX_FILE_SIZE || '15728640', 10) / (1024 * 1024));
    mensaje = `La foto pesa demasiado (máximo ${maxMb}MB). Intenta con menor calidad o resolución.`;
  } else if ((err as any).code === 'LIMIT_UNEXPECTED_FILE') {
    err.statusCode = 400;
    mensaje = 'Se enviaron demasiadas fotos o un campo de archivo inesperado.';
  }

  const response = {
    status: err.statusCode,
    message: mensaje,
    // El frontend lee 'mensaje' (en español) para mostrar el error al usuario;
    // se duplica aquí para no depender de que cada pantalla use el nombre correcto.
    mensaje,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  console.error(`[ERROR] ${err.statusCode} - ${mensaje}`);

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
