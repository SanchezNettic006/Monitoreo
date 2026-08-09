const { Client } = require('pg');

const c = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'worktime',
  database: 'nettic'
});

c.connect()
  .then(async () => {
    console.log('📍 Verificando departamentos existentes...');
    
    try {
      const result = await c.query(`SELECT * FROM public.departamento`);
      console.log('Departamentos actuales:', result.rows);
      
      console.log('\n📍 Insertando departamentos faltantes...');
      const insertResult = await c.query(`
        INSERT INTO public.departamento (id, nombre, descripcion) 
        VALUES 
          (2, 'Campo', 'Departamento de campo'),
          (3, 'Administración', 'Departamento administrativo')
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Insertados:', insertResult.rowCount);
      
      const finalResult = await c.query(`SELECT * FROM public.departamento`);
      console.log('Departamentos finales:', finalResult.rows);
    } catch (e) {
      console.error('Error en query:', e.message);
      
      // Intentar sin schema
      console.log('\n📍 Intentando sin schema explícito...');
      const schemas = await c.query(`SELECT * FROM information_schema.tables WHERE table_name='departamento'`);
      console.log('Tabla encontrada en schema:', schemas.rows.map(r => r.table_schema).join(', '));
    }
    
    await c.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error conexión:', err.message);
    process.exit(1);
  });
