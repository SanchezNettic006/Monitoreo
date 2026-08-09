import { AppDataSource } from '@config/database';
import { Empleado } from '@entities/Empleado';
import { Usuario } from '@entities/Usuario';
import { RecordAsistencia } from '@entities/RecordAsistencia';
import { OperationalError } from '@middleware/errorHandler';
import { generarUsernameUnico, generarEmailUnico, generarPasswordTemporal, hashPassword } from '@utils/credenciales';

export class EmpleadoService {
  private empleadoRepository = AppDataSource.getRepository(Empleado);
  private usuarioRepository = AppDataSource.getRepository(Usuario);
  private recordRepository = AppDataSource.getRepository(RecordAsistencia);

  async obtenerEmpleado(id: number) {
    const empleado = await this.empleadoRepository.findOne({
      where: { id },
      relations: ['usuario', 'departamento', 'records'],
    });

    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado');
    }

    return empleado;
  }

  async obtenerTodos() {
    return await this.empleadoRepository.find({
      relations: ['usuario', 'departamento'],
    });
  }

  async crearEmpleado(datos: Partial<Empleado>) {
    // Generar credenciales automáticamente
    const username = await generarUsernameUnico(datos.nombre || '', datos.apellido || '');
    const email = await generarEmailUnico(datos.nombre || '', datos.apellido || '');
    const passwordTemporal = generarPasswordTemporal();
    const passwordHasheado = await hashPassword(passwordTemporal);

    // Verificar que el email no existe
    const usuarioExistente = await this.usuarioRepository.findOne({
      where: { email },
    });

    if (usuarioExistente) {
      throw new OperationalError(400, `El email ${email} ya está registrado`);
    }

    // Crear Usuario
    const nuevoUsuario = this.usuarioRepository.create({
      username,
      email,
      password_hash: passwordHasheado,
      rol: 'empleado', // Por defecto empleado
    });

    const usuarioGuardado = await this.usuarioRepository.save(nuevoUsuario);

    // Crear Empleado con referencia al Usuario
    const datosEmpleado = {
      ...datos,
      usuario_id: usuarioGuardado.id,
    };

    const nuevoEmpleado = this.empleadoRepository.create(datosEmpleado);
    const empleadoGuardado = await this.empleadoRepository.save(nuevoEmpleado);

    // Retornar empleado con credenciales generadas
    return {
      empleado: empleadoGuardado,
      credenciales: {
        email,
        password: passwordTemporal, // Sin hashear para mostrar al admin
      },
    };
  }

  async actualizarEmpleado(id: number, datos: Partial<Empleado>) {
    const empleado = await this.empleadoRepository.findOne({
      where: { id },
    });

    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado');
    }

    Object.assign(empleado, datos);
    return await this.empleadoRepository.save(empleado);
  }

  async eliminarEmpleado(id: number) {
    const empleado = await this.obtenerEmpleado(id);
    return await this.empleadoRepository.remove(empleado);
  }

  async obtenerResumenEmpleado(id: number) {
    const empleado = await this.obtenerEmpleado(id);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const recordHoy = await this.recordRepository.findOne({
      where: {
        empleado: { id },
        fecha: hoy,
      },
      relations: ['fotos', 'comentarios'],
    });

    return {
      empleado,
      recordHoy,
      jornada_activa: recordHoy && !recordHoy.hora_salida,
    };
  }

  async actualizarFoto(id: number, rutaFoto: string) {
    const empleado = await this.empleadoRepository.findOne({
      where: { id },
    });

    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado');
    }

    empleado.foto_perfil = rutaFoto;
    return await this.empleadoRepository.save(empleado);
  }
}

