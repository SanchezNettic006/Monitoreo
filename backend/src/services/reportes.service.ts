import { AppDataSource } from '@config/database';
import { RecordAsistencia } from '@entities/RecordAsistencia';
import { Empleado } from '@entities/Empleado';
import { Usuario } from '@entities/Usuario';
import { HoraExtra } from '@entities/HoraExtra';
import { Departamento } from '@entities/Departamento';
import { DiaCalendario } from '@entities/DiaCalendario';
import { SolicitudTramite } from '@entities/SolicitudTramite';
import { AsignacionProyecto } from '@entities/AsignacionProyecto';
import { config } from '@config/env';
import { enumerarFechas, formatFechaLocal, hoyLocal } from '@utils/fecha.utils';
import path from 'path';
import { Between } from 'typeorm';

interface FiltrosAsistencia {
  empleadoId?: number;
  /** Búsqueda parcial (ILIKE) contra nombre + apellido del empleado */
  nombreEmpleado?: string;
  /** 'YYYY-MM-DD' — se compara contra columnas 'date' sin conversión de zona horaria */
  fechaInicio?: string;
  fechaFin?: string;
  departamentoId?: number;
  page?: number;
  limit?: number;
}

export class ReportesService {
  private recordAsistenciaRepository = AppDataSource.getRepository(RecordAsistencia);
  private empleadoRepository = AppDataSource.getRepository(Empleado);
  private horaExtraRepository = AppDataSource.getRepository(HoraExtra);
  private usuarioRepository = AppDataSource.getRepository(Usuario);
  private departamentoRepository = AppDataSource.getRepository(Departamento);
  private diaCalendarioRepository = AppDataSource.getRepository(DiaCalendario);
  private solicitudRepository = AppDataSource.getRepository(SolicitudTramite);
  private asignacionProyectoRepository = AppDataSource.getRepository(AsignacionProyecto);

  /**
   * Historial de asistencias del propio usuario logueado (empleado o admin viendo lo suyo)
   */
  async obtenerMisAsistencias(usuarioId: number, filtros: Omit<FiltrosAsistencia, 'empleadoId' | 'departamentoId'>) {
    const empleado = await this.empleadoRepository.findOne({ where: { usuario_id: usuarioId } });

    if (!empleado) {
      return { data: [], total: 0, page: filtros.page || 1, limit: filtros.limit || 20, pages: 0 };
    }

    return this.obtenerAsistencias({ ...filtros, empleadoId: empleado.id });
  }

  /**
   * Obtener asistencias con filtros y paginación
   * Incluye registros de asistencia + horas extras independientes
   */
  async obtenerAsistencias(filtros: FiltrosAsistencia) {
    try {
      const {
        empleadoId,
        nombreEmpleado,
        fechaInicio,
        fechaFin,
        departamentoId,
        page = 1,
        limit = 20,
      } = filtros;

      console.log('Obteniendo asistencias con filtros:', { empleadoId, nombreEmpleado, fechaInicio, fechaFin, departamentoId, page, limit });

      // Obtener registros de asistencia normales
      let queryAsistencia = this.recordAsistenciaRepository
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.empleado', 'empleado')
        .leftJoinAndSelect('empleado.departamento', 'departamento')
        .leftJoinAndSelect('empleado.grupo', 'grupo')
        .leftJoinAndSelect('record.pausas', 'pausas')
        .leftJoinAndSelect('record.fotos', 'fotos')
        .leftJoinAndSelect('record.horasExtras', 'horasExtras')
        .leftJoinAndSelect('horasExtras.fotos', 'fotosHoraExtra');

      // Filtros asistencia
      if (empleadoId) {
        queryAsistencia.andWhere('record.empleado_id = :empleadoId', { empleadoId });
      }
      if (nombreEmpleado) {
        queryAsistencia.andWhere("CONCAT(empleado.nombre, ' ', empleado.apellido) ILIKE :nombreEmpleado", {
          nombreEmpleado: `%${nombreEmpleado}%`,
        });
      }
      if (departamentoId) {
        queryAsistencia.andWhere('empleado.departamento_id = :departamentoId', { departamentoId });
      }
      if (fechaInicio && fechaFin) {
        queryAsistencia.andWhere('record.fecha BETWEEN :fechaInicio AND :fechaFin', {
          fechaInicio,
          fechaFin,
        });
      }

      const records = await queryAsistencia
        .orderBy('record.fecha', 'DESC')
        .getMany();

      // Proyecto vigente el día de cada registro, según el grupo del empleado en ese momento
      const grupoIds = [...new Set(records.map((r) => r.empleado.grupo_id).filter((id): id is number => !!id))];
      const asignaciones = grupoIds.length
        ? await this.asignacionProyectoRepository
            .createQueryBuilder('a')
            .where('a.grupo_id IN (:...grupoIds)', { grupoIds })
            .getMany()
        : [];

      const proyectoDelDia = (grupoId: number | undefined, fecha: string): string | null => {
        if (!grupoId) return null;
        const vigente = asignaciones.find(
          (a) => a.grupo_id === grupoId && a.fecha_inicio <= fecha && (!a.fecha_fin || a.fecha_fin >= fecha),
        );
        return vigente?.nombre_proyecto || null;
      };

      // Obtener horas extras SIN record_asistencia_id (independientes)
      let queryHorasExtras = this.horaExtraRepository
        .createQueryBuilder('horaExtra')
        .leftJoinAndSelect('horaExtra.usuario', 'usuario')
        .leftJoinAndSelect('usuario.empleado', 'empleado')
        .leftJoinAndSelect('empleado.departamento', 'departamento')
        .leftJoinAndSelect('horaExtra.fotos', 'fotos')
        .where('horaExtra.record_asistencia_id IS NULL'); // Solo las independientes

      // Filtros horas extras
      if (empleadoId) {
        queryHorasExtras.andWhere('empleado.id = :empleadoId', { empleadoId });
      }
      if (nombreEmpleado) {
        queryHorasExtras.andWhere("CONCAT(empleado.nombre, ' ', empleado.apellido) ILIKE :nombreEmpleado", {
          nombreEmpleado: `%${nombreEmpleado}%`,
        });
      }
      if (departamentoId) {
        queryHorasExtras.andWhere('departamento.id = :departamentoId', { departamentoId });
      }
      if (fechaInicio && fechaFin) {
        // hora_inicio es timestamp: el límite superior debe cubrir todo el último día
        queryHorasExtras.andWhere('horaExtra.hora_inicio >= :inicioTs', {
          inicioTs: `${fechaInicio} 00:00:00`,
        });
        queryHorasExtras.andWhere('horaExtra.hora_inicio <= :finTs', {
          finTs: `${fechaFin} 23:59:59.999`,
        });
      }

      const horasExtras = await queryHorasExtras
        .orderBy('horaExtra.hora_inicio', 'DESC')
        .getMany();

      // Convertir registros de asistencia al formato de reportes
      const datosAsistencia = records.map((r) => {
        const ticketsDelDia = r.horasExtras || [];
        const todosRevisados = ticketsDelDia.length > 0 && ticketsDelDia.every((t) => t.estado_aprobacion !== 'pendiente');
        const horasExtras = todosRevisados
          ? ticketsDelDia.reduce((sum, t) => sum + (t.horas_aprobadas ? parseFloat(t.horas_aprobadas as any) : 0), 0)
          : r.horas_extra;
        const horasExtrasPendiente = ticketsDelDia.length > 0 && !todosRevisados;

        return {
        id: r.id,
        tipo: 'asistencia' as const,
        empleado: r.empleado.nombre + ' ' + r.empleado.apellido,
        departamento: r.empleado.departamento?.nombre,
        fecha: r.fecha,
        entrada: r.hora_entrada,
        salida: r.hora_salida,
        horasTrabajadas: r.horas_trabajadas,
        cierreAutomatico: r.cierre_automatico,
        totalPausas: r.total_pausas,
        horasExtras,
        horasExtrasPendiente,
        duracionHoraExtra: null,
        estado: r.estado,
        descripcionTrabajo: r.descripcion_trabajo || null,
        // Prioriza el proyecto que el propio técnico reportó ese día al cerrar
        // jornada; si el registro es anterior a esa función, se usa el cálculo
        // viejo basado en el grupo asignado (menos preciso, pero mejor que nada).
        proyecto: r.proyecto_trabajado || proyectoDelDia(r.empleado.grupo_id, r.fecha),
        fotos: [
          ...(r.fotos || []).map(f => ({
            id: f.id,
            tipo: f.tipo,
            url_foto: `${config.server.baseUrl}/uploads/${path.basename(f.url_foto)}`,
          })),
          // Prefijo "ext_" para distinguir fotos de hora extra en la misma fila
          ...(r.horasExtras?.flatMap(he => he.fotos || []).map(f => ({
            id: f.id,
            tipo: `ext_${f.tipo}`,
            url_foto: `${config.server.baseUrl}/uploads/${path.basename(f.url_foto)}`,
          })) || []),
        ],
        };
      });

      // Convertir horas extras al formato de reportes
      const datosHorasExtras = horasExtras.map((he) => {
        const duracion = he.duracion ? parseFloat(he.duracion as any) : null;
        return {
          id: he.id,
          tipo: 'horaExtra' as const,
          empleado: `${he.usuario?.empleado?.nombre} ${he.usuario?.empleado?.apellido}` || 'Desconocido',
          departamento: he.usuario?.empleado?.departamento?.nombre || '-',
          fecha: he.hora_inicio,
          entrada: null,
          salida: null,
          horasTrabajadas: null,
          totalPausas: null,
          horasExtras: null,
          duracionHoraExtra: duracion,
          estado: he.estado,
          fotos: he.fotos?.map(f => ({
            id: f.id,
            tipo: f.tipo,
            url_foto: `${config.server.baseUrl}/uploads/${path.basename(f.url_foto)}`,
          })) || [],
        };
      });

      // Días no trabajados por festivos/no laborables o trámites aprobados (solo si hay rango de fechas)
      const datosEventos = fechaInicio && fechaFin
        ? await this.obtenerDatosEventosSinAsistencia(records, empleadoId, departamentoId, fechaInicio, fechaFin)
        : [];

      // Combinar y ordenar por fecha
      const datos = [...datosAsistencia, ...datosHorasExtras, ...datosEventos].sort((a, b) => {
        const fechaA = new Date(a.fecha).getTime();
        const fechaB = new Date(b.fecha).getTime();
        return fechaB - fechaA; // Descendente
      });

      // Paginar el resultado combinado
      const skip = (page - 1) * limit;
      const datosPage = datos.slice(skip, skip + limit);

      console.log('Registros encontrados:', datos.length, 'En página:', datosPage.length);

      return {
        data: datosPage,
        total: datos.length,
        page,
        limit,
        pages: Math.ceil(datos.length / limit),
      };
    } catch (error) {
      console.error('Error en obtenerAsistencias:', error);
      throw error;
    }
  }

  /**
   * Genera filas sintéticas para días festivos/no laborables o trámites aprobados
   * en los que el empleado no tiene un registro de asistencia real
   */
  private async obtenerDatosEventosSinAsistencia(
    records: RecordAsistencia[],
    empleadoId: number | undefined,
    departamentoId: number | undefined,
    fechaInicio: string,
    fechaFin: string,
  ) {
    let queryEmpleados = this.empleadoRepository
      .createQueryBuilder('empleado')
      .leftJoinAndSelect('empleado.departamento', 'departamento')
      .where('empleado.estado = :estado', { estado: 'activo' });

    if (empleadoId) {
      queryEmpleados.andWhere('empleado.id = :empleadoId', { empleadoId });
    }
    if (departamentoId) {
      queryEmpleados.andWhere('empleado.departamento_id = :departamentoId', { departamentoId });
    }

    const empleados = await queryEmpleados.getMany();

    // Usamos strings YYYY-MM-DD para comparar contra la columna 'date', evitando
    // que TypeORM reformatee un Date con la zona horaria local y desplace el día
    const diasEspeciales = await this.diaCalendarioRepository.find({
      where: { fecha: Between(fechaInicio, fechaFin) },
      relations: ['empleadosExceptuados'],
    });

    const solicitudesAprobadas = await this.solicitudRepository
      .createQueryBuilder('solicitud')
      .where('solicitud.estado = :estado', { estado: 'aprobada' })
      .andWhere('solicitud.fecha_inicio <= :fechaFin', { fechaFin })
      .andWhere('COALESCE(solicitud.fecha_fin, solicitud.fecha_inicio) >= :fechaInicio', { fechaInicio })
      .getMany();

    // Fechas ya cubiertas por un registro de asistencia real (empleadoId-YYYY-MM-DD)
    const fechasConRegistro = new Set(
      records.map((r) => `${r.empleado.id}-${formatFechaLocal(r.fecha)}`),
    );

    const nombreTipoTramite: Record<string, string> = {
      vacaciones: 'Vacaciones',
      ausencia: 'Ausencia/Incapacidad',
      cambio_jornada: 'Cambio de jornada',
    };

    const eventos: any[] = [];
    const fechasDelRango = enumerarFechas(fechaInicio, fechaFin);

    for (const empleado of empleados) {
      for (const fechaStr of fechasDelRango) {
        const clave = `${empleado.id}-${fechaStr}`;
        if (fechasConRegistro.has(clave)) continue;

        const diaEspecial = diasEspeciales.find(
          (d) => formatFechaLocal(d.fecha) === fechaStr && !d.empleadosExceptuados?.some((e) => e.id === empleado.id),
        );
        const solicitud = solicitudesAprobadas.find((s) => {
          if (s.empleado_id !== empleado.id) return false;
          const inicio = formatFechaLocal(s.fecha_inicio);
          const fin = s.fecha_fin ? formatFechaLocal(s.fecha_fin) : inicio;
          return fechaStr >= inicio && fechaStr <= fin;
        });

        if (!diaEspecial && !solicitud) continue;

        const motivo = solicitud
          ? `${nombreTipoTramite[solicitud.tipo] || solicitud.tipo}${solicitud.motivo ? ' - ' + solicitud.motivo : ''}`
          : `${diaEspecial!.tipo === 'festivo' ? 'Feriado' : 'Día no laborable'} - ${diaEspecial!.nombre}`;

        eventos.push({
          id: `evento-${empleado.id}-${fechaStr}`,
          tipo: 'evento' as const,
          empleado: `${empleado.nombre} ${empleado.apellido}`,
          departamento: empleado.departamento?.nombre,
          fecha: fechaStr,
          entrada: null,
          salida: null,
          horasTrabajadas: null,
          totalPausas: null,
          horasExtras: null,
          duracionHoraExtra: null,
          estado: 'no_trabajado',
          motivo,
          fotos: [],
        });
      }
    }

    return eventos;
  }

  /**
   * Obtener resumen de estadísticas generales
   */
  async obtenerResumen() {
    try {
      // Presente hoy
      const presenteHoy = await this.recordAsistenciaRepository
        .createQueryBuilder('record')
        .where('record.fecha = :hoy', { hoy: hoyLocal() })
        .getCount();

      // Total empleados
      const totalEmpleados = await this.empleadoRepository
        .createQueryBuilder('empleado')
        .where('empleado.estado = :estado', { estado: 'activo' })
        .getCount();

      // Horas extras APROBADAS este mes (las pendientes de revisión no cuentan
      // hasta que el admin las apruebe, ver flujo de revisión de horas extra)
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);

      const resultado = await this.horaExtraRepository
        .createQueryBuilder('he')
        .select('SUM(CAST(he.horas_aprobadas AS NUMERIC))', 'totalExtras')
        .where('he.estado_aprobacion = :estado', { estado: 'aprobada' })
        .andWhere('he.hora_inicio BETWEEN :inicio AND :fin', { inicio: inicioMes, fin: finMes })
        .getRawOne();

      const horasExtrasAlMes = resultado?.totalExtras ? parseFloat(resultado.totalExtras) : 0;

      // Promedio de pausas
      const pausasPromedio = await this.recordAsistenciaRepository
        .createQueryBuilder('record')
        .select('AVG(CAST(record.total_pausas AS NUMERIC))', 'promedio')
        .getRawOne();

      const promedioPausas = pausasPromedio?.promedio ? parseFloat(pausasPromedio.promedio) : 0;

      return {
        presenteHoy: presenteHoy || 0,
        totalEmpleados: totalEmpleados || 0,
        horasExtrasAlMes: Math.round(horasExtrasAlMes * 100) / 100,
        promedioPausas: Math.round(promedioPausas * 100) / 100,
      };
    } catch (error) {
      console.error('Error en obtenerResumen:', error);
      return {
        presenteHoy: 0,
        totalEmpleados: 0,
        horasExtrasAlMes: 0,
        promedioPausas: 0,
      };
    }
  }

  /**
   * Obtener historial de un empleado
   */
  async obtenerHistorialEmpleado(empleadoId: number, meses: number = 3) {
    try {
      const fechaInicio = new Date();
      fechaInicio.setMonth(fechaInicio.getMonth() - meses);

      const records = await this.recordAsistenciaRepository
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.pausas', 'pausas')
        .where('record.empleado_id = :empleadoId', { empleadoId })
        .andWhere('record.fecha >= :fechaInicio', { fechaInicio: formatFechaLocal(fechaInicio) })
        .orderBy('record.fecha', 'DESC')
        .getMany();

      return {
        registros: records.length,
        diasTrabajados: records.filter((r) => r.estado === 'finalizado').length,
        totalHoras: records.reduce((sum, r) => sum + (r.horas_trabajadas || 0), 0),
        totalExtras: records.reduce((sum, r) => sum + (r.horas_extra || 0), 0),
        totalPausas: records.reduce((sum, r) => sum + (r.total_pausas || 0), 0),
        records: records.map((r) => ({
          id: r.id,
          fecha: r.fecha,
          entrada: r.hora_entrada,
          salida: r.hora_salida,
          horasTrabajadas: r.horas_trabajadas,
          horasExtras: r.horas_extra,
          totalPausas: r.total_pausas,
          pausas: r.pausas?.map((p) => ({
            tipo: p.tipo_pausa,
            inicio: p.hora_inicio,
            fin: p.hora_fin,
            duracion: p.duracion,
          })),
          estado: r.estado,
        })),
      };
    } catch (error) {
      console.error('Error en obtenerHistorialEmpleado:', error);
      return {
        registros: 0,
        diasTrabajados: 0,
        totalHoras: 0,
        totalExtras: 0,
        totalPausas: 0,
        records: [],
      };
    }
  }

  /**
   * Obtener asistencias por departamento
   */
  async obtenerPorDepartamento() {
    try {
      const result = await this.recordAsistenciaRepository
        .createQueryBuilder('record')
        .select("COALESCE(departamento.nombre, 'Sin departamento')", 'departamento')
        .addSelect('COUNT(record.id)', 'total')
        .addSelect("COUNT(CASE WHEN record.estado = 'finalizado' THEN 1 END)", 'presentes')
        .addSelect('AVG(CAST(record.horas_trabajadas AS NUMERIC))', 'promedio_horas')
        .addSelect('SUM(CAST(record.horas_extra AS NUMERIC))', 'total_extras')
        .leftJoin('record.empleado', 'empleado')
        .leftJoin('empleado.departamento', 'departamento')
        .groupBy('COALESCE(departamento.id, 0)')
        .addGroupBy("COALESCE(departamento.nombre, 'Sin departamento')")
        .getRawMany();

      return result.map((r) => ({
        departamento: r.departamento || 'Sin departamento',
        total: parseInt(r.total || 0),
        presentes: parseInt(r.presentes || 0),
        promedioHoras: r.promedio_horas ? parseFloat(r.promedio_horas) : 0,
        totalExtras: r.total_extras ? parseFloat(r.total_extras) : 0,
      }));
    } catch (error) {
      console.error('Error en obtenerPorDepartamento:', error);
      return [];
    }
  }

  /**
   * Diagnóstico - mostrar datos crudos de la BD
   */
  async diagnostico() {
    try {
      const records = await this.recordAsistenciaRepository
        .createQueryBuilder('record')
        .select('record.id')
        .addSelect('record.fecha_asistencia')
        .addSelect('record.check_in')
        .addSelect('record.check_out')
        .addSelect('record.horas_trabajadas')
        .addSelect('record.total_pausas')
        .addSelect('record.horas_extra')
        .limit(5)
        .orderBy('record.fecha_asistencia', 'DESC')
        .getRawMany();

      return {
        totalRecords: records.length,
        records: records.map(r => ({
          id: r.record_id,
          fecha: r.record_fecha_asistencia,
          checkIn: r.record_check_in,
          checkOut: r.record_check_out,
          horasTrabajadas: r.record_horas_trabajadas,
          totalPausas: r.record_total_pausas,
          horasExtra: r.record_horas_extra,
        })),
      };
    } catch (error) {
      console.error('Error en diagnostico:', error);
      throw error;
    }
  }

  /**
   * Recalcular horas trabajadas basado en check-in/check-out
   */
  async recalcularHoras() {
    try {
      // Obtener todos los registros con entrada/salida - QUERY CRUDA
      const registros = await this.recordAsistenciaRepository
        .query(`
          SELECT 
            id,
            check_in,
            check_out,
            horas_trabajadas
          FROM record_asistencia
          WHERE check_in IS NOT NULL AND check_out IS NOT NULL
          LIMIT 10
        `);

      console.log(`Total de registros con entrada/salida: ${registros.length}`);
      console.log('Registros crudos:', registros);

      let procesados = 0;
      for (const record of registros) {
        const entrada = new Date(record.check_in);
        const salida = new Date(record.check_out);
        const diffMs = salida.getTime() - entrada.getTime();
        const horas = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

        console.log(`Registro ${record.id}: ${entrada} - ${salida} = ${horas}h`);

        // Actualizar usando query cruda
        await this.recordAsistenciaRepository.query(
          `UPDATE record_asistencia SET horas_trabajadas = $1 WHERE id = $2`,
          [horas, record.id]
        );
        procesados++;
      }

      console.log(`Registros procesados: ${procesados}`);

      return {
        procesados,
        mensaje: `Se recalcularon ${procesados} registros`,
        totalEncontrados: registros.length,
      };
    } catch (error) {
      console.error('Error en recalcularHoras:', error);
      throw error;
    }
  }

  /**
   * Rango de fechas de un mes 'YYYY-MM', acotado a hoy si el mes está en curso
   * (para no contar como "pendientes" días que todavía no han ocurrido)
   */
  private rangoDelMes(mes: string): { fechaInicio: string; fechaFin: string } {
    const [anio, mesNum] = mes.split('-').map(Number);
    const fechaInicio = `${mes}-01`;
    const ultimoDia = new Date(anio, mesNum, 0).getDate();
    const finMes = `${mes}-${String(ultimoDia).padStart(2, '0')}`;
    const hoy = hoyLocal();
    return { fechaInicio, fechaFin: finMes < hoy ? finMes : hoy };
  }

  /**
   * Clasifica, para un conjunto de empleados y un rango de fechas, cada día como
   * 'reportado' (tiene check-out), 'justificado' (feriado/no laborable/permiso
   * aprobado — no cuenta como día laborable) o 'pendiente' (debía reportar y no lo hizo)
   */
  private async clasificarDias(empleados: Empleado[], fechaInicio: string, fechaFin: string) {
    if (fechaInicio > fechaFin || empleados.length === 0) {
      return { empleados, fechasDelRango: [] as string[], fechasConRegistro: new Set<string>(), diasEspeciales: [] as DiaCalendario[], solicitudesAprobadas: [] as SolicitudTramite[] };
    }

    const empleadoIds = empleados.map((e) => e.id);

    const records = await this.recordAsistenciaRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.empleado', 'empleado')
      .where('empleado.id IN (:...empleadoIds)', { empleadoIds })
      .andWhere('record.fecha BETWEEN :fechaInicio AND :fechaFin', { fechaInicio, fechaFin })
      .andWhere('record.check_out IS NOT NULL')
      .getMany();

    // Tickets de hora extra completados ese día también cuentan como "reportado",
    // aunque no haya check-in/check-out normal (p. ej. una emergencia en día no laborable)
    const horasExtraFinalizadas = await this.horaExtraRepository
      .createQueryBuilder('horaExtra')
      .leftJoinAndSelect('horaExtra.usuario', 'usuario')
      .leftJoinAndSelect('usuario.empleado', 'empleado')
      .where('empleado.id IN (:...empleadoIds)', { empleadoIds })
      .andWhere('horaExtra.estado = :estado', { estado: 'finalizada' })
      .andWhere('horaExtra.hora_inicio >= :inicioTs', { inicioTs: `${fechaInicio} 00:00:00` })
      .andWhere('horaExtra.hora_inicio <= :finTs', { finTs: `${fechaFin} 23:59:59.999` })
      .getMany();

    const diasEspeciales = await this.diaCalendarioRepository.find({
      where: { fecha: Between(fechaInicio, fechaFin) },
      relations: ['empleadosExceptuados'],
    });

    const solicitudesAprobadas = await this.solicitudRepository
      .createQueryBuilder('solicitud')
      .where('solicitud.estado = :estado', { estado: 'aprobada' })
      .andWhere('solicitud.empleado_id IN (:...empleadoIds)', { empleadoIds })
      .andWhere('solicitud.fecha_inicio <= :fechaFin', { fechaFin })
      .andWhere('COALESCE(solicitud.fecha_fin, solicitud.fecha_inicio) >= :fechaInicio', { fechaInicio })
      .getMany();

    const fechasConRegistro = new Set([
      ...records.map((r) => `${r.empleado.id}-${formatFechaLocal(r.fecha)}`),
      ...horasExtraFinalizadas
        .filter((he) => he.usuario?.empleado)
        .map((he) => `${he.usuario.empleado!.id}-${formatFechaLocal(he.hora_inicio)}`),
    ]);
    const fechasDelRango = enumerarFechas(fechaInicio, fechaFin);

    return { empleados, fechasDelRango, fechasConRegistro, diasEspeciales, solicitudesAprobadas };
  }

  private estadoDelDia(
    empleadoId: number,
    fecha: string,
    datos: { fechasConRegistro: Set<string>; diasEspeciales: DiaCalendario[]; solicitudesAprobadas: SolicitudTramite[] },
  ): 'reportado' | 'pendiente' | 'justificado' {
    if (datos.fechasConRegistro.has(`${empleadoId}-${fecha}`)) return 'reportado';

    const diaEspecial = datos.diasEspeciales.find(
      (d) => formatFechaLocal(d.fecha) === fecha && !d.empleadosExceptuados?.some((e) => e.id === empleadoId),
    );
    if (diaEspecial) return 'justificado';

    const solicitud = datos.solicitudesAprobadas.find((s) => {
      if (s.empleado_id !== empleadoId) return false;
      const inicio = formatFechaLocal(s.fecha_inicio);
      const fin = s.fecha_fin ? formatFechaLocal(s.fecha_fin) : inicio;
      return fecha >= inicio && fecha <= fin;
    });
    if (solicitud) return 'justificado';

    return 'pendiente';
  }

  /**
   * Cumplimiento de reportes (días con check-out) del mes, agregado por departamento
   * y desglosado por empleado, excluyendo del cálculo los días no laborables
   */
  async obtenerCumplimientoReportes(mes: string, departamentoId?: number) {
    const { fechaInicio, fechaFin } = this.rangoDelMes(mes);

    let queryEmpleados = this.empleadoRepository
      .createQueryBuilder('empleado')
      .leftJoinAndSelect('empleado.departamento', 'departamento')
      .where('empleado.estado = :estado', { estado: 'activo' });

    if (departamentoId) {
      queryEmpleados.andWhere('empleado.departamento_id = :departamentoId', { departamentoId });
    }

    const empleados = await queryEmpleados.getMany();
    const datos = await this.clasificarDias(empleados, fechaInicio, fechaFin);

    const resumenEmpleados = empleados.map((empleado) => {
      let reportados = 0;
      let pendientes = 0;

      for (const fecha of datos.fechasDelRango) {
        const estado = this.estadoDelDia(empleado.id, fecha, datos);
        if (estado === 'reportado') reportados++;
        else if (estado === 'pendiente') pendientes++;
      }

      const diasLaborables = reportados + pendientes;
      return {
        empleadoId: empleado.id,
        nombre: `${empleado.nombre} ${empleado.apellido}`,
        departamentoId: empleado.departamento_id,
        departamento: empleado.departamento?.nombre || '-',
        diasLaborables,
        diasReportados: reportados,
        diasPendientes: pendientes,
        porcentaje: diasLaborables > 0 ? Math.round((reportados / diasLaborables) * 100) : 0,
      };
    });

    const departamentosMap = new Map<number, { departamentoId: number; departamento: string; diasLaborables: number; diasReportados: number; diasPendientes: number; empleados: typeof resumenEmpleados }>();

    for (const item of resumenEmpleados) {
      if (!departamentosMap.has(item.departamentoId)) {
        departamentosMap.set(item.departamentoId, {
          departamentoId: item.departamentoId,
          departamento: item.departamento,
          diasLaborables: 0,
          diasReportados: 0,
          diasPendientes: 0,
          empleados: [],
        });
      }
      const grupo = departamentosMap.get(item.departamentoId)!;
      grupo.diasLaborables += item.diasLaborables;
      grupo.diasReportados += item.diasReportados;
      grupo.diasPendientes += item.diasPendientes;
      grupo.empleados.push(item);
    }

    const departamentos = Array.from(departamentosMap.values())
      .map((d) => ({
        ...d,
        porcentaje: d.diasLaborables > 0 ? Math.round((d.diasReportados / d.diasLaborables) * 100) : 0,
      }))
      .sort((a, b) => a.departamento.localeCompare(b.departamento));

    return { mes, departamentos };
  }

  /**
   * Detalle día por día del cumplimiento de reportes de un empleado en un mes
   */
  async obtenerDetalleCumplimientoEmpleado(empleadoId: number, mes: string) {
    const { fechaInicio, fechaFin } = this.rangoDelMes(mes);

    const empleado = await this.empleadoRepository.findOne({ where: { id: empleadoId } });
    if (!empleado) {
      return { empleadoId, nombre: null, dias: [] };
    }

    const datos = await this.clasificarDias([empleado], fechaInicio, fechaFin);

    const dias = datos.fechasDelRango.map((fecha) => ({
      fecha,
      estado: this.estadoDelDia(empleadoId, fecha, datos),
    }));

    return {
      empleadoId,
      nombre: `${empleado.nombre} ${empleado.apellido}`,
      dias,
    };
  }

  /**
   * Horas extra aprobadas (total o parcial) del mes, agregadas por departamento
   * y desglosadas por técnico. `horas_aprobadas` ya refleja el monto aprobado
   * sea total o parcial, así que sumarlo cubre ambos casos.
   */
  async obtenerHorasAprobadas(mes: string, departamentoId?: number) {
    const [anio, mesNum] = mes.split('-').map(Number);
    const inicioMes = new Date(anio, mesNum - 1, 1);
    const finMes = new Date(anio, mesNum, 0, 23, 59, 59, 999);

    let query = this.horaExtraRepository
      .createQueryBuilder('he')
      .innerJoin('he.usuario', 'usuario')
      .innerJoin('usuario.empleado', 'empleado')
      .innerJoin('empleado.departamento', 'departamento')
      .select('empleado.id', 'empleadoId')
      .addSelect('empleado.nombre', 'nombre')
      .addSelect('empleado.apellido', 'apellido')
      .addSelect('departamento.id', 'departamentoId')
      .addSelect('departamento.nombre', 'departamento')
      .addSelect('SUM(CAST(he.horas_aprobadas AS NUMERIC))', 'totalHoras')
      .addSelect('COUNT(he.id)', 'totalTickets')
      .where('he.estado_aprobacion = :estado', { estado: 'aprobada' })
      .andWhere('he.hora_inicio BETWEEN :inicio AND :fin', { inicio: inicioMes, fin: finMes })
      .groupBy('empleado.id')
      .addGroupBy('empleado.nombre')
      .addGroupBy('empleado.apellido')
      .addGroupBy('departamento.id')
      .addGroupBy('departamento.nombre');

    if (departamentoId) {
      query = query.andWhere('departamento.id = :departamentoId', { departamentoId });
    }

    const filas = await query.getRawMany();

    const tecnicos = filas.map((f) => ({
      empleadoId: parseInt(f.empleadoId, 10),
      nombre: `${f.nombre} ${f.apellido}`,
      departamentoId: parseInt(f.departamentoId, 10),
      departamento: f.departamento as string,
      totalHoras: Math.round(parseFloat(f.totalHoras || '0') * 100) / 100,
      totalTickets: parseInt(f.totalTickets, 10),
    }));

    const departamentosMap = new Map<number, { departamentoId: number; departamento: string; totalHoras: number; tecnicos: typeof tecnicos }>();

    for (const t of tecnicos) {
      if (!departamentosMap.has(t.departamentoId)) {
        departamentosMap.set(t.departamentoId, {
          departamentoId: t.departamentoId,
          departamento: t.departamento,
          totalHoras: 0,
          tecnicos: [],
        });
      }
      const grupo = departamentosMap.get(t.departamentoId)!;
      grupo.totalHoras += t.totalHoras;
      grupo.tecnicos.push(t);
    }

    const departamentos = Array.from(departamentosMap.values())
      .map((d) => ({
        ...d,
        totalHoras: Math.round(d.totalHoras * 100) / 100,
        tecnicos: d.tecnicos.sort((a, b) => b.totalHoras - a.totalHoras),
      }))
      .sort((a, b) => a.departamento.localeCompare(b.departamento));

    return { mes, departamentos };
  }
}
