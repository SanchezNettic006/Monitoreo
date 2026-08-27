import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@services/auth.service';
import { AuthRequest } from '@middleware/auth.middleware';
import { OperationalError } from '@middleware/errorHandler';

const authService = new AuthService();

export class AuthController {
  async registrar(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, rol } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          mensaje: 'Email y contraseña son requeridos',
        });
      }

      const usuario = await authService.registrar(email, password, rol);

      return res.status(201).json({
        mensaje: 'Usuario registrado exitosamente',
        data: usuario,
      });
    } catch (error) {
      next(error);
    }
  }

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

}
