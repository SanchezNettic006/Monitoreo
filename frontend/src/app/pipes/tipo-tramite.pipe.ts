import { Pipe, PipeTransform } from '@angular/core';

const ETIQUETAS: Record<string, string> = {
  vacaciones: 'Vacaciones',
  ausencia: 'Reposición',
  cambio_jornada: 'Cambio de Jornada',
  cita_medica_programada: 'Cita Médica Programada',
  cita_medica_emergencia: 'Cita Médica de Emergencia',
  cumpleanos: 'Cumpleaños',
};

/** Traduce el tipo de trámite (valor guardado en BD) a un nombre legible */
@Pipe({
  name: 'tipoTramite',
  standalone: true,
})
export class TipoTramitePipe implements PipeTransform {
  transform(tipo: string | null | undefined): string {
    if (!tipo) return '-';
    return ETIQUETAS[tipo] || tipo;
  }
}
