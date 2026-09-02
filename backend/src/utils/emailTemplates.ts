/**
 * Plantillas de emails para notificaciones
 */
import { formatFechaDisplay } from './fecha.utils';
import { config } from '@config/env';

export const emailTemplates = {
  /**
   * Email cuando se crea una nueva solicitud (enviar al responsable)
   */
  solicitudCreada: (empleado: {
    nombre: string;
    apellido: string;
    email: string;
  }, solicitud: any) => {
    const tipoSolicitud = solicitud.tipo || 'Solicitud';
    const fechaInicio = formatFechaDisplay(solicitud.fecha_inicio);
    const fechaFin = solicitud.fecha_fin
      ? formatFechaDisplay(solicitud.fecha_fin)
      : 'N/A';

    return {
      asunto: `Nueva solicitud de ${tipoSolicitud} - ${empleado.nombre} ${empleado.apellido}`,
      cuerpo: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #2c3e50; max-width: 600px; margin: 0 auto;">
          <div style="background: #2c3e50; padding: 30px; color: white; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 300;">Nueva Solicitud</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Requiere tu revisión</p>
          </div>

          <div style="border: 1px solid #ecf0f1; border-top: none; padding: 30px; background: #ffffff;">
            <p style="margin-top: 0; font-size: 14px;">Hola,</p>

            <p style="font-size: 15px; margin: 15px 0;">
              <strong>${empleado.nombre} ${empleado.apellido}</strong> ha solicitado <strong>${tipoSolicitud}</strong>.
            </p>

            <table style="width: 100%; margin: 25px 0; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Empleado</td>
                <td style="padding: 12px 0; font-weight: 500; text-align: right;">${empleado.email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Tipo de Solicitud</td>
                <td style="padding: 12px 0; font-weight: 500; text-align: right;">${tipoSolicitud}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Fecha Inicio</td>
                <td style="padding: 12px 0; font-weight: 500; text-align: right;">${fechaInicio}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Fecha Fin</td>
                <td style="padding: 12px 0; font-weight: 500; text-align: right;">${fechaFin}</td>
              </tr>
            </table>

            ${solicitud.motivo ? `
            <div style="background: #f8f9fa; padding: 15px; border-left: 3px solid #2c3e50; margin: 20px 0; border-radius: 3px;">
              <p style="margin: 0; color: #7f8c8d; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Motivo</p>
              <p style="margin: 8px 0 0 0; color: #2c3e50;">${solicitud.motivo}</p>
            </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${config.cors.origin}/tramites"
                 style="display: inline-block; padding: 12px 32px; background: #2c3e50; color: white; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 14px;">
                Revisar Solicitud
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0; text-align: center;">
              Sistema NETTIC - Gestión de Asistencias<br>
              Este es un mensaje automático. Por favor, no responda a este correo.
            </p>
          </div>
        </div>
      `,
    };
  },

  /**
   * Email cuando se aprueba una solicitud (enviar al empleado)
   */
  solicitudAprobada: (empleado: {
    nombre: string;
    apellido: string;
  }, solicitud: any) => {
    const tipoSolicitud = solicitud.tipo || 'Solicitud';

    return {
      asunto: `Tu solicitud de ${tipoSolicitud} ha sido aprobada`,
      cuerpo: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #2c3e50; max-width: 600px; margin: 0 auto;">
          <div style="background: #27ae60; padding: 30px; color: white; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 300;">Solicitud Aprobada</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Tu solicitud ha sido procesada</p>
          </div>

          <div style="border: 1px solid #ecf0f1; border-top: none; padding: 30px; background: #ffffff;">
            <p style="margin-top: 0; font-size: 14px;">Hola ${empleado.nombre},</p>

            <div style="background: #d5f4e6; padding: 20px; border-left: 3px solid #27ae60; margin: 20px 0; border-radius: 3px;">
              <p style="margin: 0; font-size: 16px; font-weight: 500; color: #27ae60;">
                Tu solicitud de ${tipoSolicitud} ha sido <strong>aprobada</strong>
              </p>
            </div>

            <table style="width: 100%; margin: 25px 0; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Tipo de Solicitud</td>
                <td style="padding: 12px 0; font-weight: 500; text-align: right;">${tipoSolicitud}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Fecha Inicio</td>
                <td style="padding: 12px 0; font-weight: 500; text-align: right;">${formatFechaDisplay(solicitud.fecha_inicio)}</td>
              </tr>
              ${solicitud.fecha_fin ? `
              <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Fecha Fin</td>
                <td style="padding: 12px 0; font-weight: 500; text-align: right;">${formatFechaDisplay(solicitud.fecha_fin)}</td>
              </tr>
              ` : ''}
              ${solicitud.observacion ? `
              <tr>
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Observación</td>
                <td style="padding: 12px 0; text-align: right;">${solicitud.observacion}</td>
              </tr>
              ` : ''}
            </table>

            <p style="font-size: 14px; color: #7f8c8d; margin: 20px 0;">
              Puedes consultar los detalles de tu solicitud en el sistema en cualquier momento.
            </p>

            <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0; text-align: center;">
              Sistema NETTIC - Gestión de Asistencias<br>
              Este es un mensaje automático. Por favor, no responda a este correo.
            </p>
          </div>
        </div>
      `,
    };
  },

  /**
   * Email cuando se reprograma (cambia de fecha) una solicitud ya aprobada
   */
  solicitudReprogramada: (
    empleado: { nombre: string; apellido: string },
    solicitud: any,
    fechaAnteriorInicio: string,
    fechaAnteriorFin: string | null,
    motivo?: string,
  ) => {
    const tipoSolicitud = solicitud.tipo || 'Solicitud';

    return {
      asunto: `Tu solicitud de ${tipoSolicitud} cambió de fecha`,
      cuerpo: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #2c3e50; max-width: 600px; margin: 0 auto;">
          <div style="background: #f0a400; padding: 30px; color: white; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 300;">Solicitud Reprogramada</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Tu solicitud ya aprobada cambió de fecha</p>
          </div>

          <div style="border: 1px solid #ecf0f1; border-top: none; padding: 30px; background: #ffffff;">
            <p style="margin-top: 0; font-size: 14px;">Hola ${empleado.nombre},</p>

            <div style="background: #fff4e6; padding: 20px; border-left: 3px solid #f0a400; margin: 20px 0; border-radius: 3px;">
              <p style="margin: 0; font-size: 16px; font-weight: 500; color: #d98600;">
                Tu ${tipoSolicitud} ya aprobada fue movida a una nueva fecha
              </p>
            </div>

            <table style="width: 100%; margin: 25px 0; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Fecha anterior</td>
                <td style="padding: 12px 0; font-weight: 500; text-align: right; text-decoration: line-through; color: #999;">
                  ${formatFechaDisplay(fechaAnteriorInicio)}${fechaAnteriorFin ? ' - ' + formatFechaDisplay(fechaAnteriorFin) : ''}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Nueva fecha</td>
                <td style="padding: 12px 0; font-weight: 700; text-align: right; color: #2b8a3e;">
                  ${formatFechaDisplay(solicitud.fecha_inicio)}${solicitud.fecha_fin ? ' - ' + formatFechaDisplay(solicitud.fecha_fin) : ''}
                </td>
              </tr>
              ${motivo ? `
              <tr>
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Motivo</td>
                <td style="padding: 12px 0; text-align: right;">${motivo}</td>
              </tr>
              ` : ''}
            </table>

            <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0; text-align: center;">
              Sistema NETTIC - Gestión de Asistencias<br>
              Este es un mensaje automático. Por favor, no responda a este correo.
            </p>
          </div>
        </div>
      `,
    };
  },

  /**
   * Email cuando se rechaza una solicitud (enviar al empleado)
   */
  solicitudRechazada: (empleado: {
    nombre: string;
    apellido: string;
  }, solicitud: any, motivo: string) => {
    const tipoSolicitud = solicitud.tipo || 'Solicitud';

    return {
      asunto: `Tu solicitud de ${tipoSolicitud} ha sido rechazada`,
      cuerpo: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #2c3e50; max-width: 600px; margin: 0 auto;">
          <div style="background: #c0392b; padding: 30px; color: white; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 300;">Solicitud Rechazada</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Requiere revisión adicional</p>
          </div>

          <div style="border: 1px solid #ecf0f1; border-top: none; padding: 30px; background: #ffffff;">
            <p style="margin-top: 0; font-size: 14px;">Hola ${empleado.nombre},</p>

            <div style="background: #fadbd8; padding: 20px; border-left: 3px solid #c0392b; margin: 20px 0; border-radius: 3px;">
              <p style="margin: 0; font-size: 16px; font-weight: 500; color: #c0392b;">
                Tu solicitud de ${tipoSolicitud} ha sido <strong>rechazada</strong>
              </p>
            </div>

            <table style="width: 100%; margin: 25px 0; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Tipo de Solicitud</td>
                <td style="padding: 12px 0; font-weight: 500; text-align: right;">${tipoSolicitud}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Fecha Inicio</td>
                <td style="padding: 12px 0; font-weight: 500; text-align: right;">${formatFechaDisplay(solicitud.fecha_inicio)}</td>
              </tr>
              ${solicitud.fecha_fin ? `
              <tr>
                <td style="padding: 12px 0; color: #7f8c8d; font-size: 13px;">Fecha Fin</td>
                <td style="padding: 12px 0; font-weight: 500; text-align: right;">${formatFechaDisplay(solicitud.fecha_fin)}</td>
              </tr>
              ` : ''}
            </table>

            <div style="background: #fef5e7; padding: 15px; border-left: 3px solid #f39c12; margin: 20px 0; border-radius: 3px;">
              <p style="margin: 0; color: #d68910; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">Motivo del Rechazo</p>
              <p style="margin: 8px 0 0 0; color: #2c3e50; font-size: 14px;">${motivo || 'No especificado'}</p>
            </div>

            <p style="font-size: 14px; color: #7f8c8d; margin: 20px 0;">
              Si consideras que hay un error o deseas presentar una apelación, contacta con el departamento de recursos humanos.
            </p>

            <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0; text-align: center;">
              Sistema NETTIC - Gestión de Asistencias<br>
              Este es un mensaje automático. Por favor, no responda a este correo.
            </p>
          </div>
        </div>
      `,
    };
  },
};
