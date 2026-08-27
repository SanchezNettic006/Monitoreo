import { Request, Response, NextFunction } from 'express';
import { HoraExtraService } from '@services/horaExtra.service';
import { AuthRequest } from '@middleware/auth.middleware';

const horaExtraService = new HoraExtraService();

export class HoraExtraController {
  /**
   * POST /asistencia/hora-extra/iniciar
   * Iniciar una hora extra con foto
   * Permite crear horas extras sin check-in previo (para domingos, emergencias, etc)
   */
  async iniciar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Desde FormData, los campos vienen en req.body como strings
      const { recordAsistenciaId, numeroTicket, latitud, longitud, capturadoEn } = req.body;
      const fotoPath = req.file?.path; // Ruta del archivo subido

      // Validar campos requeridos (sin recordAsistenciaId, usaremos usuarioId del token)
      // GPS es opcional: si el técnico no logró un fix a tiempo, puede continuar sin ubicación.
      if ((!recordAsistenciaId && !req.userId) || !numeroTicket) {
        return res.status(400).json({
          exitoso: false,
          mensaje: 'Faltan campos requeridos: numeroTicket',
        });
      }

      // Convertir strings a números
      const recordId = recordAsistenciaId ? parseInt(recordAsistenciaId, 10) : null;
      const lat = latitud !== undefined ? parseFloat(latitud) : null;
      const lon = longitud !== undefined ? parseFloat(longitud) : null;

      if ((recordId !== null && isNaN(recordId)) || (lat !== null && isNaN(lat)) || (lon !== null && isNaN(lon))) {
        return res.status(400).json({
          exitoso: false,
          mensaje: 'Los valores numéricos no son válidos',
        });
      }

      // Usar usuarioId del token JWT (req.userId)
      const userId = req.userId;

      // Iniciar hora extra (el servicio se encargará de crear recordAsistencia si es necesario)
      const horaExtra = await horaExtraService.iniciarHoraExtra(
        recordId || undefined,
        numeroTicket,
        lat,
        lon,
        undefined, // No pasar fotoPath aquí
        userId, // Pasar usuarioId extraído del token
        capturadoEn,
      );

      // Guardar foto si existe
      if (fotoPath) {
        await horaExtraService.guardarFotoHoraExtra(horaExtra.id, 'entrada', fotoPath);
      }

      return res.status(201).json({
        exitoso: true,
        data: horaExtra,
      });
    } catch (error) {
      console.error('Error en iniciar hora extra:', error);
      next(error);
    }
  }

  /**
   * POST /asistencia/hora-extra/finalizar
   * Finalizar una hora extra con foto
   */
  async finalizar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Desde FormData, los campos vienen en req.body como strings
      const { horaExtraId, latitud, longitud, capturadoEn } = req.body;
      const fotoPath = req.file?.path; // Ruta del archivo subido

      // Validar campos requeridos (GPS es opcional, ver nota en iniciar())
      if (!horaExtraId) {
        return res.status(400).json({
          exitoso: false,
          mensaje: 'Falta el campo requerido: horaExtraId',
        });
      }

      // Convertir strings a números
      const horaId = parseInt(horaExtraId, 10);
      const lat = latitud !== undefined ? parseFloat(latitud) : null;
      const lon = longitud !== undefined ? parseFloat(longitud) : null;

      if (isNaN(horaId) || (lat !== null && isNaN(lat)) || (lon !== null && isNaN(lon))) {
        return res.status(400).json({
          exitoso: false,
          mensaje: 'Los valores numéricos no son válidos',
        });
      }

      // Finalizar hora extra
      const horaExtra = await horaExtraService.finalizarHoraExtra(
        horaId,
        lat,
        lon,
        fotoPath, // Pasar ruta de foto al servicio
        capturadoEn,
      );

      return res.status(200).json({
        exitoso: true,
        data: horaExtra,
      });
    } catch (error) {
      console.error('Error en finalizar hora extra:', error);
      next(error);
    }
  }

  /**
   * GET /asistencia/hora-extra/activas/:recordAsistenciaId
   * Obtener horas extras activas de un registro
   */
  async obtenerActivas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const recordAsistenciaId = parseInt(String(req.params.recordAsistenciaId));

      if (!recordAsistenciaId) {
        return res.status(400).json({
          exitoso: false,
          mensaje: 'ID de registro requerido',
        });
      }

      const horasExtras = await horaExtraService.obtenerHorasExtrasActivas(recordAsistenciaId);

      return res.status(200).json({
        exitoso: true,
        data: horasExtras,
      });
    } catch (error) {
      console.error('Error al obtener horas extras activas:', error);
      next(error);
    }
  }

  /**
   * GET /asistencia/hora-extra/historial/:recordAsistenciaId
   * Obtener historial de horas extras de un registro
   */
  async obtenerHistorial(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const recordAsistenciaId = parseInt(String(req.params.recordAsistenciaId));

      if (!recordAsistenciaId) {
        return res.status(400).json({
          exitoso: false,
          mensaje: 'ID de registro requerido',
        });
      }

      const horasExtras = await horaExtraService.obtenerHistorial(recordAsistenciaId);

      return res.status(200).json({
        exitoso: true,
        data: horasExtras,
      });
    } catch (error) {
      console.error('Error al obtener historial de horas extras:', error);
      next(error);
    }
  }

  /**
   * GET /asistencia/hora-extra/mi-activa
   * Obtener la hora extra activa del usuario autenticado
   */
  async obtenerMiActiva(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.userId;

      if (!usuarioId) {
        return res.status(401).json({
          exitoso: false,
          mensaje: 'Usuario no autenticado',
        });
      }

      const horaExtra = await horaExtraService.obtenerHoraExtraActivaDelUsuario(usuarioId);

      return res.status(200).json({
        exitoso: true,
        data: horaExtra,
      });
    } catch (error) {
      console.error('Error al obtener mi hora extra activa:', error);
      next(error);
    }
  }

  /**
   * GET /asistencia/hora-extra/todas
   * Obtener todas las horas extras (activas y finalizadas)
   * Admin: todas; líder: solo las de su departamento
   */
  async obtenerTodas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const horasExtras = await horaExtraService.obtenerTodasHorasExtras(req.departamentoId);

      return res.status(200).json({
        exitoso: true,
        data: horasExtras,
      });
    } catch (error) {
      console.error('Error al obtener todas las horas extras:', error);
      next(error);
    }
  }

  /**
   * GET /asistencia/hora-extra/mis-horas-extra
   * Obtener las horas extras del usuario logueado
   */
  async obtenerMisHorasExtras(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const horasExtras = await horaExtraService.obtenerMisHorasExtras(req.userId!);

      return res.status(200).json({
        exitoso: true,
        data: horasExtras,
      });
    } catch (error) {
      console.error('Error al obtener mis horas extras:', error);
      next(error);
    }
  }

  /**
   * PATCH /asistencia/hora-extra/:id/revisar
   * Aprobar (total o parcial) o rechazar las horas de un ticket finalizado (admin)
   */
  async revisar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(String(req.params.id), 10);
      const { horas_aprobadas, motivo } = req.body;

      const horaExtra = await horaExtraService.revisarHoraExtra(
        id,
        req.userId!,
        parseFloat(horas_aprobadas),
        motivo,
      );

      return res.status(200).json({
        exitoso: true,
        data: horaExtra,
      });
    } catch (error) {
      next(error);
    }
  }
}
