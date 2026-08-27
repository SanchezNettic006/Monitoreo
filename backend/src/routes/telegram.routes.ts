import { Router } from 'express';
import { TelegramController } from '@controllers/telegram.controller';
import { authMiddleware } from '@middleware/auth.middleware';

const router = Router();
const controller = new TelegramController();

router.use(authMiddleware);

router.get('/estado', (req, res, next) => controller.estado(req, res, next));
router.get('/vincular', (req, res, next) => controller.vincular(req, res, next));
router.post('/desvincular', (req, res, next) => controller.desvincular(req, res, next));

export default router;
