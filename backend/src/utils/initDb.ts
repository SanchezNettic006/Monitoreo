import { AppDataSource } from '@config/database';

/**
 * Inicializar columnas faltantes en la base de datos
 * Ejecutar al iniciar la aplicación
 */
export async function inicializarColumnas() {
  try {
    const queryRunner = AppDataSource.createQueryRunner();

    // Conectar a la BD
    await queryRunner.connect();

    console.log('🔧 Verificando columnas en empleado...');

    // Verificar si la columna foto_perfil existe
    const tablaExiste = await queryRunner.hasTable('empleado');
    
    if (tablaExiste) {
      const columnaExiste = await queryRunner.hasColumn('empleado', 'foto_perfil');

      if (!columnaExiste) {
        console.log('📸 Agregando columna foto_perfil...');
        await queryRunner.query(
          `ALTER TABLE empleado ADD COLUMN foto_perfil VARCHAR(255) NULL DEFAULT NULL`
        );
        console.log('✅ Columna foto_perfil agregada exitosamente');
      } else {
        console.log('✅ Columna foto_perfil ya existe');
      }
    }

    // Liberar queryRunner
    await queryRunner.release();
  } catch (error) {
    console.error('❌ Error al inicializar columnas:', error);
    // No lanzar error - continuar con la aplicación
  }
}
