import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Grupo } from './Grupo';

@Entity('asignacion_proyecto')
export class AsignacionProyecto {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Grupo, (grupo) => grupo.asignaciones)
  @JoinColumn({ name: 'grupo_id' })
  grupo!: Grupo;

  @Column({ name: 'grupo_id' })
  grupo_id!: number;

  @Column({ name: 'nombre_proyecto' })
  nombre_proyecto!: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  // Columnas 'date' (sin hora), manejadas como string 'YYYY-MM-DD' para evitar el
  // desfase de zona horaria de new Date('YYYY-MM-DD') (ver RecordAsistencia.fecha)
  @Column({ name: 'fecha_inicio', type: 'date' })
  fecha_inicio!: string;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fecha_fin?: string | null;

  @Column({ name: 'creado_por_usuario_id', nullable: true })
  creado_por_usuario_id?: number;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
