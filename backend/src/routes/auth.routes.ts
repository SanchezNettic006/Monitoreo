import { Router } from 'express';
import { AuthController } from '@controllers/auth.controller';
import { authMiddleware } from '@middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

// Rutas públicas
router.post('/registrar', (req, res, next) => controller.registrar(req, res, next));
router.post('/login', (req, res, next) => controller.login(req, res, next));

// Rutas protegidas
router.get('/perfil', authMiddleware, (req, res, next) => controller.obtenerPerfil(req, res, next));

export default router;
