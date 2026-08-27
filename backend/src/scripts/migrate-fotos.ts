import { AppDataSource } from '@config/database';

async function migrate() {
  try {
    console.log('🔗 Conectando a la base de datos...');
    await AppDataSource.initialize();
    console.log('✅ Conectado');

    const queryRunner = AppDataSource.createQueryRunner();

    console.log('📝 Agregando columna hora_extra_id a foto_asistencia...');
    
    // Verificar si la columna ya existe
    const hasColumn = await queryRunner.hasColumn('foto_asistencia', 'hora_extra_id');
    
    if (!hasColumn) {
      await queryRunner.addColumn(
        'foto_asistencia',
        new (require('typeorm').TableColumn)({
          name: 'hora_extra_id',
          type: 'integer',
          isNullable: true,
        })
      );
      console.log('✅ Columna hora_extra_id agregada');

      // Agregar foreign key
      await queryRunner.createForeignKey(
        'foto_asistencia',
        new (require('typeorm').TableForeignKey)({
          columnNames: ['hora_extra_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'hora_extra',
          onDelete: 'CASCADE',
        })
      );
      console.log('✅ Foreign key agregada');
    } else {
      console.log('ℹ️  La columna hora_extra_id ya existe');
    }

    await AppDataSource.destroy();
    console.log('✅ Migración completada');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

migrate();
