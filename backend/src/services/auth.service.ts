import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppDataSource } from '@config/database';
import { Usuario } from '@entities/Usuario';
import { generateToken } from '@utils/jwt.utils';
import { OperationalError } from '@middleware/errorHandler';
import { notificacionService } from '@services/notificacion.service';
import { emailTemplates } from '@utils/emailTemplates';

export class AuthService {
  private usuarioRepository = AppDataSource.getRepository(Usuario);

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

  /**
   * Genera un token de un solo uso y encola el correo para crear/restablecer
   * la contraseña. Nunca revela si el email existe o no (mismo resultado
   * en ambos casos), para no filtrar qué correos están registrados.
   */
  async solicitarRestablecerPassword(email: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { email } });
    if (!usuario) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.usuarioRepository.update(
      { id: usuario.id },
      { reset_password_token: token, reset_password_expira: expira },
    );

    const { asunto, cuerpo } = emailTemplates.restablecerPassword(token);
    await notificacionService.crearNotificacion({
      tipo: 'solicitud_creada',
      destinatario: email,
      asunto,
      cuerpo,
    });
  }

  /** Valida el token y establece la nueva contraseña; el token se invalida al usarse */
  async restablecerPassword(token: string, nuevaPassword: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { reset_password_token: token } });

    if (!usuario || !usuario.reset_password_expira || usuario.reset_password_expira < new Date()) {
      throw new OperationalError(400, 'El enlace no es válido o ya expiró. Solicita uno nuevo.');
    }

    const passwordHasheado = await bcrypt.hash(nuevaPassword, 10);
    await this.usuarioRepository.update(
      { id: usuario.id },
      { password_hash: passwordHasheado, reset_password_token: null, reset_password_expira: null } as any,
    );
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
