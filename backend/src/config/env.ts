import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  // Base de datos
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'nettic',
    synchronize: false, // Usar migraciones en lugar de sincronización automática
    logging: process.env.NODE_ENV === 'development',
  },

  // Servidor
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
    baseUrl: process.env.SERVER_BASE_URL || `http://localhost:${parseInt(process.env.PORT || '3001', 10)}`,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRE || '24h',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  },

  // Uploads
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },

  // Gmail SMTP
  gmail: {
    user: process.env.GMAIL_USER || '',
    password: process.env.GMAIL_PASSWORD || '',
    fromName: process.env.GMAIL_FROM_NAME || 'NETTIC - Sistema de Asistencias',
  },

  // Notificaciones
  notificaciones: {
    emailRrhh: process.env.RRHH_EMAIL || '',
  },

  // Telegram (alertas de jornada larga y recordatorio de check-in)
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    botUsername: process.env.TELEGRAM_BOT_USERNAME || '',
  },
};
