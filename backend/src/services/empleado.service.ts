import { In } from 'typeorm';
import { AppDataSource } from '@config/database';
import { Empleado } from '@entities/Empleado';
import { Usuario } from '@entities/Usuario';
import { RecordAsistencia } from '@entities/RecordAsistencia';
import { LiderDepartamentoExtra } from '@entities/LiderDepartamentoExtra';
import { OperationalError } from '@middleware/errorHandler';
import { generarUsernameUnico, hashPassword } from '@utils/credenciales';
import { hoyLocal } from '@utils/fecha.utils';

export class EmpleadoService {
  private empleadoRepository = AppDataSource.getRepository(Empleado);
  private usuarioRepository = AppDataSource.getRepository(Usuario);
  private recordRepository = AppDataSource.getRepository(RecordAsistencia);
  private liderDeptoExtraRepository = AppDataSource.getRepository(LiderDepartamentoExtra);

  async obtenerEmpleado(id: number) {
    const empleado: any = await this.empleadoRepository.findOne({
      where: { id },
      relations: ['usuario', 'departamento', 'records'],
    });

    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado');
    }

    // Si es líder, incluir los departamentos adicionales que supervisa (además
    // del suyo propio), para que el formulario de edición los pueda mostrar
    if (empleado.usuario?.rol === 'lider') {
      const extras = await this.liderDeptoExtraRepository.find({
        where: { usuario_id: empleado.usuario_id },
        relations: ['departamento'],
      });
      empleado.departamentosExtra = extras.map((e) => ({ id: e.departamento_id, nombre: e.departamento?.nombre }));
    }

    return empleado;
  }

  /** Reemplaza por completo el conjunto de departamentos adicionales que supervisa un líder */
  async actualizarDepartamentosExtra(empleadoId: number, departamentoIds: number[]) {
    const empleado = await this.empleadoRepository.findOne({ where: { id: empleadoId } });
    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado');
    }

    await this.liderDeptoExtraRepository.delete({ usuario_id: empleado.usuario_id });

    const nuevos = departamentoIds
      .filter((id) => id !== empleado.departamento_id) // el propio no cuenta como "extra"
      .map((departamento_id) => this.liderDeptoExtraRepository.create({ usuario_id: empleado.usuario_id, departamento_id }));

    if (nuevos.length) {
      await this.liderDeptoExtraRepository.save(nuevos);
    }

    return { mensaje: '✅ Departamentos adicionales actualizados' };
  }

  async obtenerTodos(departamentoId?: number[]) {
    return await this.empleadoRepository.find({
      where: departamentoId !== undefined ? { departamento_id: In(departamentoId) } : {},
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

    // Usuario + Empleado se crean en una sola transacción: si la creación del
    // empleado falla (ej. departamento inválido), el usuario recién creado se
    // revierte también, en vez de quedar una cuenta huérfana sin empleado.
    const empleadoGuardado = await AppDataSource.transaction(async (manager) => {
      const nuevoUsuario = manager.create(Usuario, {
        username,
        email,
        password_hash: passwordHasheado,
        rol: rolValido,
      });

      const usuarioGuardado = await manager.save(nuevoUsuario);

      const datosEmpleado = {
        ...datos,
        usuario_id: usuarioGuardado.id,
      };

      const nuevoEmpleado = manager.create(Empleado, datosEmpleado);
      return manager.save(nuevoEmpleado);
    });

    // Retornar empleado con las credenciales ingresadas por el admin
    return {
      empleado: empleadoGuardado,
      credenciales: {
        email,
        password,
      },
    };
  }

  async actualizarEmpleado(id: number, datos: Partial<Empleado>, rol?: string, nuevaPassword?: string) {
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

    // Cambio de contraseña: esta ruta ya es exclusiva de admin (ver empleados.routes.ts)
    if (nuevaPassword?.trim()) {
      if (nuevaPassword.trim().length < 6) {
        throw new OperationalError(400, 'La nueva contraseña debe tener al menos 6 caracteres');
      }
      const passwordHasheado = await hashPassword(nuevaPassword.trim());
      await this.usuarioRepository.update({ id: empleado.usuario_id }, { password_hash: passwordHasheado });
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

