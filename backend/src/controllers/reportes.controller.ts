import { Response, NextFunction } from 'express';
import { ReportesService } from '@services/reportes.service';
import { AuthRequest } from '@middleware/auth.middleware';
import { normalizarFechaParam } from '@utils/fecha.utils';

const reportesService = new ReportesService();

export class ReportesController {
  /**
   * GET /reportes/mis-asistencias
   * Historial de asistencias del usuario logueado (empleado o admin), sin exponer datos de otros
   */
  async obtenerMisAsistencias(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { fechaInicio, fechaFin, page, limit } = req.query;

      const filtros = {
        fechaInicio: normalizarFechaParam(fechaInicio as string),
        fechaFin: normalizarFechaParam(fechaFin as string),
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      };

      const resultado = await reportesService.obtenerMisAsistencias(req.userId!, filtros);

      return res.status(200).json({
        exitoso: true,
        data: resultado.data,
        paginacion: {
          page: resultado.page,
          limit: resultado.limit,
          total: resultado.total,
          pages: resultado.pages,
        },
      });
    } catch (error) {
      console.error('Error en obtenerMisAsistencias:', error);
      next(error);
    }
  }

  /**
   * GET /reportes/asistencias
   * Obtener asistencias con filtros
   */
  async obtenerAsistencias(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { empleadoId, nombreEmpleado, fechaInicio, fechaFin, departamentoId, page, limit } =
        req.query;

      const filtros = {
        empleadoId: empleadoId ? parseInt(empleadoId as string) : undefined,
        nombreEmpleado: nombreEmpleado ? String(nombreEmpleado) : undefined,
        fechaInicio: normalizarFechaParam(fechaInicio as string),
        fechaFin: normalizarFechaParam(fechaFin as string),
        // Si es líder, se ignora cualquier departamentoId de la query y se fuerza el suyo
        departamentoId: req.departamentoId ?? (departamentoId ? parseInt(departamentoId as string) : undefined),
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      };

      const resultado = await reportesService.obtenerAsistencias(filtros);

      return res.status(200).json({
        exitoso: true,
        data: resultado.data,
        paginacion: {
          page: resultado.page,
          limit: resultado.limit,
          total: resultado.total,
          pages: resultado.pages,
        },
      });
    } catch (error) {
      console.error('Error en obtenerAsistencias:', error);
      next(error);
    }
  }

  /**
   * GET /reportes/resumen
   * Obtener estadísticas generales
   */
  async obtenerResumen(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      console.log('Cargando resumen...');
      const resumen = await reportesService.obtenerResumen();
      console.log('Resumen cargado:', resumen);

      return res.status(200).json({
        exitoso: true,
        data: resumen,
      });
    } catch (error) {
      console.error('Error en obtenerResumen:', error);
      next(error);
    }
  }

  /**
   * GET /reportes/empleado/:id
   * Obtener historial de un empleado
   */
  async obtenerHistorialEmpleado(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const meses = req.query.meses ? parseInt(req.query.meses as string) : 3;

      const historial = await reportesService.obtenerHistorialEmpleado(
        parseInt(id),
        meses,
      );

      return res.status(200).json({
        exitoso: true,
        data: historial,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reportes/departamentos
   * Obtener resumen por departamento
   */
  async obtenerPorDepartamento(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const resultado = await reportesService.obtenerPorDepartamento();

      return res.status(200).json({
        exitoso: true,
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reportes/diagnostico (TEMPORAL)
   * Verificar datos en la base de datos
   */
  async diagnostico(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resultado = await reportesService.diagnostico();

      return res.status(200).json({
        exitoso: true,
        data: resultado,
      });
    } catch (error) {
      console.error('Error en diagnostico:', error);
      next(error);
    }
  }

  /**
   * GET /reportes/cumplimiento?mes=YYYY-MM&departamentoId=
   * % de días laborables del mes con reporte (check-out) enviado, por departamento y empleado
   */
  async obtenerCumplimiento(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const departamentoId = req.query.departamentoId ? parseInt(String(req.query.departamentoId), 10) : undefined;

      const resultado = await reportesService.obtenerCumplimientoReportes(mes, departamentoId);

      return res.status(200).json({ exitoso: true, data: resultado });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reportes/cumplimiento/:empleadoId?mes=YYYY-MM
   * Detalle día por día del cumplimiento de un empleado en un mes
   */
  async obtenerDetalleCumplimientoEmpleado(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const empleadoId = parseInt(String(req.params.empleadoId), 10);
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);

      const resultado = await reportesService.obtenerDetalleCumplimientoEmpleado(empleadoId, mes);

      return res.status(200).json({ exitoso: true, data: resultado });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reportes/horas-aprobadas?mes=YYYY-MM&departamentoId=
   * Total de horas extra aprobadas (total o parcial) del mes, por departamento y técnico
   * (admin: todos los departamentos; líder: solo el suyo)
   */
  async obtenerHorasAprobadas(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const departamentoId = req.departamentoId ?? (req.query.departamentoId ? parseInt(String(req.query.departamentoId), 10) : undefined);

      const resultado = await reportesService.obtenerHorasAprobadas(mes, departamentoId);

      return res.status(200).json({ exitoso: true, data: resultado });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /reportes/recalcular-horas (ADMIN ONLY)
   * Recalcular horas trabajadas basado en check-in/check-out
   */
  async recalcularHoras(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resultado = await reportesService.recalcularHoras();

      return res.status(200).json({
        exitoso: true,
        mensaje: 'Horas recalculadas correctamente',
        data: resultado,
      });
    } catch (error) {
      console.error('Error recalculando horas:', error);
      next(error);
    }
  }
}
