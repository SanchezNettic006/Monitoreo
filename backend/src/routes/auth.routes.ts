import { Router } from 'express';
import { AuthController } from '@controllers/auth.controller';
import { authMiddleware } from '@middleware/auth.middleware';
import { uploadFoto } from '@utils/upload';

const router = Router();
const controller = new AuthController();

// Rutas públicas
router.post('/registrar', (req, res, next) => controller.registrar(req, res, next));
router.post('/login', (req, res, next) => controller.login(req, res, next));

// Rutas protegidas
router.get('/perfil', authMiddleware, (req, res, next) => controller.obtenerPerfil(req, res, next));

// Foto de perfil propia (cualquier usuario logueado, incluido admin sin Empleado)
router.post('/perfil/foto', authMiddleware, uploadFoto.single('foto'), (req, res, next) =>
  controller.subirFotoPropia(req, res, next),
);

export default router;
