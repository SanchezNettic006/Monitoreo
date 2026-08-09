# NETTIC Frontend - Angular 18

Sistema de Control de Asistencia y Horas Extras

## 🚀 Características

- ✅ Login con Material Design
- ✅ Autenticación con JWT
- ✅ Protección de rutas
- ✅ Diseño responsive (móvil y desktop)
- ✅ HTTP Interceptor para token automático
- ✅ Dashboard post-autenticación

## 📦 Requisitos

- Node.js 20+
- npm 10+

## 🔧 Instalación

```bash
npm install
```

## 🎯 Desarrollo

```bash
npm start
```

El proyecto se abrirá en [http://localhost:4200](http://localhost:4200)

### Credenciales de prueba
- Email: `admin@nettic.com`
- Contraseña: `password123`

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── components/
│   │   ├── login/          # Componente de login
│   │   └── dashboard/      # Dashboard principal
│   ├── services/
│   │   └── auth.service.ts # Servicio de autenticación
│   ├── guards/
│   │   └── auth.guard.ts   # Guard de protección de rutas
│   ├── interceptors/
│   │   └── auth.interceptor.ts  # Interceptor HTTP para JWT
│   ├── app.routes.ts       # Configuración de rutas
│   └── app.config.ts       # Configuración de la app
├── environments/
│   ├── environment.ts      # Variables de desarrollo
│   └── environment.prod.ts # Variables de producción
└── styles.scss             # Estilos globales
```

## 🌐 API Backend

El frontend se conecta al backend en `http://localhost:3001/api`

### Endpoints utilizados

- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/perfil` - Obtener perfil del usuario (protegido)

## 🏗️ Build Producción

```bash
npm run build
```

Los archivos compilados estarán en `dist/frontend/`

## 🎨 Temas de Material Design

El proyecto utiliza Angular Material con tema personalizado:
- Color primario: Púrpura (#667eea)
- Gradiente: Púrpura a violeta (#764ba2)

## 📱 Responsive Design

- **Móvil**: Optimizado para pantallas < 480px
- **Tablet**: Optimizado para pantallas 768px
- **Desktop**: Optimizado para pantallas > 1024px

## 🔐 Seguridad

- JWT Token almacenado en localStorage
- Interceptor HTTP automático para incluir token
- Guard de autenticación en rutas protegidas
- Logout seguro (limpia token y usuario)

## 📝 Notas

- El token JWT expira en 24 horas
- La contraseña se envía con hash bcrypt al backend
- Los errores de autenticación se muestran en la interfaz

## 🚢 Despliegue

Para desplegar en producción:

1. Compilar: `npm run build`
2. Servir archivos de `dist/frontend/` desde un servidor web
3. Configurar CORS en el backend para permitir el dominio del frontend

---

**NETTIC - Sistema de Control de Asistencia** © 2024
