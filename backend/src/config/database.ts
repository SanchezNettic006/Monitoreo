import { DataSource } from 'typeorm';
import { types } from 'pg';
import { config } from './env';
import path from 'path';

// Evitar que 'pg' convierta columnas DATE a objetos Date (causa desfases de zona horaria)
// Se devuelven como string 'YYYY-MM-DD' tal cual están en la base de datos
types.setTypeParser(1082, (val: string) => val);

// Importar entidades directamente
import { Usuario } from '../entities/Usuario';
import { Empleado } from '../entities/Empleado';
import { Departamento } from '../entities/Departamento';
import { RecordAsistencia } from '../entities/RecordAsistencia';
import { FotoAsistencia } from '../entities/FotoAsistencia';
import { ComentarioHoraExtra } from '../entities/ComentarioHoraExtra';
import { HorarioTrabajo } from '../entities/HorarioTrabajo';
import { PausaAsistencia } from '../entities/PausaAsistencia';
import { HoraExtra } from '../entities/HoraExtra';
import { SolicitudTramite } from '../entities/SolicitudTramite';
import { SolicitudHistorial } from '../entities/SolicitudHistorial';
import { NotificacionEmail } from '../entities/NotificacionEmail';
import { DiaCalendario } from '../entities/DiaCalendario';
import { Grupo } from '../entities/Grupo';
import { AsignacionProyecto } from '../entities/AsignacionProyecto';
import { LiderDepartamentoExtra } from '../entities/LiderDepartamentoExtra';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  synchronize: config.db.synchronize,
  logging: config.db.logging,
  entities: [
    Usuario,
    Empleado,
    Departamento,
    RecordAsistencia,
    FotoAsistencia,
    ComentarioHoraExtra,
    HorarioTrabajo,
    PausaAsistencia,
    HoraExtra,
    SolicitudTramite,
    SolicitudHistorial,
    NotificacionEmail,
    DiaCalendario,
    Grupo,
    AsignacionProyecto,
    LiderDepartamentoExtra,
  ],
  migrations: [path.join(__dirname, '../migrations/**/*.ts')],
  subscribers: [path.join(__dirname, '../subscribers/**/*.ts')],
});
