const bcrypt = require('bcrypt');
const pg = require('pg');

async function seedUser() {
  // Primero conectar a postgres por defecto para crear la BD nettic si no existe
  const adminClient = new pg.Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'worktime',
    database: 'postgres'
  });

  try {
    await adminClient.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Crear base de datos nettic si no existe
    try {
      await adminClient.query('CREATE DATABASE nettic;');
      console.log('✅ Base de datos nettic creada');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('✓ Base de datos nettic ya existe');
      } else {
        throw err;
      }
    }

    await adminClient.end();

    // Ahora conectar a la BD nettic
    const client = new pg.Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'worktime',
      database: 'nettic'
    });

    await client.connect();
    console.log('✅ Conectado a la base de datos nettic');

    // Crear tabla usuario si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuario (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(50) DEFAULT 'empleado'
      );
    `);
    console.log('✅ Tabla usuario lista');

    // Hashear la contraseña
    const password = 'demo123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Verificar si el usuario ya existe
    const existingUser = await client.query(
      'SELECT * FROM usuario WHERE email = $1',
      ['admin@nettic.com']
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  El usuario admin@nettic.com ya existe');
    } else {
      // Insertar el usuario
      const result = await client.query(
        'INSERT INTO usuario (email, password_hash, rol) VALUES ($1, $2, $3) RETURNING id, email, rol',
        ['admin@nettic.com', hashedPassword, 'admin']
      );
      console.log('✅ Usuario creado exitosamente:');
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Rol: ${result.rows[0].rol}`);
      console.log(`   Contraseña: ${password}`);
    }

    // Mostrar todos los usuarios
    const allUsers = await client.query('SELECT id, email, rol FROM usuario');
    console.log('\n📋 Usuarios en la base de datos:');
    allUsers.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.rol})`);
    });

    await client.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

seedUser();
