

## Requisitos

- **Node.js** 18+
- **npm** 9+
- **PostgreSQL** 14+
- **Docker** (opcional, para usar docker-compose)




### Instalación De Dependencias

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo .env 
cp .env

3. Configurar variables en .env
# DB_HOST=localhost
# DB_PASSWORD=worktime
# etc...

4. Asegurar que PostgreSQL esté corriendo en puerto 5432 (localmente)

# 5. Iniciar servidor en modo desarrollo
npm run dev
```

## Scripts Disponibles

```bash
npm run dev         # Desarrollo con hot-reload (ts-node-dev)
npm run build       # Compilar TypeScript a dist/
npm start           # Iniciar en producción (dist/main.js)
```

## Estructura del Proyecto

```
src/
├── main.ts                  # Entry point
├── app.ts                   # Configuración Express
│
├── config/
│   ├── env.ts              # Configuración de variables de entorno
│   └── database.ts         # Conexión TypeORM
│
├── entities/               # Modelos/Entidades
│   ├── Usuario.ts
│   ├── Empleado.ts
│   ├── RecordAsistencia.ts
│   ├── FotoAsistencia.ts
│   └── ...
│
├── services/               # Lógica de negocio
│   ├── auth.service.ts
│   ├── empleado.service.ts
│   ├── asistencia.service.ts
│   └── reportes.service.ts
│
├── controllers/            # Handlers HTTP
│   ├── auth.controller.ts
│   ├── asistencia.controller.ts
│   └── reportes.controller.ts
│
├── routes/                 # Rutas Express
│   ├── auth.routes.ts
│   ├── asistencia.routes.ts
│   └── reportes.routes.ts
│
├── middleware/             # Middleware Express
│   ├── auth.middleware.ts  # Validación JWT
│   └── errorHandler.ts     # Manejo global de errores
│
└── utils/                  # Utilidades
    └── jwt.utils.ts        # Funciones JWT
```

## Endpoints Principales

### Autenticación
```
POST   /api/auth/registrar              Registrar nuevo usuario
POST   /api/auth/login                  Login (devuelve JWT)
GET    /api/auth/perfil                 Obtener perfil (requiere JWT)
```

### Asistencia
```
POST   /api/asistencia/entrada          Registrar entrada (con foto/GPS)
POST   /api/asistencia/salida           Registrar salida (con foto/GPS)
GET    /api/asistencia/hoy              Obtener registro de hoy
GET    /api/asistencia/resumen          Resumen de jornada actual
GET    /api/asistencia/registros        Histórico (con filtros de fecha)
```

### Reportes
```
GET    /api/reportes/dashboard          Dashboard admin (stats globales)
GET    /api/reportes/horas-extras-depto Horas extras por departamento
GET    /api/reportes/registros-empleados Registros de un día
GET    /api/reportes/empleado           Reporte individual detallado
```

### Salud
```
GET    /health                          Health check del servidor
```

## Autenticación JWT

1. **Registrar usuario:**
```bash
curl -X POST http://localhost:3001/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "email": "empleado@nettic.com",
    "contrasena": "password123",
    "rol": "empleado"
  }'
```

2. **Login (obtener token):**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "empleado@nettic.com",
    "contrasena": "password123"
  }'
```

3. **Usar token en endpoints protegidos:**
```bash
curl -X GET http://localhost:3001/api/asistencia/hoy \
  -H "Authorization: Bearer <tu_token_aqui>"
```

## Variables de Entorno

Crear archivo `.env` en raíz del proyecto:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=worktime
DB_DATABASE=nettic

# Servidor
NODE_ENV=development
PORT=3001

# JWT
JWT_SECRET=llave_secreto
JWT_EXPIRE=24h

# CORS
CORS_ORIGIN=http://localhost:4200

# Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

## Docker (Alternativa)

### Iniciar servicios:
```bash
docker-compose up -d
```

### Ver logs:
```bash
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Parar servicios:
```bash
docker-compose down
```

### Eliminar datos (CUIDADO):
```bash
docker-compose down -v  # -v elimina volúmenes
```

## Desarrollo

### Agregar nueva entidad:
1. Crear archivo en `src/entities/MiEntidad.ts`
2. Heredar de TypeORM `Entity`
3. TypeORM sincroniza automáticamente en `development`

### Crear nuevo endpoint:
1. Crear servicio en `src/services/mi.service.ts`
2. Crear controlador en `src/controllers/mi.controller.ts`
3. Agregar ruta en `src/routes/mi.routes.ts`
4. Registrar ruta en `src/app.ts`

### Hot-reload en desarrollo:
```bash
npm run dev
# Cambios en archivos .ts se recargan automáticamente
```

##  Troubleshooting

**Error: "Cannot find module 'typeorm'"**
```bash
npm install
```

**Error: "connect ECONNREFUSED 127.0.0.1:5432"**
- Asegurar PostgreSQL esté corriendo
- Verificar credenciales en `.env`
- Con Docker: `docker-compose up postgres`

**Error: "Port 3001 already in use"**
```bash
# Cambiar puerto en .env o:
PORT=3002 npm run dev
```

##  Próximos Pasos

- [ ] Agregar validación detallada con `class-validator`
- [ ] Implementar migraciones TypeORM
- [ ] Agregar tests unitarios
- [ ] Documentación Swagger/OpenAPI
- [ ] Rate limiting
- [ ] Logging avanzado (Winston)
- [ ] Cache Redis

## Licencia

MIT
