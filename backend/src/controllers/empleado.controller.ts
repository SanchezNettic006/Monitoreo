import { Response, NextFunction } from 'express';
import { EmpleadoService } from '@services/empleado.service';
import { Empleado } from '@entities/Empleado';
import { OperationalError } from '@middleware/errorHandler';
import { AuthRequest } from '@middleware/auth.middleware';

const empleadoService = new EmpleadoService();

export class EmpleadoController {
  // GET /api/empleados - Obtener todos los empleados (líder: solo los de su departamento)
  async obtenerTodos(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const empleados = await empleadoService.obtenerTodos(req.departamentoId);

      return res.status(200).json({
        mensaje: 'Empleados obtenidos exitosamente',
        data: empleados,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/empleados/:id - Obtener un empleado por ID (líder: solo si es de su departamento)
  async obtenerPorId(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const empleado = await empleadoService.obtenerEmpleado(parseInt(id));

      if (req.departamentoId !== undefined && empleado.departamento_id !== req.departamentoId) {
        throw new OperationalError(403, 'No tienes permisos para ver empleados de otro departamento');
      }

      return res.status(200).json({
        mensaje: 'Empleado obtenido exitosamente',
        data: empleado,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/empleados - Crear nuevo empleado
  async crear(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { nombre, apellido, cargo, telefono, departamento_id, email, password, rol, fecha_ingreso, dias_vacaciones_anuales } = req.body;

      // Validar campos requeridos
      if (!nombre || !apellido || !departamento_id || !email || !password) {
        throw new OperationalError(400, 'Nombre, apellido, departamento_id, email y password son requeridos');
      }

      if (password.length < 6) {
        throw new OperationalError(400, 'La contraseña debe tener al menos 6 caracteres');
      }

      const datosEmpleado: Partial<Empleado> = {
        nombre,
        apellido,
        cargo: cargo || null,
        telefono: telefono || null,
        departamento_id,
        fecha_ingreso: fecha_ingreso || undefined,
        dias_vacaciones_anuales: dias_vacaciones_anuales !== undefined ? parseInt(dias_vacaciones_anuales, 10) : undefined,
      };

      const resultado = await empleadoService.crearEmpleado(datosEmpleado, email, password, rol);

      return res.status(201).json({
        mensaje: 'Empleado creado exitosamente',
        data: resultado.empleado,
        credenciales: resultado.credenciales, // Email y password ingresados por el admin
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/empleados/:id - Actualizar empleado
  async actualizar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { nombre, apellido, cargo, telefono, departamento_id, rol, fecha_ingreso, dias_vacaciones_anuales } = req.body;

      const datosActualizar: Partial<Empleado> = {};

      if (nombre) datosActualizar.nombre = nombre;
      if (apellido) datosActualizar.apellido = apellido;
      if (cargo !== undefined) datosActualizar.cargo = cargo;
      if (telefono !== undefined) datosActualizar.telefono = telefono;
      if (departamento_id) datosActualizar.departamento_id = departamento_id;
      if (fecha_ingreso !== undefined) datosActualizar.fecha_ingreso = fecha_ingreso || undefined;
      if (dias_vacaciones_anuales !== undefined) datosActualizar.dias_vacaciones_anuales = parseInt(dias_vacaciones_anuales, 10);

      const empleadoActualizado = await empleadoService.actualizarEmpleado(parseInt(id), datosActualizar, rol);

      return res.status(200).json({
        mensaje: 'Empleado actualizado exitosamente',
        data: empleadoActualizado,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/empleados/:id - Eliminar empleado
  async eliminar(req: AuthRequest, res: Response, next: NextFunction) {
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
  async subirFoto(req: AuthRequest, res: Response, next: NextFunction) {
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
