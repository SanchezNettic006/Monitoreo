import { AppDataSource } from '@config/database';
import { SolicitudTramite, TipoTramite, EstadoSolicitud } from '@entities/SolicitudTramite';
import { SolicitudHistorial } from '@entities/SolicitudHistorial';
import { NotificacionEmail } from '@entities/NotificacionEmail';
import { Empleado } from '@entities/Empleado';
import { emailTemplates } from '@utils/emailTemplates';
import { config } from '@config/env';
import { OperationalError } from '@middleware/errorHandler';
import { telegramService } from '@services/telegram.service';

interface CrearSolicitudDTO {
  empleado_id: number;
  tipo: TipoTramite;
  fecha_inicio: string;
  fecha_fin?: string;
  dias_solicitados?: number;
  motivo?: string;
  descripcion?: string;
}

interface CambiarEstadoDTO {
  solicitud_id: number;
  estado_nuevo: EstadoSolicitud;
  comentario?: string;
  usuario_id?: number;
  observacion_admin?: string;
}

export class SolicitudService {
  private solicitudRepository = AppDataSource.getRepository(SolicitudTramite);
  private historialRepository = AppDataSource.getRepository(SolicitudHistorial);
  private notificacionRepository = AppDataSource.getRepository(NotificacionEmail);
  private empleadoRepository = AppDataSource.getRepository(Empleado);

  /**
   * Crear nueva solicitud de trámite a partir del usuario logueado
   * (datos.empleado_id llega como el id del Usuario del JWT, no del Empleado)
   */
  async crearSolicitudDesdeUsuario(
    usuarioId: number,
    datos: Omit<CrearSolicitudDTO, 'empleado_id'>,
  ): Promise<SolicitudTramite> {
    const empleado = await this.empleadoRepository.findOne({ where: { usuario_id: usuarioId } });
    if (!empleado) {
      throw new Error('Empleado no encontrado para este usuario');
    }
    return this.crearSolicitud({ ...datos, empleado_id: empleado.id });
  }

  /**
   * Crear nueva solicitud de trámite
   */
  async crearSolicitud(datos: CrearSolicitudDTO): Promise<SolicitudTramite> {
    try {
      // Verificar que el empleado existe
      const empleado = await this.empleadoRepository.findOne({
        where: { id: datos.empleado_id },
        relations: ['usuario', 'departamento'],
      });

      if (!empleado) {
        throw new Error('Empleado no encontrado');
      }

      // Crear solicitud
      const solicitud = this.solicitudRepository.create({
        empleado_id: datos.empleado_id,
        tipo: datos.tipo,
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
        dias_solicitados: datos.dias_solicitados || 0,
        motivo: datos.motivo,
        descripcion: datos.descripcion,
        estado: 'pendiente',
      });

      const solicitudGuardada = await this.solicitudRepository.save(solicitud);

      // Crear registro de historial
      const historial = new SolicitudHistorial();
      historial.solicitud_id = solicitudGuardada.id;
      historial.estado_anterior = null as any;
      historial.estado_nuevo = 'pendiente';
      historial.comentario = 'Solicitud creada';

      await this.historialRepository.save(historial);

      // Crear notificación para el encargado/admin
      await this.crearNotificacionSolicitudCreada(
        solicitudGuardada,
        empleado,
      );

      console.log('Solicitud creada:', solicitudGuardada.id);
      return solicitudGuardada;
    } catch (error) {
      console.error('Error al crear solicitud:', error);
      throw error;
    }
  }

  /**
   * Cambiar estado de una solicitud
   * @param departamentoIdRestringido Si viene definido (líder), la solicitud debe
   * pertenecer a ese departamento; si no, se rechaza con 403.
   */
  async cambiarEstado(
    datos: CambiarEstadoDTO,
    departamentoIdRestringido?: number,
  ): Promise<SolicitudTramite> {
    try {
      const solicitud = await this.solicitudRepository.findOne({
        where: { id: datos.solicitud_id },
        relations: ['empleado'],
      });

      if (!solicitud) {
        throw new Error('Solicitud no encontrada');
      }

      if (
        departamentoIdRestringido !== undefined &&
        solicitud.empleado?.departamento_id !== departamentoIdRestringido
      ) {
        throw new OperationalError(403, 'No tienes permisos para gestionar solicitudes de otro departamento');
      }

      const estadoAnterior = solicitud.estado;

      // Actualizar solicitud
      solicitud.estado = datos.estado_nuevo;
      solicitud.observacion_admin = datos.observacion_admin;
      solicitud.aprobador_id = datos.usuario_id;
      solicitud.updated_at = new Date();

      const solicitudActualizada = await this.solicitudRepository.save(solicitud);

      // Guardar historial
      const historial = new SolicitudHistorial();
      historial.solicitud_id = solicitudActualizada.id;
      historial.estado_anterior = estadoAnterior;
      historial.estado_nuevo = datos.estado_nuevo;
      historial.comentario = datos.comentario;
      historial.usuario_id = datos.usuario_id;

      await this.historialRepository.save(historial);

      // Crear notificación al empleado
      await this.crearNotificacionCambioEstado(
        solicitudActualizada,
        estadoAnterior,
        datos.estado_nuevo,
      );

      console.log('Solicitud actualizada:', solicitudActualizada.id);
      return solicitudActualizada;
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      throw error;
    }
  }

  /**
   * Reprogramar una solicitud YA APROBADA a una nueva fecha (ej. una vacación
   * que se aprobó para el día 5 pero, por una emergencia, se corre al día 8).
   * No crea una solicitud nueva ni pasa por "pendiente" de nuevo: mantiene el
   * mismo registro (y su historial), solo le cambia la fecha.
   */
  async reprogramarSolicitud(
    solicitudId: number,
    nuevaFechaInicio: string,
    nuevaFechaFin: string | undefined,
    motivo: string | undefined,
    usuarioId?: number,
    departamentoIdRestringido?: number,
  ): Promise<SolicitudTramite> {
    try {
      const solicitud = await this.solicitudRepository.findOne({
        where: { id: solicitudId },
        relations: ['empleado', 'empleado.usuario', 'empleado.departamento'],
      });

      if (!solicitud) {
        throw new OperationalError(404, 'Solicitud no encontrada');
      }

      if (
        departamentoIdRestringido !== undefined &&
        solicitud.empleado?.departamento_id !== departamentoIdRestringido
      ) {
        throw new OperationalError(403, 'No tienes permisos para reprogramar solicitudes de otro departamento');
      }

      if (solicitud.estado !== 'aprobada') {
        throw new OperationalError(400, 'Solo se pueden reprogramar solicitudes ya aprobadas');
      }

      if (!nuevaFechaInicio) {
        throw new OperationalError(400, 'Falta la nueva fecha de inicio');
      }

      const fechaAnteriorInicio = solicitud.fecha_inicio;
      const fechaAnteriorFin = solicitud.fecha_fin || null;

      solicitud.fecha_inicio = nuevaFechaInicio;
      solicitud.fecha_fin = nuevaFechaFin || undefined;
      solicitud.updated_at = new Date();

      const solicitudActualizada = await this.solicitudRepository.save(solicitud);

      // Historial: no cambia el estado real (sigue 'aprobada'), solo se deja
      // constancia del movimiento de fecha para auditoría.
      const historial = new SolicitudHistorial();
      historial.solicitud_id = solicitudActualizada.id;
      historial.estado_anterior = 'aprobada';
      historial.estado_nuevo = 'reprogramada';
      historial.comentario =
        `Fecha movida de ${fechaAnteriorInicio}${fechaAnteriorFin ? ' - ' + fechaAnteriorFin : ''} a ` +
        `${nuevaFechaInicio}${nuevaFechaFin ? ' - ' + nuevaFechaFin : ''}` +
        (motivo?.trim() ? `: ${motivo.trim()}` : '');
      historial.usuario_id = usuarioId;

      await this.historialRepository.save(historial);

      await this.notificarReprogramacion(solicitudActualizada, fechaAnteriorInicio, fechaAnteriorFin, motivo);

      console.log('Solicitud reprogramada:', solicitudActualizada.id);
      return solicitudActualizada;
    } catch (error) {
      console.error('Error al reprogramar solicitud:', error);
      throw error;
    }
  }

  /**
   * Obtener solicitudes del usuario logueado (resuelve su empleado por usuario_id)
   */
  async obtenerMisSolicitudes(usuarioId: number) {
    try {
      console.log('📋 [obtenerMisSolicitudes] Buscando empleado para usuario_id:', usuarioId);

      const empleado = await this.empleadoRepository.findOne({ where: { usuario_id: usuarioId } });
      if (!empleado) {
        console.warn('📋 [obtenerMisSolicitudes] Sin empleado asociado al usuario:', usuarioId);
        return [];
      }

      const solicitudes = await this.solicitudRepository.find({
        where: { empleado_id: empleado.id },
        relations: ['empleado', 'empleado.departamento', 'empleado.usuario', 'historial'],
        order: { created_at: 'DESC' },
      });

      console.log('📋 [obtenerMisSolicitudes] Solicitudes encontradas:', solicitudes.length);
      return solicitudes;
    } catch (error) {
      console.error('❌ [obtenerMisSolicitudes] Error:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las solicitudes pendientes (admin) o solo las de un
   * departamento (líder, cuando se pasa departamentoId)
   */
  async obtenerSolicitudesPendientes(departamentoId?: number) {
    try {
      const where: any = { estado: 'pendiente' };
      if (departamentoId !== undefined) {
        where.empleado = { departamento_id: departamentoId };
      }

      const solicitudes = await this.solicitudRepository.find({
        where,
        relations: ['empleado', 'empleado.departamento', 'empleado.usuario', 'historial'],
        order: { created_at: 'ASC' },
      });

      return solicitudes.map((s) => ({
        ...s,
        empleado_nombre_completo: s.empleado
          ? `${s.empleado.nombre} ${s.empleado.apellido}`
          : '-',
        departamento_nombre: s.empleado?.departamento?.nombre || '-',
      }));
    } catch (error) {
      console.error('Error al obtener solicitudes pendientes:', error);
      throw error;
    }
  }

  /**
   * Obtener solicitudes aprobadas, opcionalmente filtradas por mes de inicio
   * ('YYYY-MM'). Admin: todas; líder: solo su departamento.
   */
  async obtenerSolicitudesAprobadas(departamentoId?: number, mes?: string) {
    try {
      const where: any = { estado: 'aprobada' };
      if (departamentoId !== undefined) {
        where.empleado = { departamento_id: departamentoId };
      }

      const solicitudes = await this.solicitudRepository
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.empleado', 'empleado')
        .leftJoinAndSelect('empleado.departamento', 'departamento')
        .leftJoinAndSelect('empleado.usuario', 'usuario')
        .where('s.estado = :estado', { estado: 'aprobada' })
        .andWhere(departamentoId !== undefined ? 'empleado.departamento_id = :departamentoId' : '1=1', {
          departamentoId,
        })
        .andWhere(mes ? "to_char(s.fecha_inicio, 'YYYY-MM') = :mes" : '1=1', { mes })
        .orderBy('s.fecha_inicio', 'DESC')
        .getMany();

      return solicitudes.map((s) => ({
        ...s,
        empleado_nombre_completo: s.empleado
          ? `${s.empleado.nombre} ${s.empleado.apellido}`
          : '-',
        departamento_nombre: s.empleado?.departamento?.nombre || '-',
      }));
    } catch (error) {
      console.error('Error al obtener solicitudes aprobadas:', error);
      throw error;
    }
  }

  /**
   * Obtener resumen de solicitudes
   */
  async obtenerResumen() {
    try {
      const pendientes = await this.solicitudRepository.count({
        where: { estado: 'pendiente' },
      });

      const aprobadas = await this.solicitudRepository.count({
        where: { estado: 'aprobada' },
      });

      const rechazadas = await this.solicitudRepository.count({
        where: { estado: 'rechazada' },
      });

      const vacaciones = await this.solicitudRepository.count({
        where: { tipo: 'vacaciones' },
      });

      const ausencias = await this.solicitudRepository.count({
        where: { tipo: 'ausencia' },
      });

      return {
        pendientes,
        aprobadas,
        rechazadas,
        vacaciones,
        ausencias,
      };
    } catch (error) {
      console.error('Error al obtener resumen:', error);
      throw error;
    }
  }

  async obtenerEmpleadoPorUsuario(usuarioId: number): Promise<Empleado | null> {
    return this.empleadoRepository.findOne({ where: { usuario_id: usuarioId } });
  }

  /**
   * Saldo de vacaciones de un empleado para un año dado (calendario, ene-dic).
   * cupo = empleado.dias_vacaciones_anuales (ajustable por admin en su ficha).
   * usados = suma de dias_solicitados de solicitudes tipo 'vacaciones' APROBADAS
   * cuya fecha_inicio caiga en ese año.
   *
   * Simplificación v1: no hay acarreo de días no usados de años anteriores —
   * cada año calendario reinicia el cupo completo. Si se valida el enfoque,
   * el acarreo se puede agregar después sin romper esta base.
   */
  async obtenerSaldoVacaciones(empleadoId: number, anio?: number, departamentoIdRestringido?: number) {
    const empleado = await this.empleadoRepository.findOne({ where: { id: empleadoId } });
    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado');
    }

    if (departamentoIdRestringido !== undefined && empleado.departamento_id !== departamentoIdRestringido) {
      throw new OperationalError(403, 'No tienes permisos para ver el saldo de otro departamento');
    }

    const anioConsulta = anio || new Date().getFullYear();
    const cupoAnual = empleado.dias_vacaciones_anuales ?? 15;

    const solicitudesAprobadas = await this.solicitudRepository
      .createQueryBuilder('solicitud')
      .where('solicitud.empleado_id = :empleadoId', { empleadoId })
      .andWhere('solicitud.tipo = :tipo', { tipo: 'vacaciones' })
      .andWhere('solicitud.estado = :estado', { estado: 'aprobada' })
      .andWhere('EXTRACT(YEAR FROM solicitud.fecha_inicio) = :anio', { anio: anioConsulta })
      .getMany();

    const diasUsados = solicitudesAprobadas.reduce(
      (sum, s) => sum + (parseFloat(s.dias_solicitados as any) || 0),
      0,
    );

    return {
      empleadoId,
      anio: anioConsulta,
      cupoAnual,
      diasUsados,
      diasDisponibles: Math.max(0, cupoAnual - diasUsados),
      fechaIngreso: empleado.fecha_ingreso || null,
    };
  }

  /**
   * Saldo de vacaciones de TODOS los empleados (activos) para un año dado,
   * en una sola consulta agrupada — para la vista de administración donde
   * se necesita ver de un vistazo cuánto tiene cada quien.
   */
  async obtenerSaldosVacacionesMasivo(anio?: number, departamentoId?: number) {
    const anioConsulta = anio || new Date().getFullYear();

    let queryEmpleados = this.empleadoRepository
      .createQueryBuilder('empleado')
      .where('empleado.estado = :estado', { estado: 'activo' });

    if (departamentoId !== undefined) {
      queryEmpleados = queryEmpleados.andWhere('empleado.departamento_id = :departamentoId', { departamentoId });
    }

    const empleados = await queryEmpleados.getMany();
    if (empleados.length === 0) return [];

    const empleadoIds = empleados.map((e) => e.id);

    const solicitudesAprobadas = await this.solicitudRepository
      .createQueryBuilder('solicitud')
      .where('solicitud.empleado_id IN (:...empleadoIds)', { empleadoIds })
      .andWhere('solicitud.tipo = :tipo', { tipo: 'vacaciones' })
      .andWhere('solicitud.estado = :estado', { estado: 'aprobada' })
      .andWhere('EXTRACT(YEAR FROM solicitud.fecha_inicio) = :anio', { anio: anioConsulta })
      .getMany();

    const usadosPorEmpleado = new Map<number, number>();
    for (const s of solicitudesAprobadas) {
      const actual = usadosPorEmpleado.get(s.empleado_id) || 0;
      usadosPorEmpleado.set(s.empleado_id, actual + (parseFloat(s.dias_solicitados as any) || 0));
    }

    return empleados.map((empleado) => {
      const cupoAnual = empleado.dias_vacaciones_anuales ?? 15;
      const diasUsados = usadosPorEmpleado.get(empleado.id) || 0;
      return {
        empleadoId: empleado.id,
        nombre: `${empleado.nombre} ${empleado.apellido}`,
        departamentoId: empleado.departamento_id,
        anio: anioConsulta,
        cupoAnual,
        diasUsados,
        diasDisponibles: Math.max(0, cupoAnual - diasUsados),
        fechaIngreso: empleado.fecha_ingreso || null,
      };
    });
  }

  /**
   * Crear notificación: solicitud creada
   */
  private async crearNotificacionSolicitudCreada(
    solicitud: SolicitudTramite,
    empleado: Empleado,
  ): Promise<void> {
    try {
      const emailEmpleado = empleado.usuario?.email || 'sin-email@nettic.com';

      // Destinatarios: supervisor del departamento del empleado (si tiene correo
      // configurado) + RRHH siempre. Se deduplica por si coinciden.
      const destinatarios = new Set<string>();
      const emailSupervisor = empleado.departamento?.email_supervisor;
      if (emailSupervisor) destinatarios.add(emailSupervisor);
      if (config.notificaciones.emailRrhh) destinatarios.add(config.notificaciones.emailRrhh);

      if (destinatarios.size === 0) {
        console.warn('⚠️ Solicitud creada sin destinatarios de notificación (falta email_supervisor y RRHH_EMAIL)');
        return;
      }

      // Usar la plantilla HTML
      const template = emailTemplates.solicitudCreada(
        {
          nombre: empleado.nombre,
          apellido: empleado.apellido,
          email: emailEmpleado,
        },
        {
          tipo: solicitud.tipo,
          fecha_inicio: solicitud.fecha_inicio,
          fecha_fin: solicitud.fecha_fin,
          motivo: solicitud.motivo,
        }
      );

      for (const destinatario of destinatarios) {
        const notificacion = new NotificacionEmail();
        notificacion.solicitud_id = solicitud.id;
        notificacion.tipo = 'solicitud_creada';
        notificacion.destinatario = destinatario;
        notificacion.asunto = template.asunto;
        notificacion.cuerpo = template.cuerpo;
        notificacion.estado = 'pendiente';

        await this.notificacionRepository.save(notificacion);
      }

      console.log(`✅ Notificación de solicitud creada guardada para ${destinatarios.size} destinatario(s)`);
    } catch (error) {
      console.error('❌ Error al crear notificación de solicitud:', error);
      // No lanzar error para no romper el flujo
    }
  }

  /**
   * Crear notificación: cambio de estado
   */
  private async notificarReprogramacion(
    solicitud: SolicitudTramite,
    fechaAnteriorInicio: string,
    fechaAnteriorFin: string | null,
    motivo?: string,
  ): Promise<void> {
    const empleado = solicitud.empleado;

    try {
      const emailEmpleado = empleado?.usuario?.email || 'empleado@nettic.com';
      const template = emailTemplates.solicitudReprogramada(
        { nombre: empleado?.nombre || 'Empleado', apellido: empleado?.apellido || '' },
        solicitud,
        fechaAnteriorInicio,
        fechaAnteriorFin,
        motivo,
      );

      const notificacion = new NotificacionEmail();
      notificacion.solicitud_id = solicitud.id;
      notificacion.tipo = 'aprobada'; // reutiliza la categoría; sigue siendo una solicitud aprobada
      notificacion.destinatario = emailEmpleado;
      notificacion.asunto = template.asunto;
      notificacion.cuerpo = template.cuerpo;
      notificacion.estado = 'pendiente';

      await this.notificacionRepository.save(notificacion);
    } catch (error) {
      console.error('❌ Error al crear notificación de reprogramación:', error);
    }

    // Aviso inmediato por Telegram, si el empleado tiene su cuenta vinculada
    try {
      const chatId = empleado?.usuario?.telegram_chat_id;
      if (chatId) {
        const nuevaFecha = solicitud.fecha_fin
          ? `${solicitud.fecha_inicio} a ${solicitud.fecha_fin}`
          : solicitud.fecha_inicio;
        await telegramService.enviarMensaje(
          chatId,
          `📅 Tu solicitud de ${solicitud.tipo} (ya aprobada) cambió de fecha: ahora es ${nuevaFecha}.` +
            (motivo?.trim() ? ` Motivo: ${motivo.trim()}` : ''),
        );
      }
    } catch (error) {
      console.error('❌ Error al enviar Telegram de reprogramación:', error);
    }
  }

  private async crearNotificacionCambioEstado(
    solicitud: SolicitudTramite,
    estadoAnterior: string,
    estadoNuevo: string,
  ): Promise<void> {
    try {
      const empleado = solicitud.empleado;
      const emailEmpleado = empleado?.usuario?.email || 'empleado@nettic.com';

      // Obtener la plantilla correcta según el estado
      let template;
      if (estadoNuevo === 'aprobada') {
        template = emailTemplates.solicitudAprobada(
          {
            nombre: empleado?.nombre || 'Empleado',
            apellido: empleado?.apellido || '',
          },
          {
            tipo: solicitud.tipo,
            fecha_inicio: solicitud.fecha_inicio,
            fecha_fin: solicitud.fecha_fin,
            observacion: solicitud.observacion_admin,
          }
        );
      } else if (estadoNuevo === 'rechazada') {
        template = emailTemplates.solicitudRechazada(
          {
            nombre: empleado?.nombre || 'Empleado',
            apellido: empleado?.apellido || '',
          },
          {
            tipo: solicitud.tipo,
            fecha_inicio: solicitud.fecha_inicio,
            fecha_fin: solicitud.fecha_fin,
          },
          solicitud.observacion_admin || 'Sin motivo especificado'
        );
      } else {
        // Para otros estados, no enviar notificación por ahora
        return;
      }

      const notificacion = new NotificacionEmail();
      notificacion.solicitud_id = solicitud.id;
      notificacion.tipo = estadoNuevo === 'aprobada' ? 'aprobada' : 'rechazada';
      notificacion.destinatario = emailEmpleado;
      notificacion.asunto = template.asunto;
      notificacion.cuerpo = template.cuerpo;
      notificacion.estado = 'pendiente';

      await this.notificacionRepository.save(notificacion);
      console.log('✅ Notificación de cambio de estado guardada');
    } catch (error) {
      console.error('❌ Error al crear notificación de cambio:', error);
    }
  }
}
