import { AppDataSource } from '@config/database';
import { HoraExtra } from '@entities/HoraExtra';
import { RecordAsistencia } from '@entities/RecordAsistencia';
import { Usuario } from '@entities/Usuario';
import { Empleado } from '@entities/Empleado';
import { FotoAsistencia } from '@entities/FotoAsistencia';
import { OperationalError } from '@middleware/errorHandler';
import { config } from '@config/env';
import { resolverFechaCaptura } from '@utils/fecha.utils';
import path from 'path';

export class HoraExtraService {
  private horaExtraRepository = AppDataSource.getRepository(HoraExtra);
  private recordAsistenciaRepository = AppDataSource.getRepository(RecordAsistencia);
  private usuarioRepository = AppDataSource.getRepository(Usuario);
  private empleadoRepository = AppDataSource.getRepository(Empleado);
  private fotoRepository = AppDataSource.getRepository(FotoAsistencia);

  /**
   * Iniciar hora extra
   * Completamente independiente de RecordAsistencia
   */
  async iniciarHoraExtra(
    recordAsistenciaId: number | undefined,
    numeroTicket: string,
    latitud: number | null,
    longitud: number | null,
    fotoPath?: string,
    usuarioId?: number,
    capturadoEn?: string,
    tipoTrabajo?: string,
  ): Promise<HoraExtra> {
    try {
      // Crear hora extra SIN RecordAsistencia pero CON usuario_id
      // Hora extra es completamente independiente
      const horaExtra = new HoraExtra();
      horaExtra.usuario_id = usuarioId || 0; // Necesario para identificar al usuario
      horaExtra.record_asistencia_id = recordAsistenciaId || undefined; // Puede ser undefined
      horaExtra.numero_ticket = numeroTicket;
      horaExtra.tipo_trabajo = tipoTrabajo === 'averia' ? 'averia' : tipoTrabajo === 'motivo' ? 'motivo' : 'instalacion';
      horaExtra.hora_inicio = resolverFechaCaptura(capturadoEn);
      horaExtra.latitud_inicio = latitud;
      horaExtra.longitud_inicio = longitud;
      horaExtra.estado = 'iniciada';

      const resultado = await this.horaExtraRepository.save(horaExtra);
      console.log('Hora extra iniciada:', resultado.id, 'Usuario:', usuarioId, 'RecordAsistencia:', recordAsistenciaId || 'sin registro');
      return resultado;
    } catch (error) {
      console.error('Error al iniciar hora extra:', error);
      throw error;
    }
  }

  /**
   * Finalizar hora extra
   */
  async finalizarHoraExtra(
    horaExtraId: number,
    latitud: number | null,
    longitud: number | null,
    fotoPath?: string, // Ruta de la foto subida
    capturadoEn?: string,
  ): Promise<HoraExtra> {
    try {
      const horaExtra = await this.horaExtraRepository.findOne({
        where: { id: horaExtraId },
      });

      if (!horaExtra) {
        throw new Error('Hora extra no encontrada');
      }

      if (horaExtra.estado === 'finalizada') {
        throw new Error('Hora extra ya fue finalizada');
      }

      // Calcular duración en horas
      const ahora = resolverFechaCaptura(capturadoEn);
      const inicio = new Date(horaExtra.hora_inicio);
      const duracionMs = ahora.getTime() - inicio.getTime();
      const duracionHoras = duracionMs / (1000 * 60 * 60);

      horaExtra.hora_fin = ahora;
      horaExtra.latitud_fin = latitud;
      horaExtra.longitud_fin = longitud;
      horaExtra.duracion = Math.round(duracionHoras * 100) / 100; // Redondear a 2 decimales
      horaExtra.estado = 'finalizada';

      const resultado = await this.horaExtraRepository.save(horaExtra);

      // Guardar foto de salida si existe
      if (fotoPath) {
        await this.guardarFotoHoraExtra(resultado.id, 'salida', fotoPath);
      }

      // Actualizar horas_extra en record_asistencia
      await this.recordAsistenciaRepository
        .createQueryBuilder()
        .update(RecordAsistencia)
        .set({
          horas_extra: () => `horas_extra + ${resultado.duracion}`,
        })
        .where('id = :id', { id: horaExtra.record_asistencia_id })
        .execute();

      console.log('Hora extra finalizada:', resultado.id, 'Duración:', resultado.duracion, 'horas');
      return resultado;
    } catch (error) {
      console.error('Error al finalizar hora extra:', error);
      throw error;
    }
  }

  /**
   * Obtener horas extras activas de un registro
   */
  async obtenerHorasExtrasActivas(recordAsistenciaId: number): Promise<HoraExtra[]> {
    try {
      const horasExtras = await this.horaExtraRepository.find({
        where: {
          record_asistencia_id: recordAsistenciaId,
          estado: 'iniciada',
        },
        order: { hora_inicio: 'DESC' },
      });

      return horasExtras;
    } catch (error) {
      console.error('Error al obtener horas extras activas:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de horas extras de un registro
   */
  async obtenerHistorial(recordAsistenciaId: number): Promise<HoraExtra[]> {
    try {
      const horasExtras = await this.horaExtraRepository.find({
        where: { record_asistencia_id: recordAsistenciaId },
        order: { hora_inicio: 'DESC' },
      });

      return horasExtras;
    } catch (error) {
      console.error('Error al obtener historial de horas extras:', error);
      throw error;
    }
  }

  /**
   * Obtener hora extra por ID
   */
  async obtenerPorId(id: number): Promise<HoraExtra | null> {
    try {
      const horaExtra = await this.horaExtraRepository.findOne({
        where: { id },
        relations: ['record'],
      });

      return horaExtra || null;
    } catch (error) {
      console.error('Error al obtener hora extra:', error);
      throw error;
    }
  }

  /**
   * Obtener la hora extra activa del usuario autenticado
   */
  async obtenerHoraExtraActivaDelUsuario(usuarioId: number): Promise<HoraExtra | null> {
    try {
      // Buscar hora extra activa del usuario directamente (sin depender de RecordAsistencia)
      const horaExtra = await this.horaExtraRepository.findOne({
        where: {
          usuario_id: usuarioId,
          estado: 'iniciada',
        },
        order: { hora_inicio: 'DESC' },
      });

      return horaExtra || null;
    } catch (error) {
      console.error('Error al obtener hora extra activa del usuario:', error);
      return null;
    }
  }

  /**
   * Obtener todas las horas extras (activas y finalizadas)
   * Incluye información del empleado y departamento. Si se pasa departamentoId
   * (líder), se restringe a las de ese departamento.
   */
  async obtenerTodasHorasExtras(departamentoId?: number[]) {
    try {
      let query = this.horaExtraRepository
        .createQueryBuilder('he')
        .leftJoinAndSelect('he.record', 'record')
        .leftJoinAndSelect('record.empleado', 'recordEmpleado')
        .leftJoinAndSelect('recordEmpleado.departamento', 'recordDepartamento')
        .leftJoinAndSelect('he.usuario', 'usuario')
        .leftJoinAndSelect('usuario.empleado', 'usuarioEmpleado')
        .leftJoinAndSelect('usuarioEmpleado.departamento', 'usuarioDepartamento')
        .leftJoinAndSelect('he.fotos', 'fotos')
        .orderBy('he.hora_inicio', 'DESC');

      if (departamentoId?.length) {
        query = query.andWhere(
          '(recordEmpleado.departamento_id IN (:...departamentoId) OR usuarioEmpleado.departamento_id IN (:...departamentoId))',
          { departamentoId },
        );
      }

      const horasExtras = await query.getMany();

      // Mapear los resultados para incluir nombre del empleado y departamento.
      // El ticket puede venir ligado a un RecordAsistencia o ser independiente
      // (creado sin check-in previo), por eso se resuelve el empleado por
      // cualquiera de las dos rutas.
      return horasExtras.map((horaExtra: any) => {
        const empleado = horaExtra.record?.empleado || horaExtra.usuario?.empleado;
        return {
          ...horaExtra,
          empleado_nombre: empleado?.nombre || '-',
          empleado_apellido: empleado?.apellido || '-',
          empleado_nombre_completo: empleado ? `${empleado.nombre} ${empleado.apellido}` : '-',
          departamento_nombre: empleado?.departamento?.nombre || '-',
          fotos: horaExtra.fotos?.map((f: any) => ({
            id: f.id,
            tipo: f.tipo,
            url_foto: `${config.server.baseUrl}/uploads/${path.basename(f.url_foto)}`,
          })) || [],
        };
      });
    } catch (error) {
      console.error('Error al obtener todas las horas extras:', error);
      throw error;
    }
  }

  /**
   * Obtener las horas extras del propio usuario logueado (empleado consultando lo suyo)
   */
  async obtenerMisHorasExtras(usuarioId: number) {
    try {
      const horasExtras = await this.horaExtraRepository.find({
        where: { usuario_id: usuarioId },
        relations: ['fotos'],
        order: { hora_inicio: 'DESC' },
      });

      return horasExtras.map((horaExtra: any) => ({
        ...horaExtra,
        fotos: horaExtra.fotos?.map((f: any) => ({
          id: f.id,
          tipo: f.tipo,
          url_foto: `${config.server.baseUrl}/uploads/${path.basename(f.url_foto)}`,
        })) || [],
      }));
    } catch (error) {
      console.error('Error al obtener mis horas extras:', error);
      throw error;
    }
  }

  /**
   * Aprobar, ajustar (parcial) o rechazar las horas de un ticket finalizado.
   */
  async revisarHoraExtra(
    horaExtraId: number,
    adminUsuarioId: number,
    horasAprobadas: number,
    motivo?: string,
    departamentoIdRestringido?: number[],
  ): Promise<HoraExtra> {
    const horaExtra = await this.horaExtraRepository.findOne({
      where: { id: horaExtraId },
      relations: ['usuario', 'usuario.empleado'],
    });

    if (!horaExtra) {
      throw new OperationalError(404, 'Hora extra no encontrada');
    }

    // Un líder solo puede revisar horas extra de empleados de sus propios departamentos
    if (
      departamentoIdRestringido !== undefined &&
      !departamentoIdRestringido.includes(horaExtra.usuario?.empleado?.departamento_id!)
    ) {
      throw new OperationalError(403, 'No tienes permisos para revisar horas extra de otro departamento');
    }

    if (horaExtra.estado !== 'finalizada') {
      throw new OperationalError(400, 'Solo se pueden revisar horas extra ya finalizadas');
    }

    if (typeof horasAprobadas !== 'number' || isNaN(horasAprobadas) || horasAprobadas < 0) {
      throw new OperationalError(400, 'horas_aprobadas debe ser un número mayor o igual a 0');
    }

    const duracionReportada = horaExtra.duracion || 0;
    if (horasAprobadas > duracionReportada) {
      throw new OperationalError(400, 'Las horas aprobadas no pueden ser mayores a las reportadas');
    }

    if (horasAprobadas < duracionReportada && !motivo?.trim()) {
      throw new OperationalError(400, 'Debes indicar un motivo cuando apruebas menos horas de las reportadas');
    }

    horaExtra.estado_aprobacion = horasAprobadas === 0 ? 'rechazada' : 'aprobada';
    horaExtra.horas_aprobadas = horasAprobadas;
    horaExtra.motivo_ajuste = motivo?.trim() || null;
    horaExtra.aprobador_id = adminUsuarioId;
    horaExtra.fecha_aprobacion = new Date();

    return this.horaExtraRepository.save(horaExtra);
  }

  /**
   * Guardar foto de hora extra
   */
  async guardarFotoHoraExtra(horaExtraId: number, tipo: string, urlFoto: string): Promise<void> {
    try {
      const foto = new FotoAsistencia();
      foto.hora_extra_id = horaExtraId;
      foto.tipo = tipo;
      foto.url_foto = urlFoto;
      foto.fecha_captura = new Date();

      await this.fotoRepository.save(foto);
      console.log('Foto de hora extra guardada:', horaExtraId, tipo);
    } catch (error) {
      console.error('Error al guardar foto de hora extra:', error);
      throw error;
    }
  }
}
