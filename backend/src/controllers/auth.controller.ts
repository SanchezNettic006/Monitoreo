import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@services/auth.service';
import { AuthRequest } from '@middleware/auth.middleware';
import { OperationalError } from '@middleware/errorHandler';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password_hash } = req.body;

      console.log('Login attempt:', { email, password_hash: password_hash ? '***' : 'missing' });

      if (!email || !password_hash) {
        return res.status(400).json({
          mensaje: 'Email y contraseña son requeridos',
        });
      }

      const resultado = await authService.login(email, password_hash);

      return res.status(200).json({
        token: resultado.token,
        usuario: resultado.usuario,
      });
    } catch (error) {
      console.error('Login error:', error);
      next(error);
    }
  }

  async obtenerPerfil(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const usuario = await authService.obtenerUsuario(req.userId!);

      return res.status(200).json({
        data: usuario,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/perfil/foto
   * Subir una foto nueva como foto de perfil propia del usuario logueado
   */
  async subirFotoPropia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        throw new OperationalError(400, 'No se proporcionó archivo');
      }

      const rutaFoto = `/uploads/${file.filename}`;
      const usuario = await authService.actualizarFotoPropia(req.userId!, rutaFoto);

      return res.status(200).json({
        mensaje: 'Foto de perfil actualizada exitosamente',
        data: usuario,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/olvide-password
   * Siempre responde 200 (exista o no el email) para no revelar qué correos
   * están registrados en el sistema.
   */
  async olvidePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ mensaje: 'El email es requerido' });
      }

      await authService.solicitarRestablecerPassword(email);

      return res.status(200).json({
        mensaje: 'Si el correo está registrado, recibirás un enlace para crear tu contraseña en unos minutos.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/restablecer-password
   */
  async restablecerPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ mensaje: 'Token y nueva contraseña son requeridos' });
      }
      if (password.length < 6) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });
      }

      await authService.restablecerPassword(token, password);

      return res.status(200).json({ mensaje: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      next(error);
    }
  }

}
