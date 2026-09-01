import { Response, NextFunction } from 'express';
import { SolicitudService } from '@services/solicitud.service';
import { AuthRequest } from '@middleware/auth.middleware';

const solicitudService = new SolicitudService();

export class SolicitudController {
  /**
   * POST /api/solicitudes/crear
   * Crear nueva solicitud de trámite
   */
  async crear(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { tipo, fecha_inicio, fecha_fin, dias_solicitados, motivo, descripcion } = req.body;

      if (!tipo || !fecha_inicio) {
        return res.status(400).json({
          exitoso: false,
          mensaje: 'Faltan campos: tipo, fecha_inicio',
        });
      }

      const solicitud = await solicitudService.crearSolicitudDesdeUsuario(req.userId!, {
        tipo,
        fecha_inicio,
        fecha_fin: fecha_fin || undefined,
        dias_solicitados,
        motivo,
        descripcion,
      });

      return res.status(201).json({
        exitoso: true,
        data: solicitud,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/solicitudes/mis-solicitudes
   * Obtener mis solicitudes
   */
  async misSolicitudes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const solicitudes = await solicitudService.obtenerMisSolicitudes(req.userId!);

      return res.status(200).json({
        exitoso: true,
        data: solicitudes,
      });
    } catch (error) {
      console.error('❌ [misSolicitudes] Error:', error);
      next(error);
    }
  }

  /**
   * GET /api/solicitudes/pendientes
   * Obtener solicitudes pendientes (admin: todas; líder: solo su departamento)
   */
  async obtenerPendientes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const solicitudes = await solicitudService.obtenerSolicitudesPendientes(req.departamentoId);

      return res.status(200).json({
        exitoso: true,
        data: solicitudes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/solicitudes/aprobadas
   * Obtener solicitudes aprobadas, opcionalmente filtradas por mes de inicio
   * (?mes=YYYY-MM). Admin: todas; líder: solo su departamento.
   */
  async obtenerAprobadas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const mes = typeof req.query.mes === 'string' ? req.query.mes : undefined;
      const solicitudes = await solicitudService.obtenerSolicitudesAprobadas(req.departamentoId, mes);

      return res.status(200).json({
        exitoso: true,
        data: solicitudes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/solicitudes/:id/estado
   * Cambiar estado de una solicitud (admin: cualquiera; líder: solo su departamento)
   */
  async cambiarEstado(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { estado_nuevo, comentario, observacion_admin } = req.body;

      if (!estado_nuevo) {
        return res.status(400).json({
          exitoso: false,
          mensaje: 'Falta el campo: estado_nuevo',
        });
      }

      const solicitud = await solicitudService.cambiarEstado(
        {
          solicitud_id: parseInt(id, 10),
          estado_nuevo,
          comentario,
          usuario_id: req.userId,
          observacion_admin,
        },
        req.departamentoId,
      );

      return res.status(200).json({
        exitoso: true,
        data: solicitud,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/solicitudes/saldo-vacaciones/:empleadoId?anio=
   * Saldo de vacaciones de un empleado (admin/líder, para revisar antes de aprobar)
   */
  async obtenerSaldoVacaciones(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const empleadoId = parseInt(String(req.params.empleadoId), 10);
      const anio = req.query.anio ? parseInt(String(req.query.anio), 10) : undefined;

      const saldo = await solicitudService.obtenerSaldoVacaciones(empleadoId, anio, req.departamentoId);

      return res.status(200).json({ exitoso: true, data: saldo });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/solicitudes/mi-saldo-vacaciones?anio=
   * Saldo de vacaciones del propio usuario logueado
   */
  async obtenerMiSaldoVacaciones(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const empleado = await solicitudService.obtenerEmpleadoPorUsuario(req.userId!);
      if (!empleado) {
        return res.status(404).json({ exitoso: false, mensaje: 'Empleado no encontrado' });
      }

      const anio = req.query.anio ? parseInt(String(req.query.anio), 10) : undefined;
      const saldo = await solicitudService.obtenerSaldoVacaciones(empleado.id, anio);

      return res.status(200).json({ exitoso: true, data: saldo });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/solicitudes/saldos-vacaciones?anio=&departamentoId=
   * Saldo de vacaciones de todos los empleados de un vistazo
   * (admin: todos, opcionalmente filtrado; líder: solo su departamento)
   */
  async obtenerSaldosVacacionesMasivo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const anio = req.query.anio ? parseInt(String(req.query.anio), 10) : undefined;
      const departamentoId = req.departamentoId ?? (req.query.departamentoId ? parseInt(String(req.query.departamentoId), 10) : undefined);

      const saldos = await solicitudService.obtenerSaldosVacacionesMasivo(anio, departamentoId);

      return res.status(200).json({ exitoso: true, data: saldos });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/solicitudes/resumen
   * Obtener resumen de solicitudes
   */
  async resumen(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resumen = await solicitudService.obtenerResumen();

      return res.status(200).json({
        exitoso: true,
        data: resumen,
      });
    } catch (error) {
      next(error);
    }
  }
}
