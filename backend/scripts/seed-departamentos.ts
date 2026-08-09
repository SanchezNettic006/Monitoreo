#!/usr/bin/env ts-node
import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { Departamento } from './src/entities/Departamento';

async function seedDepartamentos() {
  try {
    console.log('🌱 Sembrando departamentos...');
    
    await AppDataSource.initialize();
    
    const departamentoRepository = AppDataSource.getRepository(Departamento);
    
    // Departamentos a crear
    const departamentos = [
      { id: 1, nombre: 'Taller', descripcion: 'Departamento de taller técnico' },
      { id: 2, nombre: 'Campo', descripcion: 'Departamento de campo' },
      { id: 3, nombre: 'Administración', descripcion: 'Departamento administrativo' }
    ];
    
    for (const dept of departamentos) {
      const existe = await departamentoRepository.findOne({
        where: { id: dept.id }
      });
      
      if (!existe) {
        const nuevoDepartamento = departamentoRepository.create(dept);
        await departamentoRepository.save(nuevoDepartamento);
        console.log(`✅ Departamento creado: ${dept.nombre}`);
      } else {
        console.log(`⏭️  Departamento ya existe: ${dept.nombre}`);
      }
    }
    
    console.log('🎉 Departamentos listos');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedDepartamentos();
