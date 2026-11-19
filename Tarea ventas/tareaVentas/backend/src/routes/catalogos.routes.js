import { Router } from 'express';
import { listClients, listProducts } from '../controllers/catalogos.controller.js';

const clients = Router();
const products = Router();
clients.get('/', listClients);
products.get('/', listProducts);

export default Object.freeze({ clients, products });
