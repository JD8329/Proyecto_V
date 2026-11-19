import { Router } from 'express';
import {
  getDailySales,
  getIndicators,
  getSummaryStatus,
  refreshSummary,
} from '../controllers/resumen.controller.js';

const router = Router();
router.post('/actualizar', refreshSummary);
router.get('/estado', getSummaryStatus);
router.get('/indicadores', getIndicators);
router.get('/ventas-diarias', getDailySales);

export default router;
