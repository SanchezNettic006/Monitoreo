const { Client } = require('pg');

const c = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'worktime',
  database: 'postgres'
});

c.connect()
  .then(async () => {
    console.log('📍 Verificando BDs...');
    
    const result = await c.query(`SELECT datname FROM pg_database WHERE datname = 'nettic'`);
    console.log('BD nettic existe:', result.rows.length > 0 ? 'SÍ' : 'NO');
    
    if (result.rows.length > 0) {
      const tablesResult = await c.query(`SELECT tablename FROM pg_tables WHERE schemaname='public'`);
      console.log('Tablas en nettic:', tablesResult.rows.map(r => r.tablename).join(', '));
    }
    
    await c.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
