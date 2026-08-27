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
  rol!: string; // 'empleado', 'lider', 'admin'

  // Foto de perfil propia del usuario (independiente de Empleado.foto_perfil,
  // para cuentas sin registro de empleado, como el admin)
  @Column({ nullable: true })
  foto_perfil?: string;

  // Alertas por Telegram (jornada larga sin cerrar, recordatorio de check-in).
  // chat_id se obtiene cuando el usuario le escribe /start al bot; no requiere
  // pedir ni almacenar su número de teléfono.
  @Column({ nullable: true })
  telegram_chat_id?: string;

  // Código temporal de un solo uso para vincular la cuenta con el bot
  @Column({ nullable: true })
  telegram_link_code?: string;

  @OneToOne(() => Empleado, (empleado) => empleado.usuario)
  empleado!: Empleado;
}
