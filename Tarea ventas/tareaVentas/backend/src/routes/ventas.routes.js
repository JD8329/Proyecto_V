import { Router } from 'express';
import {
  annulSale,
  createSale,
  getSale,
  listSales,
  replaceSale,
  updateSale,
} from '../controllers/ventas.controller.js';

const router = Router();
router.get('/', listSales);
router.get('/:id', getSale);
router.post('/', createSale);
router.put('/:id', replaceSale);
router.patch('/:id', updateSale);
router.patch('/:id/anular', annulSale);

export default router;
