import { AppDataSource } from '@config/database';

/**
 * Inicializar columnas faltantes en la base de datos
 * Ejecutar al iniciar la aplicación
 */
export async function inicializarColumnas() {
  try {
    const queryRunner = AppDataSource.createQueryRunner();

    // Conectar a la BD
    await queryRunner.connect();

    console.log('🔧 Verificando columnas en empleado...');

    // Verificar si la columna foto_perfil existe
    const tablaExiste = await queryRunner.hasTable('empleado');
    
    if (tablaExiste) {
      const columnaExiste = await queryRunner.hasColumn('empleado', 'foto_perfil');

      if (!columnaExiste) {
        console.log('📸 Agregando columna foto_perfil...');
        await queryRunner.query(
          `ALTER TABLE empleado ADD COLUMN foto_perfil VARCHAR(255) NULL DEFAULT NULL`
        );
        console.log('✅ Columna foto_perfil agregada exitosamente');
      } else {
        console.log('✅ Columna foto_perfil ya existe');
      }
    }

    console.log('🔧 Verificando columnas en usuario...');
    const tablaUsuarioExiste = await queryRunner.hasTable('usuario');
    if (tablaUsuarioExiste) {
      const columnaFotoUsuarioExiste = await queryRunner.hasColumn('usuario', 'foto_perfil');

      if (!columnaFotoUsuarioExiste) {
        console.log('📸 Agregando columna foto_perfil a usuario...');
        await queryRunner.query(
          `ALTER TABLE usuario ADD COLUMN foto_perfil VARCHAR(255) NULL DEFAULT NULL`
        );
        console.log('✅ Columna foto_perfil (usuario) agregada exitosamente');
      } else {
        console.log('✅ Columna foto_perfil (usuario) ya existe');
      }
    }

    console.log('🔧 Verificando columnas en departamento...');
    const tablaDepartamentoExiste = await queryRunner.hasTable('departamento');
    if (tablaDepartamentoExiste) {
      const columnaEmailSupervisorExiste = await queryRunner.hasColumn('departamento', 'email_supervisor');

      if (!columnaEmailSupervisorExiste) {
        console.log('📧 Agregando columna email_supervisor...');
        await queryRunner.query(
          `ALTER TABLE departamento ADD COLUMN email_supervisor VARCHAR(255) NULL DEFAULT NULL`
        );
        console.log('✅ Columna email_supervisor agregada exitosamente');
      } else {
        console.log('✅ Columna email_supervisor ya existe');
      }
    }

    console.log('🔧 Verificando columnas de aprobación en hora_extra...');
    const tablaHoraExtraExiste = await queryRunner.hasTable('hora_extra');
    if (tablaHoraExtraExiste) {
      const columnasAprobacion: [string, string][] = [
        ['estado_aprobacion', `VARCHAR(20) NOT NULL DEFAULT 'pendiente'`],
        ['horas_aprobadas', `DECIMAL(5,2) NULL DEFAULT NULL`],
        ['motivo_ajuste', `TEXT NULL DEFAULT NULL`],
        ['aprobador_id', `INTEGER NULL DEFAULT NULL`],
        ['fecha_aprobacion', `TIMESTAMP NULL DEFAULT NULL`],
      ];

      for (const [columna, definicion] of columnasAprobacion) {
        const existe = await queryRunner.hasColumn('hora_extra', columna);
        if (!existe) {
          console.log(`📋 Agregando columna ${columna} a hora_extra...`);
          await queryRunner.query(`ALTER TABLE hora_extra ADD COLUMN ${columna} ${definicion}`);
        }
      }
      console.log('✅ Columnas de aprobación en hora_extra verificadas');

      // Permitir GPS nulo: si un técnico en campo no logra un fix de GPS a tiempo,
      // puede continuar sin ubicación en vez de quedar bloqueado (ver "Continuar sin GPS").
      console.log('🔧 Permitiendo GPS nulo en hora_extra (latitud_inicio/longitud_inicio)...');
      await queryRunner.query(`ALTER TABLE hora_extra ALTER COLUMN latitud_inicio DROP NOT NULL`);
      await queryRunner.query(`ALTER TABLE hora_extra ALTER COLUMN longitud_inicio DROP NOT NULL`);
      console.log('✅ latitud_inicio/longitud_inicio ahora permiten NULL');
    }

    console.log('🔧 Verificando columna requiere_reporte_cierre en departamento...');
    if (tablaDepartamentoExiste) {
      const columnaRequiereReporteExiste = await queryRunner.hasColumn('departamento', 'requiere_reporte_cierre');

      if (!columnaRequiereReporteExiste) {
        console.log('📝 Agregando columna requiere_reporte_cierre...');
        await queryRunner.query(
          `ALTER TABLE departamento ADD COLUMN requiere_reporte_cierre BOOLEAN NOT NULL DEFAULT false`
        );
        await queryRunner.query(
          `UPDATE departamento SET requiere_reporte_cierre = true WHERE nombre ILIKE 'Taller'`
        );
        console.log('✅ Columna requiere_reporte_cierre agregada y activada para Taller');
      } else {
        console.log('✅ Columna requiere_reporte_cierre ya existe');
      }
    }

    console.log('🔧 Verificando columna descripcion_trabajo en record_asistencia...');
    const tablaRecordAsistenciaExiste = await queryRunner.hasTable('record_asistencia');
    if (tablaRecordAsistenciaExiste) {
      const columnaDescripcionExiste = await queryRunner.hasColumn('record_asistencia', 'descripcion_trabajo');

      if (!columnaDescripcionExiste) {
        console.log('📝 Agregando columna descripcion_trabajo...');
        await queryRunner.query(
          `ALTER TABLE record_asistencia ADD COLUMN descripcion_trabajo TEXT NULL DEFAULT NULL`
        );
        console.log('✅ Columna descripcion_trabajo agregada exitosamente');
      } else {
        console.log('✅ Columna descripcion_trabajo ya existe');
      }
    }

    console.log('🔧 Verificando tabla grupo_trabajo...');
    const tablaGrupoExiste = await queryRunner.hasTable('grupo_trabajo');
    if (!tablaGrupoExiste) {
      console.log('👷 Creando tabla grupo_trabajo...');
      await queryRunner.query(`
        CREATE TABLE grupo_trabajo (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          departamento_id INTEGER NOT NULL REFERENCES departamento(id),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Tabla grupo_trabajo creada exitosamente');
    } else {
      console.log('✅ Tabla grupo_trabajo ya existe');
    }

    console.log('🔧 Verificando tabla asignacion_proyecto...');
    const tablaAsignacionExiste = await queryRunner.hasTable('asignacion_proyecto');
    if (!tablaAsignacionExiste) {
      console.log('📁 Creando tabla asignacion_proyecto...');
      await queryRunner.query(`
        CREATE TABLE asignacion_proyecto (
          id SERIAL PRIMARY KEY,
          grupo_id INTEGER NOT NULL REFERENCES grupo_trabajo(id),
          nombre_proyecto VARCHAR(150) NOT NULL,
          descripcion TEXT NULL,
          fecha_inicio DATE NOT NULL,
          fecha_fin DATE NULL,
          creado_por_usuario_id INTEGER NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Tabla asignacion_proyecto creada exitosamente');
    } else {
      console.log('✅ Tabla asignacion_proyecto ya existe');
    }

    console.log('🔧 Verificando columna grupo_id en empleado...');
    if (tablaExiste) {
      const columnaGrupoExiste = await queryRunner.hasColumn('empleado', 'grupo_id');

      if (!columnaGrupoExiste) {
        console.log('👷 Agregando columna grupo_id...');
        await queryRunner.query(
          `ALTER TABLE empleado ADD COLUMN grupo_id INTEGER NULL REFERENCES grupo_trabajo(id)`
        );
        console.log('✅ Columna grupo_id agregada exitosamente');
      } else {
        console.log('✅ Columna grupo_id ya existe');
      }
    }

    console.log('🔧 Verificando tabla dia_calendario...');
    const tablaCalendarioExiste = await queryRunner.hasTable('dia_calendario');
    if (!tablaCalendarioExiste) {
      console.log('⚠️ La tabla dia_calendario no existe. Créala manualmente (ver SQL en el módulo de calendario).');
    } else {
      console.log('✅ Tabla dia_calendario ya existe');
    }

    console.log('🔧 Verificando columnas de vacaciones en empleado...');
    if (tablaExiste) {
      const columnaFechaIngresoExiste = await queryRunner.hasColumn('empleado', 'fecha_ingreso');
      if (!columnaFechaIngresoExiste) {
        console.log('📅 Agregando columna fecha_ingreso...');
        await queryRunner.query(`ALTER TABLE empleado ADD COLUMN fecha_ingreso DATE NULL`);
        console.log('✅ Columna fecha_ingreso agregada exitosamente');
      } else {
        console.log('✅ Columna fecha_ingreso ya existe');
      }

      const columnaDiasVacacionesExiste = await queryRunner.hasColumn('empleado', 'dias_vacaciones_anuales');
      if (!columnaDiasVacacionesExiste) {
        console.log('🏖️ Agregando columna dias_vacaciones_anuales...');
        await queryRunner.query(`ALTER TABLE empleado ADD COLUMN dias_vacaciones_anuales INTEGER NOT NULL DEFAULT 15`);
        console.log('✅ Columna dias_vacaciones_anuales agregada exitosamente');
      } else {
        console.log('✅ Columna dias_vacaciones_anuales ya existe');
      }
    }

    console.log('🔧 Verificando tabla dia_calendario_excepcion...');
    const tablaExcepcionExiste = await queryRunner.hasTable('dia_calendario_excepcion');
    if (!tablaExcepcionExiste && tablaCalendarioExiste && tablaExiste) {
      console.log('📅 Creando tabla dia_calendario_excepcion...');
      await queryRunner.query(`
        CREATE TABLE dia_calendario_excepcion (
          dia_calendario_id INTEGER NOT NULL REFERENCES dia_calendario(id) ON DELETE CASCADE,
          empleado_id INTEGER NOT NULL REFERENCES empleado(id) ON DELETE CASCADE,
          PRIMARY KEY (dia_calendario_id, empleado_id)
        )
      `);
      console.log('✅ Tabla dia_calendario_excepcion creada exitosamente');
    } else {
      console.log('✅ Tabla dia_calendario_excepcion ya existe');
    }

    console.log('🔧 Verificando columnas de Telegram en usuario...');
    if (tablaUsuarioExiste) {
      const columnaChatIdExiste = await queryRunner.hasColumn('usuario', 'telegram_chat_id');
      if (!columnaChatIdExiste) {
        console.log('📲 Agregando columna telegram_chat_id...');
        await queryRunner.query(`ALTER TABLE usuario ADD COLUMN telegram_chat_id VARCHAR(255) NULL`);
        console.log('✅ Columna telegram_chat_id agregada exitosamente');
      } else {
        console.log('✅ Columna telegram_chat_id ya existe');
      }

      const columnaLinkCodeExiste = await queryRunner.hasColumn('usuario', 'telegram_link_code');
      if (!columnaLinkCodeExiste) {
        console.log('🔑 Agregando columna telegram_link_code...');
        await queryRunner.query(`ALTER TABLE usuario ADD COLUMN telegram_link_code VARCHAR(255) NULL`);
        console.log('✅ Columna telegram_link_code agregada exitosamente');
      } else {
        console.log('✅ Columna telegram_link_code ya existe');
      }
    }

    console.log('🔧 Verificando columnas de alerta de jornada larga en record_asistencia...');
    if (tablaRecordAsistenciaExiste) {
      const columnaAlertaTecnicoExiste = await queryRunner.hasColumn(
        'record_asistencia',
        'alerta_jornada_larga_tecnico_enviada',
      );
      if (!columnaAlertaTecnicoExiste) {
        // Si ya existía la columna vieja de una versión anterior de esta migración, se reutiliza como la de técnico
        const columnaAlertaViejaExiste = await queryRunner.hasColumn('record_asistencia', 'alerta_jornada_larga_enviada');
        if (columnaAlertaViejaExiste) {
          console.log('⚠️ Renombrando alerta_jornada_larga_enviada -> alerta_jornada_larga_tecnico_enviada...');
          await queryRunner.query(
            `ALTER TABLE record_asistencia RENAME COLUMN alerta_jornada_larga_enviada TO alerta_jornada_larga_tecnico_enviada`,
          );
        } else {
          console.log('⚠️ Agregando columna alerta_jornada_larga_tecnico_enviada...');
          await queryRunner.query(
            `ALTER TABLE record_asistencia ADD COLUMN alerta_jornada_larga_tecnico_enviada BOOLEAN NOT NULL DEFAULT false`,
          );
        }
        console.log('✅ Columna alerta_jornada_larga_tecnico_enviada lista');
      } else {
        console.log('✅ Columna alerta_jornada_larga_tecnico_enviada ya existe');
      }

      const columnaAlertaLiderExiste = await queryRunner.hasColumn(
        'record_asistencia',
        'alerta_jornada_larga_lider_enviada',
      );
      if (!columnaAlertaLiderExiste) {
        console.log('⚠️ Agregando columna alerta_jornada_larga_lider_enviada...');
        await queryRunner.query(
          `ALTER TABLE record_asistencia ADD COLUMN alerta_jornada_larga_lider_enviada BOOLEAN NOT NULL DEFAULT false`,
        );
        console.log('✅ Columna alerta_jornada_larga_lider_enviada agregada exitosamente');
      } else {
        console.log('✅ Columna alerta_jornada_larga_lider_enviada ya existe');
      }
    }

    console.log('🔧 Verificando columnas de recordatorio de no-inicio en empleado...');
    if (tablaExiste) {
      const columnaRecordatorioExiste = await queryRunner.hasColumn('empleado', 'ultimo_recordatorio_no_inicio');
      if (!columnaRecordatorioExiste) {
        console.log('⏰ Agregando columna ultimo_recordatorio_no_inicio...');
        await queryRunner.query(`ALTER TABLE empleado ADD COLUMN ultimo_recordatorio_no_inicio DATE NULL`);
        console.log('✅ Columna ultimo_recordatorio_no_inicio agregada exitosamente');
      } else {
        console.log('✅ Columna ultimo_recordatorio_no_inicio ya existe');
      }

      const columnaRecordatorioLiderExiste = await queryRunner.hasColumn(
        'empleado',
        'ultimo_recordatorio_no_inicio_lider',
      );
      if (!columnaRecordatorioLiderExiste) {
        console.log('⏰ Agregando columna ultimo_recordatorio_no_inicio_lider...');
        await queryRunner.query(`ALTER TABLE empleado ADD COLUMN ultimo_recordatorio_no_inicio_lider DATE NULL`);
        console.log('✅ Columna ultimo_recordatorio_no_inicio_lider agregada exitosamente');
      } else {
        console.log('✅ Columna ultimo_recordatorio_no_inicio_lider ya existe');
      }
    }

    // Liberar queryRunner
    await queryRunner.release();
  } catch (error) {
    console.error('❌ Error al inicializar columnas:', error);
    // No lanzar error - continuar con la aplicación
  }
}