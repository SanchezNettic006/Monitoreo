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
      relations: ['empleado'],
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
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        foto_perfil: usuario.empleado?.foto_perfil || null,
      },
    };
  }

  async obtenerUsuario(id: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: ['empleado'],
    });

    if (!usuario) {
      throw new OperationalError(404, 'Usuario no encontrado');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      foto_perfil: usuario.empleado?.foto_perfil || null,
    };
  }
}
