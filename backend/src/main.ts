import 'reflect-metadata';
import app from './app';
import { config } from './config/env';
import { AppDataSource } from './config/database';
import { inicializarColumnas } from './utils/initDb';
import { inicializarTareasNotificaciones } from './scripts/notificationWorker';
import { inicializarAlertasTelegram } from './scripts/alertasWorker';
import fs from 'fs';
import path from 'path';

const PORT = config.server.port;

// Crear carpeta de uploads si no existe
const uploadDir = config.upload.dir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Inicializar base de datos y servidor
async function bootstrap() {
  try {
    // Conectar base de datos
    console.log('🔗 Conectando a la base de datos...');
    await AppDataSource.initialize();
    console.log('✅ Base de datos conectada');

    // Inicializar columnas faltantes
    await inicializarColumnas();

    // Inicializar tareas de notificaciones
    inicializarTareasNotificaciones();

    // Inicializar alertas por Telegram
    inicializarAlertasTelegram();

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║  🚀 NETTIC Backend iniciado            ║
║  Puerto: ${PORT}                        
║  Entorno: ${config.server.env}                ║
║  Base de datos: ${config.db.database}         ║
╚════════════════════════════════════════╝
      `);

      console.log(`
📚 Endpoints disponibles:
  POST   /api/auth/registrar
  POST   /api/auth/login
  GET    /api/auth/perfil
  GET    /api/empleados
  GET    /api/empleados/:id
  POST   /api/empleados
  PUT    /api/empleados/:id
  DELETE /api/empleados/:id
  POST   /api/asistencia/entrada
  POST   /api/asistencia/salida
  GET    /api/asistencia/hoy
  GET    /api/asistencia/resumen
  GET    /api/asistencia/registros
  GET    /api/reportes/dashboard
  GET    /api/reportes/horas-extras-depto
  GET    /api/reportes/registros-empleados
  GET    /api/reportes/empleado
  GET    /health

📖 Documentación: http://localhost:${PORT}/health
      `);
    });
  } catch (error) {
    console.error('❌ Error al inicializar:', error);
    process.exit(1);
  }
}

bootstrap();
