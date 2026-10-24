import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../src/config/database.js";
import {
    validateCreateRecordatorio,
    validatePatchRecordatorio,
    validateRecordatorioId,
    validateRecordatorioListQuery,
} from "../src/validators/recordatorios.validator.js";
import {
    createRecordatorio,
    deleteRecordatorio,
    findAllByUserId,
    updateRecordatorio,
} from "../src/repositories/recordatorios.repositorio.js";

const sample = {
    id: 4,
    tareaId: 12,
    tareaTitulo: "Entrega del proyecto",
    materiaNombre: "Programación V",
    mensaje: "Revisar avances",
    fechaHora: "2026-08-21T18:30:00",
    canal: "in_app",
    leido: 0,
    createdAt: "2026-08-20T10:00:00",
};

test("la validación normaliza los datos y conserva los valores del esquema", () => {
    assert.deepEqual(validateCreateRecordatorio({
        tareaId: "12",
        mensaje: "  Revisar avances ",
        fechaHora: "2026-08-21T18:30",
        canal: "in_app",
    }), {
        tareaId: 12,
        mensaje: "Revisar avances",
        fechaHora: "2026-08-21 18:30:00",
        canal: "in_app",
        leido: false,
    });
    assert.deepEqual(validatePatchRecordatorio({ leido: "true" }), { leido: true });
    assert.deepEqual(validateRecordatorioListQuery({ leido: "false" }).leido, false);
    assert.equal(validateRecordatorioId("4"), 4);
});

test("la validación rechaza fechas, canales, identificadores y filtros inválidos", () => {
    assert.throws(() => validateCreateRecordatorio({
        tareaId: 1, mensaje: "Aviso", fechaHora: "2026-02-30T18:30", canal: "email",
    }), { code: "VALIDATION_ERROR" });
    assert.throws(() => validateCreateRecordatorio({
        tareaId: 1, mensaje: "Aviso", fechaHora: "2026-02-28T18:30", canal: "sms",
    }), { code: "VALIDATION_ERROR" });
    assert.throws(() => validatePatchRecordatorio({}), { code: "VALIDATION_ERROR" });
    assert.throws(() => validateRecordatorioId("abc"), { code: "VALIDATION_ERROR" });
    assert.throws(() => validateRecordatorioListQuery({ limit: 101 }), { code: "VALIDATION_ERROR" });
});

test("la consulta usa relaciones de lectura y filtra al propietario antes de paginar", async t => {
    const calls = [];
    t.mock.method(pool, "execute", async (sql, params) => {
        calls.push({ sql, params });
        if (sql.includes("COUNT(*)")) return [[{ total: 1 }]];
        return [[sample]];
    });

    const result = await findAllByUserId(1, {
        leido: false,
        search: "avance",
        sort: "fechaHora",
        order: "asc",
        page: 2,
        limit: 10,
    });

    assert.equal(result.total, 1);
    assert.equal(result.recordatorios[0].leido, false);
    assert.equal(result.recordatorios[0].materiaNombre, "Programación V");
    assert.match(calls[0].sql, /INNER JOIN tarea/);
    assert.match(calls[0].sql, /INNER JOIN materia/);
    assert.match(calls[0].sql, /m\.id_usuario = \?/);
    assert.deepEqual(calls[0].params, [1, 0, "%avance%", "%avance%", "%avance%"]);
    assert.match(calls[1].sql, /ORDER BY r\.fecha_hora ASC/);
    assert.deepEqual(calls[1].params.slice(-2), [10, 10]);
});

test("la creación solo escribe en recordatorio y comprueba que la tarea pertenezca al usuario", async t => {
    let call;
    t.mock.method(pool, "execute", async (sql, params) => {
        call = { sql, params };
        return [{ affectedRows: 0, insertId: 0 }];
    });

    assert.equal(await createRecordatorio(1, {
        tareaId: 12, mensaje: "Aviso", fechaHora: "2026-08-21 18:30:00",
        canal: "email", leido: false,
    }), null);
    assert.match(call.sql, /^\s*INSERT INTO recordatorio/);
    assert.match(call.sql, /INNER JOIN materia/);
    assert.match(call.sql, /m\.id_usuario = \?/);
    assert.deepEqual(call.params, ["Aviso", "2026-08-21 18:30:00", "email", 0, 12, 1]);
    assert.doesNotMatch(call.sql, /\b(?:UPDATE|DELETE)\s+(?:tarea|materia)\b/i);
});

test("la edición solo actualiza columnas de recordatorio y mantiene el filtro de propietario", async t => {
    const calls = [];
    t.mock.method(pool, "execute", async (sql, params) => {
        calls.push({ sql, params });
        return sql.includes("UPDATE recordatorio") ? [{ affectedRows: 0 }] : [[sample]];
    });

    const updated = await updateRecordatorio(4, 1, { mensaje: "Nuevo texto", leido: false });
    assert.equal(updated.id, 4);
    assert.match(calls[0].sql, /^\s*UPDATE recordatorio r/);
    assert.match(calls[0].sql, /owner_subject\.id_usuario = \?/);
    assert.deepEqual(calls[0].params, ["Nuevo texto", 0, 4, 1]);
    assert.match(calls[1].sql, /WHERE r\.id_recordatorio = \?/);
});

test("la eliminación borra exclusivamente el recordatorio propio", async t => {
    let call;
    t.mock.method(pool, "execute", async (sql, params) => {
        call = { sql, params };
        return [{ affectedRows: 1 }];
    });

    assert.equal(await deleteRecordatorio(4, 1), true);
    assert.match(call.sql, /^\s*DELETE FROM recordatorio/);
    assert.match(call.sql, /owner_subject\.id_usuario = \?/);
    assert.deepEqual(call.params, [4, 1]);
    assert.doesNotMatch(call.sql, /\b(?:UPDATE|DELETE)\s+(?:tarea|materia)\b/i);
});
