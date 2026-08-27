import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { config } from '@config/env';
import { errorHandler } from '@middleware/errorHandler';

// Rutas
import authRoutes from '@routes/auth.routes';
import asistenciaRoutes from '@routes/asistencia.routes';
import empleadosRoutes from '@routes/empleados.routes';
import reportesRoutes from '@routes/reportes.routes';
import horaExtraRoutes from '@routes/horaExtra.routes';
import solicitudRoutes from '@routes/solicitud.routes';
import notificacionRoutes from '@routes/notificacion.routes';
import calendarioRoutes from '@routes/calendario.routes';
import grupoRoutes from '@routes/grupo.routes';
import telegramRoutes from '@routes/telegram.routes';

const app: Express = express();

// Middleware global - DEBE estar ANTES de las rutas
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  }),
);

// Carpeta de uploads estática
app.use('/uploads', express.static(config.upload.dir));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/asistencia', asistenciaRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/asistencia/hora-extra', horaExtraRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/api/grupos', grupoRoutes);
app.use('/api/telegram', telegramRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.server.env,
  });
});

// Ruta no encontrada
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 404,
    message: 'Ruta no encontrada',
  });
});

// Manejador global de errores
app.use(errorHandler);

export default app;
