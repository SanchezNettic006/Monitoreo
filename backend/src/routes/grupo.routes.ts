import { Router } from 'express';
import { GrupoController } from '@controllers/grupo.controller';
import { authMiddleware, liderOAdminMiddleware, cargarDepartamentoLider } from '@middleware/auth.middleware';

const router = Router();
const controller = new GrupoController();

router.use(authMiddleware, liderOAdminMiddleware, cargarDepartamentoLider);

// Proyectos directos por departamento (sin grupo)
router.get('/proyectos-directos', (req, res, next) => controller.obtenerProyectosDirectos(req, res, next));
router.post('/proyectos-directos', (req, res, next) => controller.crearProyectoDirecto(req, res, next));
router.delete('/proyectos-directos/:proyectoId', (req, res, next) => controller.finalizarProyectoDirecto(req, res, next));

export default router;
