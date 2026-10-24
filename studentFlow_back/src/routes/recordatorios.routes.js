import { Router } from "express";
import {
    createRecordatorio,
    deleteRecordatorio,
    getRecordatorio,
    listRecordatorios,
    listTareas,
    replaceRecordatorio,
    updateRecordatorio,
} from "../controllers/recordatorios.controller.js";

const router = Router();

router.get("/", listRecordatorios);
router.get("/tareas", listTareas);
router.get("/:id", getRecordatorio);
router.post("/", createRecordatorio);
router.put("/:id", replaceRecordatorio);
router.patch("/:id", updateRecordatorio);
router.delete("/:id", deleteRecordatorio);

export default router;
