import { AppDataSource } from '@config/database';
import { DiaCalendario, TipoDiaCalendario } from '@entities/DiaCalendario';
import { SolicitudTramite } from '@entities/SolicitudTramite';
import { Empleado } from '@entities/Empleado';
import { OperationalError } from '@middleware/errorHandler';
import { hoyLocal } from '@utils/fecha.utils';
import { Between, MoreThanOrEqual, In } from 'typeorm';

export class CalendarioService {
  private diaCalendarioRepository = AppDataSource.getRepository(DiaCalendario);
  private solicitudRepository = AppDataSource.getRepository(SolicitudTramite);
  private empleadoRepository = AppDataSource.getRepository(Empleado);

  async crearDia(
    fecha: string,
    tipo: TipoDiaCalendario,
    nombre: string,
    empleadosExceptuadosIds?: number[],
  ): Promise<DiaCalendario> {
    const existente = await this.diaCalendarioRepository.findOne({ where: { fecha } });
    if (existente) {
      throw new OperationalError(400, 'Ya existe un día especial registrado para esa fecha');
    }

    const dia = this.diaCalendarioRepository.create({ fecha, tipo, nombre });

    if (empleadosExceptuadosIds?.length) {
      dia.empleadosExceptuados = await this.empleadoRepository.findBy({
        id: In(empleadosExceptuadosIds),
      });
    }

    return await this.diaCalendarioRepository.save(dia);
  }

  async listarPorAnio(anio: number): Promise<DiaCalendario[]> {
    return await this.diaCalendarioRepository.find({
      where: { fecha: Between(`${anio}-01-01`, `${anio}-12-31`) },
      relations: ['empleadosExceptuados'],
      order: { fecha: 'ASC' },
    });
  }

  async eliminarDia(id: number): Promise<void> {
    const dia = await this.diaCalendarioRepository.findOne({ where: { id } });
    if (!dia) {
      throw new OperationalError(404, 'Día especial no encontrado');
    }
    await this.diaCalendarioRepository.remove(dia);
  }

  /**
   * Próximos eventos: días especiales del calendario + trámites aprobados (vacaciones/ausencia)
   * Los trámites con rango de fechas se expanden a un evento por cada día del rango
   */
  async obtenerProximosEventos(limite: number = 10) {
    // La columna 'fecha' es 'date' (string 'YYYY-MM-DD'): comparar con un Date
    // haría que TypeORM la serialice con hora y desplace el día
    const hoy = hoyLocal();

    const diasEspeciales = await this.diaCalendarioRepository.find({
      where: { fecha: MoreThanOrEqual(hoy) },
      order: { fecha: 'ASC' },
      take: limite,
    });

    const tramitesAprobados = await this.solicitudRepository
      .createQueryBuilder('solicitud')
      .leftJoinAndSelect('solicitud.empleado', 'empleado')
      .where('solicitud.estado = :estado', { estado: 'aprobada' })
      .andWhere('COALESCE(solicitud.fecha_fin, solicitud.fecha_inicio) >= :hoy', { hoy })
      .orderBy('solicitud.fecha_inicio', 'ASC')
      .take(limite)
      .getMany();

    const nombreTipoTramite: Record<string, string> = {
      vacaciones: 'Vacaciones',
      ausencia: 'Ausencia',
      cambio_jornada: 'Cambio de jornada',
    };

    const eventosTramites = tramitesAprobados.flatMap((t) => {
      const titulo = `${nombreTipoTramite[t.tipo] || t.tipo} - ${t.empleado?.nombre} ${t.empleado?.apellido}`;
      return this.enumerarDias(t.fecha_inicio, t.fecha_fin || t.fecha_inicio).map((fecha) => ({
        fecha,
        tipo: t.tipo as string,
        titulo,
      }));
    });

    const eventos = [
      ...diasEspeciales.map((d) => ({
        fecha: d.fecha,
        tipo: d.tipo as string,
        titulo: d.nombre,
      })),
      ...eventosTramites,
    ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // Cap generoso para no cortar un tramite de varios días a la mitad
    return eventos.slice(0, Math.max(limite * 5, 30));
  }

  /** Enumera cada fecha 'YYYY-MM-DD' entre inicio y fin (inclusive) */
  private enumerarDias(inicio: string, fin: string): string[] {
    const dias: string[] = [];
    const cursor = new Date(`${inicio.slice(0, 10)}T00:00:00Z`);
    const finDate = new Date(`${fin.slice(0, 10)}T00:00:00Z`);

    while (cursor <= finDate) {
      dias.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return dias;
  }
}
