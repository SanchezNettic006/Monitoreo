import { Between, In } from 'typeorm';
import { AppDataSource } from '@config/database';
import { DescansoEmpleado } from '@entities/DescansoEmpleado';
import { Empleado } from '@entities/Empleado';
import { OperationalError } from '@middleware/errorHandler';
import { hoyLocal } from '@utils/fecha.utils';

export class DescansoService {
  private descansoRepository = AppDataSource.getRepository(DescansoEmpleado);
  private empleadoRepository = AppDataSource.getRepository(Empleado);

  /**
   * Días de descanso rotativo de los empleados de uno o varios departamentos
   * dentro de un mes ('YYYY-MM'), para el calendario de equipo del líder/admin.
   */
  async listarPorDepartamentos(departamentoIds: number[] | undefined, mes: string) {
    const [anio, mesNum] = mes.split('-').map(Number);
    const fechaInicio = `${anio}-${String(mesNum).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mesNum, 0).getDate();
    const fechaFin = `${anio}-${String(mesNum).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    const query = this.descansoRepository
      .createQueryBuilder('descanso')
      .leftJoinAndSelect('descanso.empleado', 'empleado')
      .where('descanso.fecha BETWEEN :fechaInicio AND :fechaFin', { fechaInicio, fechaFin });

    if (departamentoIds !== undefined) {
      query.andWhere('empleado.departamento_id IN (:...departamentoIds)', { departamentoIds });
    }

    return query.orderBy('descanso.fecha', 'ASC').getMany();
  }

  /** Empleados de los departamentos dados, para elegir a quién marcarle un descanso */
  async listarEmpleadosDeDepartamentos(departamentoIds: number[] | undefined) {
    const query = this.empleadoRepository
      .createQueryBuilder('empleado')
      .where('empleado.estado != :estado', { estado: 'inactivo' });

    if (departamentoIds !== undefined) {
      query.andWhere('empleado.departamento_id IN (:...departamentoIds)', { departamentoIds });
    }

    return query.orderBy('empleado.nombre', 'ASC').getMany();
  }

  async crear(empleadoId: number, fecha: string, departamentoIdsPermitidos: number[] | undefined, creadoPorUsuarioId: number) {
    const empleado = await this.empleadoRepository.findOne({ where: { id: empleadoId } });
    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado');
    }

    if (departamentoIdsPermitidos !== undefined && !departamentoIdsPermitidos.includes(empleado.departamento_id)) {
      throw new OperationalError(403, 'No tienes permisos para asignar descansos a este empleado');
    }

    const yaExiste = await this.descansoRepository.findOne({ where: { empleado_id: empleadoId, fecha } });
    if (yaExiste) {
      throw new OperationalError(400, 'Ese empleado ya tiene marcado descanso ese día');
    }

    const descanso = this.descansoRepository.create({
      empleado_id: empleadoId,
      fecha,
      creado_por_usuario_id: creadoPorUsuarioId,
    });

    const guardado = await this.descansoRepository.save(descanso);
    return {
      id: guardado.id,
      empleado_id: guardado.empleado_id,
      empleado_nombre: `${empleado.nombre} ${empleado.apellido}`,
      fecha: guardado.fecha,
    };
  }

  async eliminar(id: number, departamentoIdsPermitidos: number[] | undefined) {
    const descanso = await this.descansoRepository.findOne({ where: { id }, relations: ['empleado'] });
    if (!descanso) {
      throw new OperationalError(404, 'Descanso no encontrado');
    }

    if (departamentoIdsPermitidos !== undefined && !departamentoIdsPermitidos.includes(descanso.empleado.departamento_id)) {
      throw new OperationalError(403, 'No tienes permisos para quitar este descanso');
    }

    await this.descansoRepository.delete(id);
    return { id };
  }

  /** Empleados con descanso marcado hoy, para los resúmenes de asistencia del día */
  async obtenerDescansosHoy(): Promise<{ empleado_id: number; nombre_completo: string }[]> {
    const hoy = hoyLocal();
    const descansos = await this.descansoRepository
      .createQueryBuilder('descanso')
      .leftJoinAndSelect('descanso.empleado', 'empleado')
      .where('descanso.fecha = :hoy', { hoy })
      .getMany();

    return descansos.map((d) => ({
      empleado_id: d.empleado_id,
      nombre_completo: d.empleado ? `${d.empleado.nombre} ${d.empleado.apellido}` : '-',
    }));
  }

  /** Descansos de un conjunto de empleados en un rango de fechas (para Reportes: no cuentan como falta) */
  async obtenerEnRango(empleadoIds: number[], fechaInicio: string, fechaFin: string): Promise<DescansoEmpleado[]> {
    if (empleadoIds.length === 0) return [];
    return this.descansoRepository.find({
      where: { empleado_id: In(empleadoIds), fecha: Between(fechaInicio, fechaFin) },
    });
  }
}

export const descansoService = new DescansoService();
