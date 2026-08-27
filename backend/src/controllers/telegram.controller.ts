import { Response, NextFunction } from 'express';
import { AuthRequest } from '@middleware/auth.middleware';
import { telegramService } from '@services/telegram.service';

export class TelegramController {
  /** GET /telegram/estado — si la cuenta ya está vinculada a un chat de Telegram */
  async estado(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const estado = await telegramService.obtenerEstado(req.userId!);
      return res.status(200).json({ exitoso: true, data: estado });
    } catch (error) {
      next(error);
    }
  }

  /** GET /telegram/vincular — genera el link t.me/<bot>?start=<codigo> */
  async vincular(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const url = await telegramService.generarVinculo(req.userId!);
      return res.status(200).json({ exitoso: true, data: { url } });
    } catch (error) {
      next(error);
    }
  }

  /** POST /telegram/desvincular */
  async desvincular(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await telegramService.desvincular(req.userId!);
      return res.status(200).json({ exitoso: true, mensaje: 'Telegram desvinculado' });
    } catch (error) {
      next(error);
    }
  }
}
