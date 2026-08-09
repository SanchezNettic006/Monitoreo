import { DataSource } from 'typeorm';
import { config } from './env';
import path from 'path';

// Importar entidades directamente
import { Usuario } from '../entities/Usuario';
import { Empleado } from '../entities/Empleado';
import { Departamento } from '../entities/Departamento';
import { RecordAsistencia } from '../entities/RecordAsistencia';
import { FotoAsistencia } from '../entities/FotoAsistencia';
import { ComentarioHoraExtra } from '../entities/ComentarioHoraExtra';
import { HorarioTrabajo } from '../entities/HorarioTrabajo';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  synchronize: config.db.synchronize,
  logging: config.db.logging,
  entities: [Usuario, Empleado, Departamento, RecordAsistencia, FotoAsistencia, ComentarioHoraExtra, HorarioTrabajo],
  migrations: [path.join(__dirname, '../migrations/**/*.ts')],
  subscribers: [path.join(__dirname, '../subscribers/**/*.ts')],
});
