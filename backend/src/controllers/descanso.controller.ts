import { Response, NextFunction } from 'express';
import { AuthRequest } from '@middleware/auth.middleware';
import { descansoService } from '@services/descanso.service';
import { OperationalError } from '@middleware/errorHandler';

export class DescansoController {
  // GET /api/descansos?mes=YYYY-MM
  async listar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const mes = String(req.query.mes || '');
      if (!/^\d{4}-\d{2}$/.test(mes)) {
        throw new OperationalError(400, 'Parámetro mes inválido, se espera YYYY-MM');
      }

      const descansos = await descansoService.listarPorDepartamentos(req.departamentoId, mes);

      return res.status(200).json({
        exitoso: true,
        data: descansos.map((d) => ({
          id: d.id,
          empleado_id: d.empleado_id,
          empleado_nombre: d.empleado ? `${d.empleado.nombre} ${d.empleado.apellido}` : '-',
          fecha: d.fecha,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/descansos/empleados - empleados de mi equipo, para elegir a quién marcarle descanso
  async listarEmpleados(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const empleados = await descansoService.listarEmpleadosDeDepartamentos(req.departamentoId);

      return res.status(200).json({
        exitoso: true,
        data: empleados.map((e) => ({ id: e.id, nombre: `${e.nombre} ${e.apellido}` })),
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/descansos { empleado_id, fecha }
  async crear(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { empleado_id, fecha } = req.body;
      if (!empleado_id || !fecha) {
        throw new OperationalError(400, 'empleado_id y fecha son requeridos');
      }

      const descanso = await descansoService.crear(
        Number(empleado_id),
        String(fecha).slice(0, 10),
        req.departamentoId,
        req.userId!,
      );

      return res.status(201).json({ exitoso: true, data: descanso });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/descansos/:id
  async eliminar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const resultado = await descansoService.eliminar(Number(id), req.departamentoId);

      return res.status(200).json({ exitoso: true, data: resultado });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/descansos/hoy
  async hoy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const descansos = await descansoService.obtenerDescansosHoy();

      return res.status(200).json({ exitoso: true, data: descansos });
    } catch (error) {
      next(error);
    }
  }
}

export const descansoController = new DescansoController();
