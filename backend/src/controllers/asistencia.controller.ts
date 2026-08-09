import { Request, Response, NextFunction } from 'express';
import { AsistenciaService } from '@services/asistencia.service';
import { EmpleadoService } from '@services/empleado.service';

const asistenciaService = new AsistenciaService();
const empleadoService = new EmpleadoService();

export class AsistenciaController {
  async registrarEntrada(req: any, res: Response, next: NextFunction) {
    try {
      let gps = req.body.gps;
      
      // Si gps es string (FormData), parsearlo
      if (typeof gps === 'string') {
        gps = JSON.parse(gps);
      }
      
      const fotaPath = req.file?.path || null;

      if (!gps || !gps.latitud || !gps.longitud) {
        return res.status(400).json({
          mensaje: 'GPS (latitud y longitud) es requerido',
        });
      }

      const resultado = await asistenciaService.registrarEntrada(
        req.userId,
        gps,
        fotaPath,
      );

      return res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async registrarSalida(req: any, res: Response, next: NextFunction) {
    try {
      let gps = req.body.gps;
      
      // Si gps es string (FormData), parsearlo
      if (typeof gps === 'string') {
        gps = JSON.parse(gps);
      }
      
      const fotaPath = req.file?.path || null;

      if (!gps || !gps.latitud || !gps.longitud) {
        return res.status(400).json({
          mensaje: 'GPS (latitud y longitud) es requerido',
        });
      }

      const resultado = await asistenciaService.registrarSalida(
        req.userId,
        gps,
        fotaPath,
      );

      return res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obtenerRegistrosEmpleado(req: any, res: Response, next: NextFunction) {
    try {
      const empleadoId = req.params.empleadoId || req.userId;
      const { desde, hasta } = req.query;

      const desdeDate = desde ? new Date(desde) : undefined;
      const hastaDate = hasta ? new Date(hasta) : undefined;

      const registros = await asistenciaService.obtenerRegistros(
        parseInt(empleadoId),
        desdeDate,
        hastaDate,
      );

      return res.status(200).json({
        data: registros,
      });
    } catch (error) {
      next(error);
    }
  }

  async obtenerRegistroHoy(req: any, res: Response, next: NextFunction) {
    try {
      const resultado = await asistenciaService.obtenerRegistroHoy(req.userId);

      return res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obtenerResumen(req: any, res: Response, next: NextFunction) {
    try {
      const resultado = await asistenciaService.obtenerResumen(req.userId);

      return res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
}
