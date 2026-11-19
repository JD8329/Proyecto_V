import express from 'express';
import { fileURLToPath } from 'node:url';

import catalogRouter from './routes/catalogos.routes.js';
import healthRouter from './routes/health.routes.js';
import summaryRouter from './routes/resumen.routes.js';
import salesRouter from './routes/ventas.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

const app = express();
const frontDirectory = fileURLToPath(new URL('../../front', import.meta.url));

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use(express.static(frontDirectory));

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/clientes', catalogRouter.clients);
app.use('/api/v1/productos', catalogRouter.products);
app.use('/api/v1/ventas', salesRouter);
app.use('/api/v1/resumen', summaryRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
