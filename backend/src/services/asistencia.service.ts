import { AppDataSource } from '@config/database';
import { RecordAsistencia } from '@entities/RecordAsistencia';
import { FotoAsistencia } from '@entities/FotoAsistencia';
import { Empleado } from '@entities/Empleado';
import { OperationalError } from '@middleware/errorHandler';

export class AsistenciaService {
  private recordRepository = AppDataSource.getRepository(RecordAsistencia);
  private fotoRepository = AppDataSource.getRepository(FotoAsistencia);
  private empleadoRepository = AppDataSource.getRepository(Empleado);

  async registrarEntrada(
    usuarioId: number,
    gps: { latitud: number; longitud: number },
    fotaPath?: string,
  ) {
    const empleado = await this.empleadoRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado para este usuario');
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Verificar si ya hay un registro de hoy sin salida
    const recordExistente = await this.recordRepository.findOne({
      where: { empleado: { id: empleado.id }, fecha: hoy, hora_salida: null },
    });

    if (recordExistente) {
      throw new OperationalError(400, 'Ya tienes una entrada activa. Debes registrar la salida primero.');
    }

    // Crear registro
    const record = this.recordRepository.create({
      empleado,
      fecha: new Date(),
      hora_entrada: new Date(),
      latitud_entrada: gps.latitud,
      longitud_entrada: gps.longitud,
      estado: 'presente',
    });

    const recordGuardado = await this.recordRepository.save(record);

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
    gps: { latitud: number; longitud: number },
    fotaPath?: string,
  ) {
    const empleado = await this.empleadoRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado para este usuario');
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const record = await this.recordRepository.findOne({
      where: { empleado: { id: empleado.id }, fecha: hoy },
      relations: ['fotos', 'empleado'],
    });

    if (!record) {
      throw new OperationalError(400, 'No hay registro de entrada. Debes hacer check-in primero.');
    }

    if (record.hora_salida) {
      throw new OperationalError(400, 'Ya existe registro de salida para hoy');
    }

    // Actualizar salida
    record.hora_salida = new Date();
    record.latitud_salida = gps.latitud;
    record.longitud_salida = gps.longitud;

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
    };
  }

  async obtenerRegistros(empleadoId: number, desde?: Date, hasta?: Date) {
    const query = this.recordRepository
      .createQueryBuilder('record')
      .where('record.empleadoId = :empleadoId', { empleadoId })
      .leftJoinAndSelect('record.fotos', 'fotos')
      .leftJoinAndSelect('record.comentarios', 'comentarios')
      .orderBy('record.fecha', 'DESC');

    if (desde) {
      query.andWhere('record.fecha >= :desde', { desde });
    }

    if (hasta) {
      query.andWhere('record.fecha <= :hasta', { hasta });
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

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const record = await this.recordRepository.findOne({
      where: { empleado: { id: empleado.id }, fecha: hoy },
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
}
