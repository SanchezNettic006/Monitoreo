import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root',
})
export class ExportarExcelService {
  /**
   * Exporta un arreglo de objetos planos a un archivo .xlsx y dispara la descarga.
   * `datos` debe venir ya formateado con las claves que se quieren usar como encabezado de columna.
   */
  exportar(datos: Record<string, any>[], nombreArchivo: string, nombreHoja: string = 'Datos'): void {
    if (!datos || datos.length === 0) return;

    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(libro, `${nombreArchivo}_${fecha}.xlsx`);
  }
}
