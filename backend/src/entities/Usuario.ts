import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
} from 'typeorm';
import { Empleado } from './Empleado';

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password_hash!: string; // Debe estar hasheada

  @Column({ default: 'empleado' })
  rol!: string; // 'empleado', 'supervisor', 'admin'

  @OneToOne(() => Empleado, (empleado) => empleado.usuario)
  empleado!: Empleado;
}
