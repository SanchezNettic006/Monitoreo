import { AppDataSource } from '@config/database';
import { Empleado } from '@entities/Empleado';
import { Usuario } from '@entities/Usuario';
import { RecordAsistencia } from '@entities/RecordAsistencia';
import { OperationalError } from '@middleware/errorHandler';
import { generarUsernameUnico, hashPassword } from '@utils/credenciales';
import { hoyLocal } from '@utils/fecha.utils';

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

  async obtenerTodos(departamentoId?: number) {
    return await this.empleadoRepository.find({
      where: departamentoId !== undefined ? { departamento_id: departamentoId } : {},
      relations: ['usuario', 'departamento'],
    });
  }

  async crearEmpleado(datos: Partial<Empleado>, email: string, password: string, rol: string = 'empleado') {
    // Solo se permite asignar estos roles desde este formulario; 'admin' se otorga aparte
    const rolValido = rol === 'lider' ? 'lider' : 'empleado';

    // Generar username automáticamente (no visible para el admin)
    const username = await generarUsernameUnico(datos.nombre || '', datos.apellido || '');
    const passwordHasheado = await hashPassword(password);

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
      rol: rolValido,
    });

    const usuarioGuardado = await this.usuarioRepository.save(nuevoUsuario);

    // Crear Empleado con referencia al Usuario
    const datosEmpleado = {
      ...datos,
      usuario_id: usuarioGuardado.id,
    };

    const nuevoEmpleado = this.empleadoRepository.create(datosEmpleado);
    const empleadoGuardado = await this.empleadoRepository.save(nuevoEmpleado);

    // Retornar empleado con las credenciales ingresadas por el admin
    return {
      empleado: empleadoGuardado,
      credenciales: {
        email,
        password,
      },
    };
  }

  async actualizarEmpleado(id: number, datos: Partial<Empleado>, rol?: string) {
    const empleado = await this.empleadoRepository.findOne({
      where: { id },
    });

    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado');
    }

    Object.assign(empleado, datos);
    const empleadoActualizado = await this.empleadoRepository.save(empleado);

    if (rol !== undefined) {
      // Solo se permite asignar estos roles desde este formulario; 'admin' se otorga aparte
      const rolValido = rol === 'lider' ? 'lider' : 'empleado';
      await this.usuarioRepository.update({ id: empleado.usuario_id }, { rol: rolValido });
    }

    return empleadoActualizado;
  }

  async eliminarEmpleado(id: number) {
    const empleado = await this.obtenerEmpleado(id);
    return await this.empleadoRepository.remove(empleado);
  }

  async obtenerResumenEmpleado(id: number) {
    const empleado = await this.obtenerEmpleado(id);

    const recordHoy = await this.recordRepository.findOne({
      where: {
        empleado: { id },
        fecha: hoyLocal(),
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

