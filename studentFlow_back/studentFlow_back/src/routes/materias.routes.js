import { Router } from "express";

import {

    listMaterias,
    getMateria,
    createMateria,
    replaceMateria,
    updateMateria,
    deleteMateria
    
} from "../controllers/materias.controller.js"

const router = Router();

router.get("/", listMaterias);
router.get("/:id", getMateria);
router.post("/", createMateria);
router.put("/:id", replaceMateria);
router.patch("/:id", updateMateria);
router.delete("/:id", deleteMateria);

export default router;

//http://localhost:3000/api/v1/materias/