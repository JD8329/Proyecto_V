import 'dotenv/config';

function positiveInteger(name, fallback) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === '') return fallback;

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} debe ser un número entero positivo.`);
  }
  return value;
}

export const env = Object.freeze({
  port: positiveInteger('PORT', 3001),
  database: Object.freeze({
    host: process.env.DB_HOST || '127.0.0.1',
    port: positiveInteger('DB_PORT', 3306),
    name: process.env.DB_NAME || 'laboratorio_ventas',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: positiveInteger('DB_CONNECTION_LIMIT', 10),
  }),
});
