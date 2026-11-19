import app from './app.js';
import { checkDatabaseConnection, pool } from './config/database.js';
import { env } from './config/env.js';

const httpServer = app.listen(env.port, async () => {
  console.log(`API de ventas disponible en http://localhost:${env.port}`);
  try {
    await checkDatabaseConnection();
    console.log('Conexión con laboratorio_ventas comprobada.');
  } catch (error) {
    console.error('No fue posible conectar con laboratorio_ventas:', error.message);
  }
});

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Cerrando la aplicación (${signal})...`);
  await new Promise((resolve, reject) => {
    httpServer.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
}

function handleSignal(signal) {
  void shutdown(signal).catch((error) => {
    console.error('Error durante el cierre:', error.message);
    process.exitCode = 1;
  });
}

process.once('SIGINT', () => handleSignal('SIGINT'));
process.once('SIGTERM', () => handleSignal('SIGTERM'));
