/**
 * Utilidades para generación de credenciales de empleados
 */

import bcrypt from 'bcrypt';
import { AppDataSource } from '@config/database';
import { Usuario } from '@entities/Usuario';

/**
 * Genera un username basado en nombre y apellido
 * Ejemplo: Juan Pérez → juan.perez
 */
export function generarUsername(nombre: string, apellido: string): string {
  const nombre_limpio = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const apellido_limpio = apellido
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  return `${nombre_limpio}.${apellido_limpio}`;
}

/**
 * Genera un username único (verificar en BD que no exista)
 */
export async function generarUsernameUnico(nombre: string, apellido: string): Promise<string> {
  let username = generarUsername(nombre, apellido);
  const usuarioRepository = AppDataSource.getRepository(Usuario);
  let contador = 1;

  while (await usuarioRepository.findOne({ where: { username } })) {
    username = generarUsername(nombre, apellido) + contador;
    contador++;
  }

  return username;
}

/**
 * Genera un email único basado en nombre y apellido
 * Ejemplo: Juan Pérez → juan.perez@nettic.com
 */
export function generarEmailUnico(nombre: string, apellido: string): string {
  const nombre_limpio = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .trim();

  const apellido_limpio = apellido
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  return `${nombre_limpio}.${apellido_limpio}@nettic.com`;
}

/**
 * Genera una contraseña temporal segura (12 caracteres)
 * Incluye mayúsculas, minúsculas, números y símbolos
 */
export function generarPasswordTemporal(): string {
  const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const numeros = '0123456789';
  const simbolos = '!@#$%';

  const todas = mayusculas + minusculas + numeros + simbolos;

  let password = '';
  password += mayusculas[Math.floor(Math.random() * mayusculas.length)];
  password += minusculas[Math.floor(Math.random() * minusculas.length)];
  password += numeros[Math.floor(Math.random() * numeros.length)];
  password += simbolos[Math.floor(Math.random() * simbolos.length)];

  for (let i = 4; i < 12; i++) {
    password += todas[Math.floor(Math.random() * todas.length)];
  }

  // Mezclar la contraseña
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Hashea una contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
