# Ejercicio académico: de las ventas transaccionales al dashboard con MySQL

**Nivel sugerido:** quinto semestre de un programa de ingeniería o desarrollo de software  
**Modalidad:** laboratorio por equipos de 2–3 estudiantes  
**Duración estimada:** cuatro sesiones de 3 horas (12 horas), ajustables  
**Tecnologías:** MySQL 8.x, SQL, procedimientos almacenados, Event Scheduler, API REST y HTML/CSS/JavaScript.  
**Producto final:** sistema funcional que registra ventas y presenta indicadores en un dashboard, consultando exclusivamente una tabla de resumen.

> **Pregunta orientadora:** ¿cómo separar el registro transaccional de las consultas para reportes sin cambiar de motor de base de datos?

## 1. Situación problema

Un pequeño comercio digital registra diariamente sus ventas. La administración necesita visualizar ingresos, número de ventas, unidades vendidas y valor promedio por venta, sin ejecutar en cada petición del dashboard consultas de agregación sobre las tablas operativas.

El equipo desarrollará una solución que **mantiene MySQL como único motor**, pero separa dos responsabilidades: **registrar transacciones** y **consultar indicadores previamente consolidados**. El uso de MongoDB o de otra tecnología NoSQL **no forma parte de este ejercicio**.

## 2. Resultado de aprendizaje esperado

**Diseña e implementa una solución de consulta analítica sobre datos transaccionales, mediante procedimientos almacenados, actualización programada, servicios REST y visualización web, justificando las decisiones de arquitectura y verificando la integridad de los indicadores.**

Al finalizar, el estudiante podrá:

1. Modelar datos de ventas con relaciones e integridad referencial.
2. Diferenciar tablas operativas de tablas de resumen, aunque ambas estén en MySQL.
3. Crear un procedimiento almacenado que consolide indicadores correctos.
4. Automatizar la actualización de los resúmenes cada cinco minutos con el programador de eventos de MySQL.
5. Exponer datos consolidados mediante endpoints REST de solo lectura.
6. Construir un dashboard que muestre indicadores y la fecha de su última actualización.
7. Probar el efecto de nuevas ventas, anulaciones y modificaciones de registros sobre la información presentada.

## 3. Arquitectura del ejercicio

```text
USUARIO / PRUEBAS DE VENTA
           |
           v
   MySQL - Datos operativos
   clientes / productos
   ventas / detalle_venta
           |
           v
  Procedimiento almacenado
  sp_actualizar_resumen_ventas
           ^
           |
  Event Scheduler (cada 5 min)
           |
           v
 MySQL - resumen_ventas_diarias
           |
           v
    API REST (solo SELECT)
  GET /api/indicadores
  GET /api/ventas-diarias
           |
           v
     DASHBOARD WEB
  KPIs + gráfico + aviso
  de última actualización
```

**Regla central:** ninguna solicitud del dashboard debe ejecutar consultas sobre `ventas` ni sobre `detalle_venta`. Los endpoints del dashboard leen únicamente `resumen_ventas_diarias`.

## 4. Requerimientos funcionales

**RF-01. Datos de operación.** Crear `clientes`, `productos`, `ventas` y `detalle_venta`. Cada venta tendrá fecha, cliente, estado (`CONFIRMADA` o `ANULADA`) y uno o varios detalles con cantidad y precio de venta.

**RF-02. Resumen diario.** Crear `resumen_ventas_diarias` con los campos: `fecha`, `cantidad_ventas`, `unidades_vendidas`, `ingresos`, `ticket_promedio` y `ultima_actualizacion`.

**RF-03. Consolidación.** Construir `sp_actualizar_resumen_ventas()` que calcule los indicadores por día. Solo deben contabilizarse las ventas `CONFIRMADA`. Una venta con varios productos cuenta **una sola vez** en `cantidad_ventas`.

**RF-04. Ejecución automática.** Programar el procedimiento para que se ejecute **cada cinco minutos** mediante el Event Scheduler. Para demostraciones se permite invocarlo manualmente.

**RF-05. Servicios.** Implementar como mínimo:

| Método y ruta | Propósito | Fuente de datos |
|---|---|---|
| `GET /api/indicadores?desde=AAAA-MM-DD&hasta=AAAA-MM-DD` | KPIs agregados de un período | `resumen_ventas_diarias` |
| `GET /api/ventas-diarias?desde=AAAA-MM-DD&hasta=AAAA-MM-DD` | Serie diaria para un gráfico | `resumen_ventas_diarias` |

**RF-06. Dashboard.** Mostrar ingresos totales, número de ventas, unidades vendidas, ticket promedio, gráfico por día y fecha/hora de última consolidación. Incorporar filtro por rango de fechas.

**RF-07. Cambios.** Al registrar una venta, anularla o modificarla, el dashboard debe reflejar el cambio **después de la siguiente actualización** del resumen. No se exige actualización instantánea.

## 5. Requerimientos no funcionales

- **Integridad:** claves primarias, claves foráneas, cantidades positivas y precios no negativos.
- **Corrección:** los resultados del resumen deben coincidir con un cálculo de control hecho sobre las tablas de ventas.
- **Repetibilidad:** ejecutar dos veces el procedimiento, sin cambiar las ventas, no debe duplicar cifras.
- **Seguridad:** utilizar consultas parametrizadas en la API, validar las fechas y no exponer credenciales en el frontend.
- **Separación de responsabilidades:** las rutas del dashboard deben ser de solo lectura y utilizar únicamente datos consolidados.
- **Transparencia:** indicar claramente la antigüedad de los datos; una actualización cada cinco minutos implica posible desfase.

## 6. Desarrollo por sesiones

| Sesión | Actividades del estudiante | Evidencia verificable |
|---|---|---|
| **1. Persistencia (3 h)** | Crear esquema, relaciones y datos de prueba; insertar ventas con varios detalles. | Script SQL, diagrama entidad–relación y consultas de verificación. |
| **2. Procesamiento (3 h)** | Crear resumen y procedimiento; ejecutar consolidación; programar evento; ensayar anulaciones. | Procedimiento funcional, evento y capturas/resultados de pruebas. |
| **3. Servicios (3 h)** | Crear servidor REST; validar rango de fechas; consultar únicamente tabla resumen. | Dos endpoints documentados y respuestas JSON. |
| **4. Visualización (3 h)** | Construir dashboard, enlazar endpoints, probar actualización y sustentar decisiones. | Dashboard funcional, comparación de resultados y exposición. |

## 7. Conjunto de pruebas obligatorio

Crear inicialmente **al menos 30 ventas**, distribuidas en varios días y con múltiples productos en algunas de ellas. Deben existir ventas confirmadas y anuladas. Realizar y registrar estas pruebas:

| Caso | Acción | Resultado esperado |
|---|---|---|
| P1 | Consolidar el conjunto inicial. | Los totales diarios concuerdan con SQL de control. |
| P2 | Ejecutar dos veces seguidas el procedimiento. | No cambian los resultados si no hubo operaciones nuevas. |
| P3 | Registrar una venta confirmada. | Aumentan los indicadores correspondientes al día **solo tras consolidar**. |
| P4 | Anular una venta confirmada. | Se descuentan sus unidades e ingresos tras la siguiente consolidación. |
| P5 | Modificar cantidad o precio de un detalle. | Se recalculan los ingresos del día afectado. |
| P6 | Consultar un período sin ventas. | La API responde sin error y con indicadores en cero. |
| P7 | Enviar fechas inválidas o rango invertido. | La API responde HTTP 400 con un mensaje claro. |
| P8 | Inspeccionar consultas del backend. | Los endpoints del dashboard no leen tablas transaccionales. |
| P9 | Esperar una ejecución automática del evento. | Cambia `ultima_actualizacion` y se refleja cualquier operación nueva. |

**Criterio importante:** una tabla de resumen diario no representa cada compra individual ni sustituye a las tablas originales. Sirve a un conjunto definido de consultas de reporting.

## 8. Entregables

1. **`01_esquema_y_datos.sql`:** tablas, restricciones e inserción de datos de prueba.
2. **`02_procedimiento_y_evento.sql`:** procedimiento almacenado, evento programado y sentencias de inspección.
3. **Código backend:** proyecto ejecutable y archivo de configuración de ejemplo **sin contraseñas reales**.
4. **Código frontend:** dashboard navegable con sus KPIs, gráfico y fecha de actualización.
5. **Informe breve (2–4 páginas):** diagrama, decisiones, resultados de pruebas, explicación del desfase de actualización y conclusión.
6. **Demostración:** registrar/anular una venta, consolidar, consultar la API y observar el cambio en el dashboard.

## 9. Rúbrica de evaluación (100 puntos)

| Criterio | Puntos | Indicadores |
|---|---:|---|
| Modelo de datos e integridad | 20 | Relaciones, estados, precios/cantidades y carga correcta de datos. |
| Procedimiento de consolidación | 25 | Agregados correctos, anulaciones, ventas con varios detalles y repetibilidad. |
| Automatización y trazabilidad | 15 | Evento cada 5 min; `ultima_actualizacion`; prueba de refresco automático. |
| API REST | 20 | Endpoints, validación, consultas solo a resumen y respuestas claras. |
| Dashboard | 15 | Indicadores, gráfico, filtros y visualización de actualización. |
| Documentación y sustentación | 5 | Arquitectura, evidencia de pruebas y argumentación técnica. |
| **Total** | **100** | |

## 10. Preguntas para la sustentación

- ¿Por qué la API consulta el resumen y no suma todas las ventas en cada petición?
- ¿En qué se diferencia un dato transaccional de un indicador consolidado?
- ¿Qué sucede si se anula una venta después de ejecutado el procedimiento?
- ¿Por qué es necesario mostrar `ultima_actualizacion`?
- ¿Qué ventajas y limitaciones tiene recalcular todo el resumen cada cinco minutos?
- ¿Qué cambiaría si el negocio procesara millones de ventas al día?
- ¿En qué situaciones podría convenir incorporar una réplica, un almacén analítico o NoSQL?

## 11. Extensión opcional: actualización incremental

Una vez demostrada la solución básica, el equipo podrá proponer un diseño **incremental** que procese únicamente los días afectados por nuevas ventas, anulaciones o cambios. No basta con filtrar por fecha de modificación: si una venta cambia de fecha, es necesario recalcular también su **día anterior** (por ejemplo, mediante una cola o bitácora de días afectados).

Esta extensión se evalúa como profundización conceptual o bonificación, **no es requisito** de la entrega básica.

---

**Nota docente:** esta práctica demuestra separación lógica de cargas dentro de MySQL. No afirma que MySQL sea un almacén OLAP especializado ni que MongoDB sea inherentemente más rápido. La elección tecnológica debe justificarse mediante requisitos y pruebas.

**Material complementario:** ver `02_Explicacion_detallada_ejercicio_MySQL_dashboard.md` para el procedimiento paso a paso, SQL de referencia, API y frontend de ejemplo.
