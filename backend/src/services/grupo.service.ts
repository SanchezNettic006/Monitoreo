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

  async obtenerGrupos(departamentoId?: number) {
    const query = this.grupoRepository
      .createQueryBuilder('grupo')
      .leftJoinAndSelect('grupo.departamento', 'departamento')
      .leftJoinAndSelect('grupo.empleados', 'empleados')
      .orderBy('grupo.nombre', 'ASC');

    if (departamentoId) {
      query.andWhere('grupo.departamento_id = :departamentoId', { departamentoId });
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

  private async validarAccesoGrupo(grupoId: number, departamentoIdRestringido?: number) {
    const grupo = await this.grupoRepository.findOne({ where: { id: grupoId } });
    if (!grupo) {
      throw new OperationalError(404, 'Grupo no encontrado');
    }
    if (departamentoIdRestringido && grupo.departamento_id !== departamentoIdRestringido) {
      throw new OperationalError(403, 'No tienes acceso a este grupo');
    }
    return grupo;
  }

  async asignarEmpleadoAGrupo(empleadoId: number, grupoId: number | null, departamentoIdRestringido?: number) {
    const empleado = await this.empleadoRepository.findOne({ where: { id: empleadoId } });
    if (!empleado) {
      throw new OperationalError(404, 'Empleado no encontrado');
    }
    if (departamentoIdRestringido && empleado.departamento_id !== departamentoIdRestringido) {
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
    departamentoIdRestringido?: number,
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
   * Nombres de proyecto (activos + historial, sin duplicados) de TODOS los grupos
   * del departamento del empleado dueño de usuarioId — no solo del grupo al que
   * esté asignado. Se usa para que el propio técnico elija en qué proyecto
   * trabajó ese día al cerrar su jornada, sin depender de que el líder lo tenga
   * asignado manualmente a un grupo (a veces rota de proyecto de un día a otro).
   */
  async obtenerProyectosDeMiDepartamento(usuarioId: number): Promise<string[]> {
    const empleado = await this.empleadoRepository.findOne({ where: { usuario_id: usuarioId } });
    if (!empleado?.departamento_id) {
      return [];
    }

    const grupos = await this.grupoRepository.find({ where: { departamento_id: empleado.departamento_id } });
    const grupoIds = grupos.map((g) => g.id);
    if (grupoIds.length === 0) {
      return [];
    }

    const asignaciones = await this.asignacionRepository
      .createQueryBuilder('a')
      .where('a.grupo_id IN (:...grupoIds)', { grupoIds })
      .orderBy('a.fecha_inicio', 'DESC')
      .getMany();

    return [...new Set(asignaciones.map((a) => a.nombre_proyecto))];
  }

  async obtenerHistorial(grupoId: number, departamentoIdRestringido?: number) {
    await this.validarAccesoGrupo(grupoId, departamentoIdRestringido);

    return this.asignacionRepository.find({
      where: { grupo_id: grupoId },
      order: { fecha_inicio: 'DESC' },
    });
  }
}
