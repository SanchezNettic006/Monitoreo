import bcrypt from 'bcrypt';
import { AppDataSource } from '@config/database';
import { Usuario } from '@entities/Usuario';
import { generateToken } from '@utils/jwt.utils';
import { OperationalError } from '@middleware/errorHandler';

export class AuthService {
  private usuarioRepository = AppDataSource.getRepository(Usuario);

  async registrar(email: string, contrasena: string, rol: string = 'empleado') {
    // Verificar si el usuario ya existe
    const existente = await this.usuarioRepository.findOne({
      where: { email },
    });

    if (existente) {
      throw new OperationalError(400, 'El email ya está registrado');
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Crear usuario
    const usuario = this.usuarioRepository.create({
      email,
      password_hash: hashedPassword,
      rol,
    });

    await this.usuarioRepository.save(usuario);

    return {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };
  }

  async login(email: string, password_hash: string) {
    // Buscar usuario
    const usuario = await this.usuarioRepository.findOne({
      where: { email },
      relations: ['empleado', 'empleado.departamento'],
    });

    if (!usuario) {
      throw new OperationalError(401, 'Credenciales inválidas');
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password_hash, usuario.password_hash);

    if (!passwordValida) {
      throw new OperationalError(401, 'Credenciales inválidas');
    }

    // Generar token
    const token = generateToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    });

    return {
      token,
      usuario: this.mapearPerfil(usuario),
    };
  }

  async obtenerUsuario(id: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: ['empleado', 'empleado.departamento'],
    });

    if (!usuario) {
      throw new OperationalError(404, 'Usuario no encontrado');
    }

    return this.mapearPerfil(usuario);
  }

  /**
   * Actualiza la foto de perfil propia del usuario logueado (independiente
   * de Empleado.foto_perfil, para cuentas sin registro de empleado)
   */
  async actualizarFotoPropia(usuarioId: number, rutaFoto: string) {
    await this.usuarioRepository.update({ id: usuarioId }, { foto_perfil: rutaFoto });
    return this.obtenerUsuario(usuarioId);
  }

  /** Datos de perfil expuestos al frontend (login, /perfil, actualización de foto) */
  private mapearPerfil(usuario: Usuario) {
    return {
      id: usuario.id,
      email: usuario.email,
      username: usuario.username,
      rol: usuario.rol,
      foto_perfil: usuario.empleado?.foto_perfil || usuario.foto_perfil || null,
      nombre: usuario.empleado?.nombre || null,
      apellido: usuario.empleado?.apellido || null,
      cargo: usuario.empleado?.cargo || null,
      telefono: usuario.empleado?.telefono || null,
      departamento: usuario.empleado?.departamento?.nombre || null,
      // false solo para departamentos cuyo personal no trabaja con tickets/NET
      // (ej. Vehículos y Taller); en ese caso la hora extra se reporta con un motivo libre
      usaTicketHorasExtra: usuario.empleado?.departamento?.usa_ticket_horas_extra ?? true,
    };
  }
}
