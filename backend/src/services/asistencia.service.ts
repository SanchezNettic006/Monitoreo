import { AppDataSource } from '@config/database';
import { RecordAsistencia } from '@entities/RecordAsistencia';
import { FotoAsistencia } from '@entities/FotoAsistencia';
import { Empleado } from '@entities/Empleado';
import { PausaAsistencia, TipoPausa, EstadoPausa } from '@entities/PausaAsistencia';
import { HoraExtra } from '@entities/HoraExtra';
import { OperationalError } from '@middleware/errorHandler';
import { formatFechaLocal, hoyLocal, resolverFechaCaptura } from '@utils/fecha.utils';
import { Between, IsNull } from 'typeorm';

export class AsistenciaService {
  private recordRepository = AppDataSource.getRepository(RecordAsistencia);
  private fotoRepository = AppDataSource.getRepository(FotoAsistencia);
  private horaExtraRepository = AppDataSource.getRepository(HoraExtra);
  private empleadoRepository = AppDataSource.getRepository(Empleado);
  private pausaRepository = AppDataSource.getRepository(PausaAsistencia);

  async registrarEntrada(
    usuarioId: number,
    gps: { latitud: number; longitud: number } | null,
    fotaPath?: string,
    capturadoEn?: string,
  ) {
    const empleado = await this.empleadoRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado para este usuario');
    }

    const fechaCaptura = resolverFechaCaptura(capturadoEn);

    // Día laboral en la zona horaria del servidor ('YYYY-MM-DD'), no en UTC
    const hoyStr = hoyLocal();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Verificar si ya hay un registro de hoy sin salida
    const recordExistente = await this.recordRepository.findOne({
      where: { empleado: { id: empleado.id }, fecha: hoyStr, hora_salida: IsNull() },
    });

    if (recordExistente) {
      throw new OperationalError(400, 'Ya tienes una entrada activa. Debes registrar la salida primero.');
    }

    // Crear registro
    const record = this.recordRepository.create({
      empleado,
      fecha: hoyStr,
      hora_entrada: fechaCaptura,
      latitud_entrada: gps?.latitud ?? null,
      longitud_entrada: gps?.longitud ?? null,
      estado: 'presente',
    });

    const recordGuardado = await this.recordRepository.save(record);

    // Vincular horas extra iniciadas antes del check-in (mismo día, mismo usuario, sin registro)
    const finDia = new Date(hoy);
    finDia.setHours(23, 59, 59, 999);

    const horasExtraSinVincular = await this.horaExtraRepository.find({
      where: { usuario_id: usuarioId, record_asistencia_id: IsNull(), hora_inicio: Between(hoy, finDia) },
    });

    if (horasExtraSinVincular.length > 0) {
      await this.horaExtraRepository
        .createQueryBuilder()
        .update(HoraExtra)
        .set({ record_asistencia_id: recordGuardado.id })
        .where('id IN (:...ids)', { ids: horasExtraSinVincular.map((he) => he.id) })
        .execute();

      const sumaDuracion = horasExtraSinVincular.reduce((sum, he) => sum + (he.duracion || 0), 0);
      if (sumaDuracion > 0) {
        recordGuardado.horas_extra = sumaDuracion;
        await this.recordRepository.save(recordGuardado);
      }
    }

    // Guardar foto si existe
    if (fotaPath) {
      const foto = this.fotoRepository.create({
        record: recordGuardado,
        tipo: 'entrada',
        url_foto: fotaPath,
        fecha_captura: new Date(),
      });

      await this.fotoRepository.save(foto);
    }

    return {
      mensaje: '✅ Entrada registrada exitosamente',
      record: recordGuardado,
    };
  }

  async registrarSalida(
    usuarioId: number,
    gps: { latitud: number; longitud: number } | null,
    fotaPath?: string,
    capturadoEn?: string,
  ) {
    const fechaCaptura = resolverFechaCaptura(capturadoEn);
    const empleado = await this.empleadoRepository.findOne({
      where: { usuario_id: usuarioId },
      relations: ['departamento'],
    });

    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado para este usuario');
    }

    const record = await this.recordRepository.findOne({
      where: { empleado: { id: empleado.id }, fecha: hoyLocal() },
      relations: ['fotos', 'empleado'],
    });

    if (!record) {
      throw new OperationalError(400, 'No hay registro de entrada. Debes hacer check-in primero.');
    }

    if (record.hora_salida) {
      throw new OperationalError(400, 'Ya existe registro de salida para hoy');
    }

    // Actualizar salida
    record.hora_salida = fechaCaptura;
    record.latitud_salida = gps?.latitud ?? null;
    record.longitud_salida = gps?.longitud ?? null;

    // Calcular horas trabajadas (en horas)
    const msEntrada = new Date(record.hora_entrada).getTime();
    const msSalida = new Date(record.hora_salida).getTime();
    const diffMs = msSalida - msEntrada;
    record.horas_trabajadas = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    const recordActualizado = await this.recordRepository.save(record);

    // Guardar foto si existe
    if (fotaPath) {
      const foto = this.fotoRepository.create({
        record: recordActualizado,
        tipo: 'salida',
        url_foto: fotaPath,
        fecha_captura: new Date(),
      });

      await this.fotoRepository.save(foto);
    }

    return {
      mensaje: '✅ Salida registrada exitosamente',
      record: recordActualizado,
      requiereReporteCierre: !!empleado.departamento?.requiere_reporte_cierre,
    };
  }

  /**
   * Reporte de cierre (descripción + fotos del trabajo realizado) exigido a
   * departamentos con `requiere_reporte_cierre` (p. ej. Taller) al terminar jornada
   */
  async guardarReporteCierre(
    usuarioId: number,
    recordId: number,
    descripcion: string,
    fotoPaths: string[],
  ) {
    const empleado = await this.empleadoRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado para este usuario');
    }

    const record = await this.recordRepository.findOne({
      where: { id: recordId, empleado: { id: empleado.id } },
    });

    if (!record) {
      throw new OperationalError(404, 'Registro de asistencia no encontrado');
    }

    if (!record.hora_salida) {
      throw new OperationalError(400, 'Debes finalizar tu jornada antes de enviar el reporte de cierre');
    }

    if (!descripcion?.trim()) {
      throw new OperationalError(400, 'La descripción del trabajo realizado es obligatoria');
    }

    if (fotoPaths.length < 3) {
      throw new OperationalError(400, 'Debes adjuntar al menos 3 fotos del trabajo realizado');
    }

    record.descripcion_trabajo = descripcion.trim();
    await this.recordRepository.save(record);

    const fotos = fotoPaths.map((ruta) =>
      this.fotoRepository.create({
        record,
        tipo: 'reporte_cierre',
        url_foto: ruta,
        fecha_captura: new Date(),
      }),
    );
    await this.fotoRepository.save(fotos);

    return { mensaje: '✅ Reporte de cierre guardado exitosamente' };
  }

  async obtenerRegistros(empleadoId: number, desde?: Date, hasta?: Date) {
    const query = this.recordRepository
      .createQueryBuilder('record')
      .where('record.empleadoId = :empleadoId', { empleadoId })
      .leftJoinAndSelect('record.fotos', 'fotos')
      .leftJoinAndSelect('record.comentarios', 'comentarios')
      .orderBy('record.fecha', 'DESC');

    // La columna es 'date': se compara contra 'YYYY-MM-DD' para no perder el día
    // límite al castear un timestamp con hora
    if (desde) {
      query.andWhere('record.fecha >= :desde', { desde: formatFechaLocal(desde) });
    }

    if (hasta) {
      query.andWhere('record.fecha <= :hasta', { hasta: formatFechaLocal(hasta) });
    }

    return await query.getMany();
  }

  async obtenerRegistroHoy(usuarioId: number) {
    const empleado = await this.empleadoRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!empleado) {
      return {
        mensaje: 'Empleado no encontrado para este usuario',
        record: null,
        estado: 'error',
      };
    }

    const record = await this.recordRepository.findOne({
      where: { empleado: { id: empleado.id }, fecha: hoyLocal() },
      relations: ['fotos', 'comentarios', 'empleado'],
    });

    if (!record) {
      return {
        mensaje: 'Sin registro de asistencia hoy',
        record: null,
        estado: 'sin_registro',
      };
    }

    const estado = record.hora_salida ? 'finalizado' : 'activo';

    return {
      mensaje: 'Registro encontrado',
      record,
      estado,
    };
  }

  /**
   * Obtener resumen de asistencia (últimos 30 días)
   */
  async obtenerResumen(empleadoId: number) {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    hace30Dias.setHours(0, 0, 0, 0);

    const registros = await this.recordRepository.find({
      where: { empleado: { id: empleadoId } },
      relations: ['fotos'],
      order: { fecha: 'DESC' },
    });

    const totalDias = registros.length;
    const totalHoras = registros.reduce(
      (sum, r) => sum + (r.horas_trabajadas || 0),
      0
    );
    const totalExtras = registros.reduce(
      (sum, r) => sum + (r.horas_extra || 0),
      0
    );

    return {
      periodo: 'Últimos 30 días',
      totalDias,
      totalHoras: totalHoras.toFixed(2),
      totalExtras: totalExtras.toFixed(2),
      registros,
    };
  }

  /**
   * Iniciar pausa
   */
  async iniciarPausa(recordId: number, tipoPausa: TipoPausa) {
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
      relations: ['pausas'],
    });

    if (!record) {
      throw new OperationalError(404, 'Registro de asistencia no encontrado');
    }

    // Verificar que no haya pausa activa
    const pausaActiva = await this.pausaRepository.findOne({
      where: { record: { id: recordId }, estado: EstadoPausa.PAUSA_ACTIVA },
    });

    if (pausaActiva) {
      throw new OperationalError(400, 'Ya hay una pausa activa. Debes finalizarla primero.');
    }

    // Crear nueva pausa
    const pausa = this.pausaRepository.create({
      record,
      tipo_pausa: tipoPausa,
      hora_inicio: new Date(),
      estado: EstadoPausa.PAUSA_ACTIVA,
    });

    const pausaGuardada = await this.pausaRepository.save(pausa);

    return {
      mensaje: `✅ Pausa ${tipoPausa} iniciada`,
      pausa: pausaGuardada,
    };
  }

  /**
   * Finalizar pausa
   */
  async finalizarPausa(recordId: number) {
    const pausaActiva = await this.pausaRepository.findOne({
      where: { record: { id: recordId }, estado: EstadoPausa.PAUSA_ACTIVA },
      relations: ['record'],
    });

    if (!pausaActiva) {
      throw new OperationalError(404, 'No hay pausa activa para finalizar');
    }

    const ahora = new Date();
    pausaActiva.hora_fin = ahora;
    pausaActiva.estado = EstadoPausa.FINALIZADA;

    // Calcular duración en horas
    const msInicio = pausaActiva.hora_inicio.getTime();
    const msFin = ahora.getTime();
    const duracionHoras = (msFin - msInicio) / (1000 * 60 * 60);
    pausaActiva.duracion = Math.round(duracionHoras * 100) / 100;

    const pausaGuardada = await this.pausaRepository.save(pausaActiva);

    // Actualizar total_pausas en record
    const record = pausaActiva.record;
    const totalPausas = await this.pausaRepository.find({
      where: { record: { id: recordId }, estado: EstadoPausa.FINALIZADA },
    });

    const totalDuracion = totalPausas.reduce((sum, p) => sum + (p.duracion || 0), 0);
    record.total_pausas = totalDuracion;
    await this.recordRepository.save(record);

    return {
      mensaje: `✅ Pausa finalizada (${pausaGuardada.duracion} horas)`,
      pausa: pausaGuardada,
      total_pausas: totalDuracion,
    };
  }

  /**
   * Obtener pausas de un registro
   */
  async obtenerPausas(recordId: number) {
    const pausas = await this.pausaRepository.find({
      where: { record: { id: recordId } },
      order: { hora_inicio: 'ASC' },
    });

    const totalPausas = pausas
      .filter((p) => p.duracion)
      .reduce((sum, p) => sum + (p.duracion || 0), 0);

    return {
      pausas,
      total: totalPausas.toFixed(2),
      cantidad: pausas.length,
    };
  }
}
