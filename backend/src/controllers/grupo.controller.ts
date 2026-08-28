import { Response, NextFunction } from 'express';
import { GrupoService } from '@services/grupo.service';
import { AuthRequest } from '@middleware/auth.middleware';

const grupoService = new GrupoService();

export class GrupoController {
  async crear(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { nombre, departamentoId } = req.body;
      const departamentoFinal = req.departamentoId ?? departamentoId;

      if (!departamentoFinal) {
        return res.status(400).json({ mensaje: 'departamentoId es requerido' });
      }

      const grupo = await grupoService.crearGrupo(nombre, departamentoFinal);
      return res.status(201).json({ data: grupo });
    } catch (error) {
      next(error);
    }
  }

  async obtenerTodos(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const departamentoId = req.departamentoId ?? (req.query.departamentoId ? parseInt(String(req.query.departamentoId), 10) : undefined);
      const grupos = await grupoService.obtenerGrupos(departamentoId);
      return res.status(200).json({ data: grupos });
    } catch (error) {
      next(error);
    }
  }

  async asignarEmpleado(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const empleadoId = parseInt(String(req.params.empleadoId), 10);
      const { grupoId } = req.body;

      const resultado = await grupoService.asignarEmpleadoAGrupo(
        empleadoId,
        grupoId === null || grupoId === undefined ? null : parseInt(grupoId, 10),
        req.departamentoId,
      );
      return res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async asignarProyecto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const grupoId = parseInt(String(req.params.grupoId), 10);
      const { nombreProyecto, descripcion } = req.body;

      const asignacion = await grupoService.asignarProyecto(
        grupoId,
        nombreProyecto,
        descripcion,
        req.userId!,
        req.departamentoId,
      );
      return res.status(201).json({ data: asignacion });
    } catch (error) {
      next(error);
    }
  }

  async finalizarProyecto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const grupoId = parseInt(String(req.params.grupoId), 10);
      const resultado = await grupoService.finalizarProyecto(grupoId, req.departamentoId);
      return res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async obtenerHistorial(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const grupoId = parseInt(String(req.params.grupoId), 10);
      const historial = await grupoService.obtenerHistorial(grupoId, req.departamentoId);
      return res.status(200).json({ data: historial });
    } catch (error) {
      next(error);
    }
  }
}
