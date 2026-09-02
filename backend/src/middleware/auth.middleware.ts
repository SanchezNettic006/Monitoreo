import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@config/env';
import { AppDataSource } from '@config/database';
import { Empleado } from '@entities/Empleado';
import { LiderDepartamentoExtra } from '@entities/LiderDepartamentoExtra';
import { OperationalError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: number;
  user?: any;
  /**
   * Solo se define cuando el usuario es 'lider': departamento(s) a los que debe
   * restringirse. Normalmente es solo el suyo propio, pero un líder puede
   * supervisar departamentos adicionales (ver lider_departamento_extra), así
   * que siempre es un arreglo aunque tenga un solo elemento.
   */
  departamentoId?: number[];
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

/** Requiere que authMiddleware se haya ejecutado antes; restringe a usuarios con rol 'admin' */
export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.rol !== 'admin') {
    return next(new OperationalError(403, 'No tienes permisos para realizar esta acción'));
  }
  next();
};

/** Requiere que authMiddleware se haya ejecutado antes; permite 'admin' o 'lider' */
export const liderOAdminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.rol !== 'admin' && req.user?.rol !== 'lider') {
    return next(new OperationalError(403, 'No tienes permisos para realizar esta acción'));
  }
  next();
};

/**
 * Requiere que authMiddleware se haya ejecutado antes. Si el usuario es 'lider',
 * resuelve el departamento de su empleado asociado y lo deja en req.departamentoId,
 * para que los controladores fuercen ese filtro y el líder no pueda ver otros
 * departamentos aunque lo intente por query params. Para 'admin' no restringe nada.
 */
export const cargarDepartamentoLider = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.rol !== 'lider') {
    return next();
  }

  try {
    const empleadoRepository = AppDataSource.getRepository(Empleado);
    const empleado = await empleadoRepository.findOne({
      where: { usuario_id: req.userId },
    });

    if (!empleado || !empleado.departamento_id) {
      return next(new OperationalError(403, 'Tu usuario líder no tiene un departamento asignado'));
    }

    const extraRepository = AppDataSource.getRepository(LiderDepartamentoExtra);
    const extras = await extraRepository.find({ where: { usuario_id: req.userId } });

    req.departamentoId = [empleado.departamento_id, ...extras.map((e) => e.departamento_id)];
    next();
  } catch (error) {
    next(error);
  }
};
