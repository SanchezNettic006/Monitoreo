import { Request, Response, NextFunction } from 'express';
import { EmpleadoService } from '@services/empleado.service';
import { Empleado } from '@entities/Empleado';
import { OperationalError } from '@middleware/errorHandler';

const empleadoService = new EmpleadoService();

export class EmpleadoController {
  // GET /api/empleados - Obtener todos los empleados
  async obtenerTodos(req: Request, res: Response, next: NextFunction) {
    try {
      const empleados = await empleadoService.obtenerTodos();

      return res.status(200).json({
        mensaje: 'Empleados obtenidos exitosamente',
        data: empleados,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/empleados/:id - Obtener un empleado por ID
  async obtenerPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const empleado = await empleadoService.obtenerEmpleado(parseInt(id));

      return res.status(200).json({
        mensaje: 'Empleado obtenido exitosamente',
        data: empleado,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/empleados - Crear nuevo empleado
  async crear(req: Request, res: Response, next: NextFunction) {
    try {
      const { nombre, apellido, cargo, telefono, departamento_id } = req.body;

      // Validar campos requeridos
      if (!nombre || !apellido || !departamento_id) {
        throw new OperationalError(400, 'Nombre, apellido y departamento_id son requeridos');
      }

      const datosEmpleado: Partial<Empleado> = {
        nombre,
        apellido,
        cargo: cargo || null,
        telefono: telefono || null,
        departamento_id,
      };

      const resultado = await empleadoService.crearEmpleado(datosEmpleado);

      return res.status(201).json({
        mensaje: 'Empleado creado exitosamente',
        data: resultado.empleado,
        credenciales: resultado.credenciales, // Email y password temporal
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/empleados/:id - Actualizar empleado
  async actualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { nombre, apellido, cargo, telefono, departamento_id } = req.body;

      const datosActualizar: Partial<Empleado> = {};

      if (nombre) datosActualizar.nombre = nombre;
      if (apellido) datosActualizar.apellido = apellido;
      if (cargo !== undefined) datosActualizar.cargo = cargo;
      if (telefono !== undefined) datosActualizar.telefono = telefono;
      if (departamento_id) datosActualizar.departamento_id = departamento_id;

      const empleadoActualizado = await empleadoService.actualizarEmpleado(parseInt(id), datosActualizar);

      return res.status(200).json({
        mensaje: 'Empleado actualizado exitosamente',
        data: empleadoActualizado,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/empleados/:id - Eliminar empleado
  async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      await empleadoService.eliminarEmpleado(parseInt(id));
      
      return res.status(200).json({
        mensaje: 'Empleado eliminado exitosamente',
        data: { id: parseInt(id) },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/empleados/:id/foto - Subir foto de perfil
  async subirFoto(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        throw new OperationalError(400, 'No se proporcionó archivo');
      }

      const rutaFoto = `/uploads/${file.filename}`;
      const empleadoActualizado = await empleadoService.actualizarFoto(parseInt(id), rutaFoto);

      return res.status(200).json({
        mensaje: 'Foto de perfil actualizada exitosamente',
        data: empleadoActualizado,
      });
    } catch (error) {
      next(error);
    }
  }
}
