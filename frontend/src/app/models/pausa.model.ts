export interface PausaAsistencia {
  id: number;
  tipo_pausa: 'desayuno' | 'comida' | 'medico' | 'personal';
  hora_inicio: Date | string;
  hora_fin: Date | string | null;
  duracion: number | null;
  estado: 'pausa_activa' | 'finalizada';
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PausasResponse {
  pausas: PausaAsistencia[];
  total: string;
  cantidad: number;
}
