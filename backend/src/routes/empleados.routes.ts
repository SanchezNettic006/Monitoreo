import { Router } from 'express';
import { EmpleadoController } from '@controllers/empleado.controller';
import { authMiddleware } from '@middleware/auth.middleware';
import { uploadFoto } from '@utils/upload';

const router = Router();
const controller = new EmpleadoController();

// Todas las rutas de empleados requieren autenticación
router.use(authMiddleware);

// GET /api/empleados - Obtener todos los empleados
router.get('/', (req, res, next) =>
  controller.obtenerTodos(req, res, next),
);

// GET /api/empleados/:id - Obtener un empleado por ID
router.get('/:id', (req, res, next) =>
  controller.obtenerPorId(req, res, next),
);

// POST /api/empleados - Crear nuevo empleado
router.post('/', (req, res, next) =>
  controller.crear(req, res, next),
);

// PUT /api/empleados/:id - Actualizar empleado
router.put('/:id', (req, res, next) =>
  controller.actualizar(req, res, next),
);

// DELETE /api/empleados/:id - Eliminar empleado
router.delete('/:id', (req, res, next) =>
  controller.eliminar(req, res, next),
);

// POST /api/empleados/:id/foto - Subir foto de perfil
router.post('/:id/foto', uploadFoto.single('foto'), (req, res, next) =>
  controller.subirFoto(req, res, next),
);

export default router;
