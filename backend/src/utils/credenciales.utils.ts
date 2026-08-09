/**
 * Utilidades para generar credenciales de usuario
 */
import bcrypt from 'bcrypt';
import { AppDataSource } from '@config/database';
import { Usuario } from '@entities/Usuario';

/**
 * Generar username basado en nombre y apellido
 * Ej: Juan Pérez → juan.perez
 */
export function generarUsername(nombre: string, apellido: string): string {
  const baseUsername = `${nombre.toLowerCase()}.${apellido.toLowerCase()}`;
  return baseUsername.replace(/[áéíóú]/g, (char) => {
    const replacements: { [key: string]: string } = {
      á: 'a',
      é: 'e',
      í: 'i',
      ó: 'o',
      ú: 'u'
    };
    return replacements[char] || char;
  });
}

/**
 * Generar username único (verificar que no exista en BD)
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
 * Generar email basado en nombre y apellido
 * Ej: Juan Pérez → juan.perez@nettic.com
 */
export function generarEmail(nombre: string, apellido: string): string {
  const baseEmail = `${nombre.toLowerCase()}.${apellido.toLowerCase()}@nettic.com`;
  return baseEmail.replace(/[áéíóú]/g, (char) => {
    const replacements: { [key: string]: string } = {
      á: 'a',
      é: 'e',
      í: 'i',
      ó: 'o',
      ú: 'u'
    };
    return replacements[char] || char;
  });
}

/**
 * Generar email único (verificar que no exista en BD)
 */
export async function generarEmailUnico(nombre: string, apellido: string): Promise<string> {
  let email = generarEmail(nombre, apellido);
  const usuarioRepository = AppDataSource.getRepository(Usuario);
  let contador = 1;

  while (await usuarioRepository.findOne({ where: { email } })) {
    // Si el email existe, agregar número al final
    email = generarEmail(nombre, apellido).replace('@nettic.com', `${contador}@nettic.com`);
    contador++;
  }

  return email;
}

/**
 * Generar password aleatorio seguro
 * Formato: 12 caracteres (mayúsculas, minúsculas, números, símbolos)
 */
export function generarPasswordTemporal(): string {
  const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const numeros = '0123456789';
  const simbolos = '!@#$%&*';

  const caracteres = mayusculas + minusculas + numeros + simbolos;
  let password = '';

  // Asegurar al menos uno de cada tipo
  password += mayusculas[Math.floor(Math.random() * mayusculas.length)];
  password += minusculas[Math.floor(Math.random() * minusculas.length)];
  password += numeros[Math.floor(Math.random() * numeros.length)];
  password += simbolos[Math.floor(Math.random() * simbolos.length)];

  // Llenar el resto aleatoriamente
  for (let i = password.length; i < 12; i++) {
    password += caracteres[Math.floor(Math.random() * caracteres.length)];
  }

  // Mezclar caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Hashear password (bcrypt)
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

