import { Request, Response, NextFunction } from 'express';
import { CalendarioService } from '@services/calendario.service';
import { OperationalError } from '@middleware/errorHandler';

const calendarioService = new CalendarioService();

export class CalendarioController {
  // POST /api/calendario - Crear día especial (festivo/no laborable)
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const { fecha, tipo, nombre, empleadosExceptuadosIds } = req.body;

      if (!fecha || !tipo || !nombre) {
        throw new OperationalError(400, 'Fecha, tipo y nombre son requeridos');
      }

      if (tipo !== 'festivo' && tipo !== 'no_laborable') {
        throw new OperationalError(400, "Tipo inválido, debe ser 'festivo' o 'no_laborable'");
      }

      const dia = await calendarioService.crearDia(
        fecha,
        tipo,
        nombre,
        Array.isArray(empleadosExceptuadosIds) ? empleadosExceptuadosIds.map((id: any) => parseInt(id, 10)) : undefined,
      );

      return res.status(201).json({ mensaje: 'Día especial creado exitosamente', data: dia });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/calendario?anio=2026 - Listar días especiales de un año
  async listarPorAnio(req: Request, res: Response, next: NextFunction) {
    try {
      const anio = parseInt(req.query.anio as string, 10) || new Date().getFullYear();
      const dias = await calendarioService.listarPorAnio(anio);

      return res.status(200).json({ mensaje: 'Días especiales obtenidos exitosamente', data: dias });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/calendario/proximos-eventos - Próximos festivos/no laborables/trámites aprobados
  async obtenerProximosEventos(req: Request, res: Response, next: NextFunction) {
    try {
      const limite = parseInt(req.query.limite as string, 10) || 10;
      const eventos = await calendarioService.obtenerProximosEventos(limite);

      return res.status(200).json({ mensaje: 'Próximos eventos obtenidos exitosamente', data: eventos });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/calendario/:id - Eliminar día especial
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await calendarioService.eliminarDia(parseInt(String(id)));

      return res.status(200).json({ mensaje: 'Día especial eliminado exitosamente', data: { id: parseInt(String(id)) } });
    } catch (error) {
      next(error);
    }
  }
}
