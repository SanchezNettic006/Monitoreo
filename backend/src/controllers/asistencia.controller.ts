import { Request, Response, NextFunction } from 'express';
import { AsistenciaService } from '@services/asistencia.service';
import { EmpleadoService } from '@services/empleado.service';
import { GrupoService } from '@services/grupo.service';

const asistenciaService = new AsistenciaService();
const empleadoService = new EmpleadoService();
const grupoService = new GrupoService();

export class AsistenciaController {
  async registrarEntrada(req: any, res: Response, next: NextFunction) {
    try {
      let gps = req.body.gps;
      
      // Si gps es string (FormData), parsearlo
      if (typeof gps === 'string') {
        gps = JSON.parse(gps);
      }
      
      const fotaPath = req.file?.path || null;

      // El GPS es opcional: si el técnico no logró un fix a tiempo, puede
      // continuar sin ubicación (ver "Continuar sin GPS" en el frontend)
      // en vez de quedar bloqueado sin poder registrar su entrada.
      const gpsValido = gps && gps.latitud !== undefined && gps.longitud !== undefined ? gps : null;

      const resultado = await asistenciaService.registrarEntrada(
        req.userId,
        gpsValido,
        fotaPath,
        req.body.capturadoEn,
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

      // GPS opcional (ver nota en registrarEntrada)
      const gpsValido = gps && gps.latitud !== undefined && gps.longitud !== undefined ? gps : null;

      const resultado = await asistenciaService.registrarSalida(
        req.userId,
        gpsValido,
        fotaPath,
        req.body.capturadoEn,
      );

      return res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async guardarReporteCierre(req: any, res: Response, next: NextFunction) {
    try {
      const { recordId, descripcion, proyectoTrabajado } = req.body;
      const fotoPaths = (req.files as Express.Multer.File[] | undefined)?.map((f) => f.path) || [];

      if (!recordId) {
        return res.status(400).json({ mensaje: 'recordId es requerido' });
      }

      const resultado = await asistenciaService.guardarReporteCierre(
        req.userId,
        parseInt(recordId, 10),
        descripcion,
        fotoPaths,
        proyectoTrabajado,
      );

      return res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obtenerMisProyectos(req: any, res: Response, next: NextFunction) {
    try {
      const proyectos = await grupoService.obtenerProyectosDeMiGrupo(req.userId);
      return res.status(200).json({ data: proyectos });
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

  async iniciarPausa(req: any, res: Response, next: NextFunction) {
    try {
      const { recordId, tipoPausa } = req.body;

      if (!recordId || !tipoPausa) {
        return res.status(400).json({
          mensaje: 'recordId y tipoPausa son requeridos',
        });
      }

      const resultado = await asistenciaService.iniciarPausa(recordId, tipoPausa);

      return res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async finalizarPausa(req: any, res: Response, next: NextFunction) {
    try {
      const { recordId } = req.body;

      if (!recordId) {
        return res.status(400).json({
          mensaje: 'recordId es requerido',
        });
      }

      const resultado = await asistenciaService.finalizarPausa(recordId);

      return res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obtenerPausas(req: any, res: Response, next: NextFunction) {
    try {
      const { recordId } = req.params;

      const resultado = await asistenciaService.obtenerPausas(parseInt(recordId));

      return res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
}
