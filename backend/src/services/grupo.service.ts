import { IsNull } from 'typeorm';
import { AppDataSource } from '@config/database';
import { Grupo } from '@entities/Grupo';
import { AsignacionProyecto } from '@entities/AsignacionProyecto';
import { Empleado } from '@entities/Empleado';
import { OperationalError } from '@middleware/errorHandler';
import { hoyLocal } from '@utils/fecha.utils';

export class GrupoService {
  private grupoRepository = AppDataSource.getRepository(Grupo);
  private asignacionRepository = AppDataSource.getRepository(AsignacionProyecto);
  private empleadoRepository = AppDataSource.getRepository(Empleado);

  async crearGrupo(nombre: string, departamentoId: number) {
    if (!nombre?.trim()) {
      throw new OperationalError(400, 'El nombre del grupo es obligatorio');
    }

    const grupo = this.grupoRepository.create({ nombre: nombre.trim(), departamento_id: departamentoId });
    return this.grupoRepository.save(grupo);
  }

  async obtenerGrupos(departamentoId?: number[]) {
    const query = this.grupoRepository
      .createQueryBuilder('grupo')
      .leftJoinAndSelect('grupo.departamento', 'departamento')
      .leftJoinAndSelect('grupo.empleados', 'empleados')
      .orderBy('grupo.nombre', 'ASC');

    if (departamentoId?.length) {
      query.andWhere('grupo.departamento_id IN (:...departamentoId)', { departamentoId });
    }

    const grupos = await query.getMany();

    // Proyecto activo de cada grupo (fecha_fin IS NULL)
    const grupoIds = grupos.map((g) => g.id);
    const activos = grupoIds.length
      ? await this.asignacionRepository
          .createQueryBuilder('a')
          .where('a.grupo_id IN (:...grupoIds)', { grupoIds })
          .andWhere('a.fecha_fin IS NULL')
          .getMany()
      : [];

    const activoPorGrupo = new Map(activos.map((a) => [a.grupo_id, a]));

    return grupos.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      departamento: g.departamento ? { id: g.departamento.id, nombre: g.departamento.nombre } : null,
      empleados: (g.empleados || []).map((e) => ({ id: e.id, nombre: e.nombre, apellido: e.apellido })),
      proyectoActivo: activoPorGrupo.has(g.id)
        ? {
            id: activoPorGrupo.get(g.id)!.id,
            nombreProyecto: activoPorGrupo.get(g.id)!.nombre_proyecto,
            descripcion: activoPorGrupo.get(g.id)!.descripcion || null,
            fechaInicio: activoPorGrupo.get(g.id)!.fecha_inicio,
          }
        : null,
    }));
  }

  private async validarAccesoGrupo(grupoId: number, departamentoIdRestringido?: number[]) {
    const grupo = await this.grupoRepository.findOne({ where: { id: grupoId } });
    if (!grupo) {
      throw new OperationalError(404, 'Grupo no encontrado');
    }
    if (departamentoIdRestringido && !departamentoIdRestringido.includes(grupo.departamento_id)) {
      throw new OperationalError(403, 'No tienes acceso a este grupo');
    }
    return grupo;
  }

  async asignarEmpleadoAGrupo(empleadoId: number, grupoId: number | null, departamentoIdRestringido?: number[]) {
    const empleado = await this.empleadoRepository.findOne({ where: { id: empleadoId } });
    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado');
    }
    if (departamentoIdRestringido && !departamentoIdRestringido.includes(empleado.departamento_id)) {
      throw new OperationalError(403, 'No tienes acceso a este empleado');
    }

    if (grupoId !== null) {
      const grupo = await this.validarAccesoGrupo(grupoId, departamentoIdRestringido);
      if (grupo.departamento_id !== empleado.departamento_id) {
        throw new OperationalError(400, 'El grupo y el empleado deben ser del mismo departamento');
      }
    }

    empleado.grupo_id = grupoId ?? undefined;
    await this.empleadoRepository.save(empleado);
    return { mensaje: '✅ Empleado actualizado exitosamente' };
  }

  async asignarProyecto(
    grupoId: number,
    nombreProyecto: string,
    descripcion: string | undefined,
    usuarioId: number,
    departamentoIdRestringido?: number[],
  ) {
    if (!nombreProyecto?.trim()) {
      throw new OperationalError(400, 'El nombre del proyecto es obligatorio');
    }

    await this.validarAccesoGrupo(grupoId, departamentoIdRestringido);

    const hoy = hoyLocal();

    // Cerrar la asignación activa anterior (si existe) para conservar historial
    await this.asignacionRepository
      .createQueryBuilder()
      .update(AsignacionProyecto)
      .set({ fecha_fin: hoy })
      .where('grupo_id = :grupoId AND fecha_fin IS NULL', { grupoId })
      .execute();

    const nueva = this.asignacionRepository.create({
      grupo_id: grupoId,
      nombre_proyecto: nombreProyecto.trim(),
      descripcion: descripcion?.trim() || undefined,
      fecha_inicio: hoy,
      fecha_fin: null,
      creado_por_usuario_id: usuarioId,
    });

    return this.asignacionRepository.save(nueva);
  }

  /**
   * Nombres de proyecto actualmente abiertos (fecha_fin IS NULL) en el
   * departamento del empleado dueño de usuarioId. Se usa para que el propio
   * técnico elija en qué proyecto trabajó ese día al cerrar su jornada — ya no
   * depende de que esté asignado a ningún grupo, ve todo lo abierto en su
   * departamento, porque a veces rota de proyecto de un día a otro.
   */
  async obtenerProyectosDeMiDepartamento(usuarioId: number): Promise<string[]> {
    const empleado = await this.empleadoRepository.findOne({ where: { usuario_id: usuarioId } });
    if (!empleado?.departamento_id) {
      return [];
    }

    const asignaciones = await this.asignacionRepository.find({
      where: { departamento_id: empleado.departamento_id, fecha_fin: IsNull() },
      order: { fecha_inicio: 'DESC' },
    });

    return [...new Set(asignaciones.map((a) => a.nombre_proyecto))];
  }

  // ==================== Proyectos directos por departamento (sin grupo) ====================

  /** Crea un proyecto nuevo, ligado directo al departamento (sin pasar por un grupo) */
  async crearProyecto(
    departamentoId: number,
    nombreProyecto: string,
    descripcion: string | undefined,
    usuarioId: number,
  ) {
    if (!nombreProyecto?.trim()) {
      throw new OperationalError(400, 'El nombre del proyecto es obligatorio');
    }
    if (!departamentoId) {
      throw new OperationalError(400, 'El departamento es obligatorio');
    }

    const nuevo = this.asignacionRepository.create({
      departamento_id: departamentoId,
      nombre_proyecto: nombreProyecto.trim(),
      descripcion: descripcion?.trim() || undefined,
      fecha_inicio: hoyLocal(),
      fecha_fin: null,
      creado_por_usuario_id: usuarioId,
    });

    return this.asignacionRepository.save(nuevo);
  }

  /** Lista los proyectos (activos e historial) del departamento indicado, o de todos si no se pasa */
  async obtenerProyectos(departamentoId?: number[]) {
    const query = this.asignacionRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.departamento', 'departamento')
      .orderBy('a.fecha_fin', 'ASC', 'NULLS FIRST')
      .addOrderBy('a.fecha_inicio', 'DESC');

    if (departamentoId?.length) {
      query.andWhere('a.departamento_id IN (:...departamentoId)', { departamentoId });
    } else {
      query.andWhere('a.departamento_id IS NOT NULL');
    }

    const proyectos = await query.getMany();

    return proyectos.map((p) => ({
      id: p.id,
      nombreProyecto: p.nombre_proyecto,
      descripcion: p.descripcion || null,
      fechaInicio: p.fecha_inicio,
      fechaFin: p.fecha_fin,
      activo: !p.fecha_fin,
      departamento: p.departamento ? { id: p.departamento.id, nombre: p.departamento.nombre } : null,
    }));
  }

  /** Marca un proyecto como finalizado por su propio id */
  async finalizarProyectoPorId(proyectoId: number, departamentoIdRestringido?: number[]) {
    const proyecto = await this.asignacionRepository.findOne({ where: { id: proyectoId } });
    if (!proyecto) {
      throw new OperationalError(404, 'Proyecto no encontrado');
    }
    if (departamentoIdRestringido && !departamentoIdRestringido.includes(proyecto.departamento_id!)) {
      throw new OperationalError(403, 'No tienes acceso a este proyecto');
    }
    if (proyecto.fecha_fin) {
      throw new OperationalError(400, 'Este proyecto ya está finalizado');
    }

    proyecto.fecha_fin = hoyLocal();
    await this.asignacionRepository.save(proyecto);
    return { mensaje: '✅ Proyecto finalizado exitosamente' };
  }
}
