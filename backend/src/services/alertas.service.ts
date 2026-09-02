import { AppDataSource } from '@config/database';
import { RecordAsistencia } from '@entities/RecordAsistencia';
import { Empleado } from '@entities/Empleado';
import { Usuario } from '@entities/Usuario';
import { SolicitudTramite } from '@entities/SolicitudTramite';
import { DiaCalendario } from '@entities/DiaCalendario';
import { telegramService } from '@services/telegram.service';
import { hoyLocal } from '@utils/fecha.utils';

/** Jornada activa: aviso al propio técnico a las 9h, escalado a líder/admin a las 9.5h si sigue sin cerrar */
const UMBRAL_HORAS_JORNADA_TECNICO = 9;
const UMBRAL_HORAS_JORNADA_LIDER = 9.5;

/** No-inicio: aviso al propio técnico a las 9:00am, escalado a líder/admin a las 9:30am si sigue sin marcar */
const HORA_RECORDATORIO_TECNICO = { hora: 9, minuto: 0 };
const HORA_RECORDATORIO_LIDER = { hora: 9, minuto: 30 };

export class AlertasService {
  private recordRepository = AppDataSource.getRepository(RecordAsistencia);
  private empleadoRepository = AppDataSource.getRepository(Empleado);
  private usuarioRepository = AppDataSource.getRepository(Usuario);
  private solicitudRepository = AppDataSource.getRepository(SolicitudTramite);
  private diaCalendarioRepository = AppDataSource.getRepository(DiaCalendario);

  /**
   * Jornada sin cerrar: primero avisa al propio técnico (9h), y si sigue sin
   * cerrar, escala al líder del departamento + admins (9.5h). Cada aviso se
   * manda una sola vez por registro (flags `alerta_jornada_larga_*_enviada`).
   */
  async revisarJornadasLargas(): Promise<void> {
    await this.avisarTecnicoJornadaLarga();
    await this.escalarLiderJornadaLarga();
  }

  /**
   * Cierre automático de jornadas olvidadas: si ya pasó la medianoche del día en
   * que se marcó entrada y el técnico nunca hizo check-out, se cierra solo a las
   * 23:59:59 de ese mismo día (marcado con `cierre_automatico`) para que no se
   * quede "atascado" sin poder volver a marcar entrada al día siguiente.
   * Las horas extra NO se tocan aquí: esas las sigue cerrando el técnico, porque
   * es normal que crucen la medianoche (ej. trabajar de 11pm a 2am).
   */
  async cerrarJornadasOlvidadas(): Promise<void> {
    const hoyStr = hoyLocal();

    const records = await this.recordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.empleado', 'empleado')
      .leftJoinAndSelect('empleado.usuario', 'usuario')
      .where('record.hora_salida IS NULL')
      .andWhere('record.fecha_asistencia < :hoy', { hoy: hoyStr })
      .getMany();

    for (const record of records) {
      const cierre = new Date(`${record.fecha}T23:59:59`);

      record.hora_salida = cierre;
      record.cierre_automatico = true;

      const msEntrada = new Date(record.hora_entrada).getTime();
      const diffMs = cierre.getTime() - msEntrada;
      record.horas_trabajadas = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));

      await this.recordRepository.save(record);

      const chatId = record.empleado?.usuario?.telegram_chat_id;
      if (chatId) {
        await telegramService.enviarMensaje(
          chatId,
          `🔒 Se te olvidó hacer CHECK-OUT el ${record.fecha} y el sistema cerró tu jornada automáticamente a las 11:59pm. ` +
            `Si tus horas reales fueron distintas, avisa a tu líder para que las corrija.`,
        );
      }
    }
  }

  private async avisarTecnicoJornadaLarga(): Promise<void> {
    const limite = new Date(Date.now() - UMBRAL_HORAS_JORNADA_TECNICO * 60 * 60 * 1000);

    const records = await this.recordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.empleado', 'empleado')
      .leftJoinAndSelect('empleado.usuario', 'usuario')
      .where('record.hora_salida IS NULL')
      .andWhere('record.hora_entrada <= :limite', { limite })
      .andWhere('record.alerta_jornada_larga_tecnico_enviada = false')
      .getMany();

    for (const record of records) {
      const chatId = record.empleado?.usuario?.telegram_chat_id;
      if (chatId) {
        await telegramService.enviarMensaje(
          chatId,
          `⏰ Llevas ${UMBRAL_HORAS_JORNADA_TECNICO}+ horas de jornada activa. Si ya terminaste, no olvides hacer CHECK-OUT.`,
        );
      }
      record.alerta_jornada_larga_tecnico_enviada = true;
      await this.recordRepository.save(record);
    }
  }

  private async escalarLiderJornadaLarga(): Promise<void> {
    const limite = new Date(Date.now() - UMBRAL_HORAS_JORNADA_LIDER * 60 * 60 * 1000);

    const records = await this.recordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.empleado', 'empleado')
      .where('record.hora_salida IS NULL')
      .andWhere('record.hora_entrada <= :limite', { limite })
      .andWhere('record.alerta_jornada_larga_lider_enviada = false')
      .getMany();

    for (const record of records) {
      const empleado = record.empleado;
      if (!empleado) continue;

      const destinatarios = await this.obtenerLideresYAdmins(empleado.departamento_id);
      const horasTranscurridas = Math.floor(
        (Date.now() - new Date(record.hora_entrada).getTime()) / (60 * 60 * 1000),
      );

      const texto =
        `⚠️ Jornada sin cerrar hace más de ${horasTranscurridas}h\n` +
        `${empleado.nombre} ${empleado.apellido} marcó entrada el ${record.fecha} y aún no ha registrado salida. ` +
        `Ya se le avisó a él/ella; puede que se le haya olvidado el check-out o siga trabajando.`;

      for (const usuario of destinatarios) {
        if (usuario.telegram_chat_id) {
          await telegramService.enviarMensaje(usuario.telegram_chat_id, texto);
        }
      }

      record.alerta_jornada_larga_lider_enviada = true;
      await this.recordRepository.save(record);
    }
  }

  /**
   * No-inicio: primero avisa al propio técnico (9:00am), y si sigue sin marcar
   * entrada, escala al líder + admins (9:30am). Cada aviso se manda una sola
   * vez por día por empleado (`ultimo_recordatorio_no_inicio*`).
   */
  async revisarRecordatorioNoInicio(): Promise<void> {
    const hoyStr = hoyLocal();
    const empleados = await this.empleadoRepository.find({
      where: { estado: 'activo' },
      relations: ['usuario'],
    });

    for (const empleado of empleados) {
      // Los líderes, por ahora, no tienen obligación de marcar asistencia
      // (pendiente de definir si eso cambia más adelante).
      if (empleado.usuario?.rol === 'lider') continue;

      const tieneRegistroHoy = await this.recordRepository.findOne({
        where: { empleado: { id: empleado.id }, fecha: hoyStr },
      });
      if (tieneRegistroHoy) continue;

      // No molestar si hoy tiene vacaciones/ausencia aprobada, o si hoy es un
      // día no laborable del calendario y no está exceptuado.
      if (await this.tieneAusenciaAprobadaHoy(empleado.id, hoyStr)) continue;
      if (await this.esDiaNoLaborablePara(empleado.id, hoyStr)) continue;

      if (
        this.yaPasoLaHora(HORA_RECORDATORIO_TECNICO) &&
        empleado.ultimo_recordatorio_no_inicio !== hoyStr &&
        empleado.usuario?.telegram_chat_id
      ) {
        await telegramService.enviarMensaje(
          empleado.usuario.telegram_chat_id,
          '⏰ No has iniciado tu jornada hoy. Abre NETTIC y haz check-in cuando estés listo.',
        );
        empleado.ultimo_recordatorio_no_inicio = hoyStr;
        await this.empleadoRepository.save(empleado);
      }

      if (this.yaPasoLaHora(HORA_RECORDATORIO_LIDER) && empleado.ultimo_recordatorio_no_inicio_lider !== hoyStr) {
        const destinatarios = await this.obtenerLideresYAdmins(empleado.departamento_id);
        const texto = `⚠️ ${empleado.nombre} ${empleado.apellido} no ha iniciado su jornada hoy (ya se le recordó, sigue sin marcar).`;

        for (const usuario of destinatarios) {
          if (usuario.telegram_chat_id) {
            await telegramService.enviarMensaje(usuario.telegram_chat_id, texto);
          }
        }

        empleado.ultimo_recordatorio_no_inicio_lider = hoyStr;
        await this.empleadoRepository.save(empleado);
      }
    }
  }

  /** Vacaciones o ausencia ya aprobada que cubre el día de hoy */
  private async tieneAusenciaAprobadaHoy(empleadoId: number, hoyStr: string): Promise<boolean> {
    const solicitud = await this.solicitudRepository
      .createQueryBuilder('s')
      .where('s.empleado_id = :empleadoId', { empleadoId })
      .andWhere('s.estado = :estado', { estado: 'aprobada' })
      .andWhere('s.tipo IN (:...tipos)', { tipos: ['vacaciones', 'ausencia'] })
      .andWhere('s.fecha_inicio <= :hoy', { hoy: hoyStr })
      .andWhere('COALESCE(s.fecha_fin, s.fecha_inicio) >= :hoy', { hoy: hoyStr })
      .getOne();
    return !!solicitud;
  }

  /** Hoy es festivo/no laborable del calendario y este empleado no está exceptuado */
  private async esDiaNoLaborablePara(empleadoId: number, hoyStr: string): Promise<boolean> {
    const dia = await this.diaCalendarioRepository.findOne({
      where: { fecha: hoyStr },
      relations: ['empleadosExceptuados'],
    });
    if (!dia) return false;

    const exceptuado = dia.empleadosExceptuados?.some((e) => e.id === empleadoId);
    return !exceptuado;
  }

  private yaPasoLaHora({ hora, minuto }: { hora: number; minuto: number }): boolean {
    const ahora = new Date();
    const objetivo = new Date();
    objetivo.setHours(hora, minuto, 0, 0);
    return ahora >= objetivo;
  }

  /**
   * Admins (todos) + líder(es) del departamento del empleado en cuestión —
   * incluye tanto al líder "dueño" del departamento (su propio empleado.departamento_id)
   * como a cualquier otro líder que lo supervise como adicional (ej. el líder de
   * Troncal que también supervisa Vehículos).
   */
  private async obtenerLideresYAdmins(departamentoId: number): Promise<Usuario[]> {
    return this.usuarioRepository
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.empleado', 'empleado')
      .leftJoin('lider_departamento_extra', 'extra', 'extra.usuario_id = usuario.id')
      .where('usuario.rol = :admin', { admin: 'admin' })
      .orWhere(
        '(usuario.rol = :lider) AND (empleado.departamento_id = :departamentoId OR extra.departamento_id = :departamentoId)',
        { lider: 'lider', departamentoId },
      )
      .getMany();
  }
}

export const alertasService = new AlertasService();
