import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Grupo } from './Grupo';
import { Departamento } from './Departamento';

@Entity('asignacion_proyecto')
export class AsignacionProyecto {
  @PrimaryGeneratedColumn()
  id!: number;

  // Los proyectos ya no dependen de un grupo intermedio: viven directo del
  // departamento, y el propio técnico elige entre los abiertos de su
  // departamento al cerrar jornada. grupo_id se deja nullable solo por
  // compatibilidad con proyectos creados antes de este cambio.
  @ManyToOne(() => Departamento, { nullable: true })
  @JoinColumn({ name: 'departamento_id' })
  departamento?: Departamento;

  @Column({ name: 'departamento_id', nullable: true })
  departamento_id?: number;

  @ManyToOne(() => Grupo, (grupo) => grupo.asignaciones, { nullable: true })
  @JoinColumn({ name: 'grupo_id' })
  grupo?: Grupo;

  @Column({ name: 'grupo_id', nullable: true })
  grupo_id?: number;

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
