import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from './Usuario';
import { Departamento } from './Departamento';

/**
 * Departamentos ADICIONALES que supervisa un líder, más allá del propio
 * (el que ya tiene por ser empleado de ese departamento). Ej: el líder de
 * Troncal que también supervisa Vehículos tendría una fila aquí con
 * departamento_id = Vehículos.
 */
@Entity('lider_departamento_extra')
export class LiderDepartamentoExtra {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @Column({ name: 'usuario_id' })
  usuario_id!: number;

  @ManyToOne(() => Departamento)
  @JoinColumn({ name: 'departamento_id' })
  departamento!: Departamento;

  @Column({ name: 'departamento_id' })
  departamento_id!: number;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
