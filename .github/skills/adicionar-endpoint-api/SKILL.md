---
name: adicionar-endpoint-api
description: "Implementa endpoints de consulta en una API existente a partir de un diagrama entidad-relación (DER) y una descripción de la información requerida. Modifica el backend respetando su arquitectura, acceso por usuario y convenciones; no se limita a generar una guía de implementación."
---

# Adicionar un endpoint a un API existente

## Resultado esperado

Implementa el endpoint solicitado mediante cambios concretos en el backend y verifica su comportamiento. Usa el DER para comprender los datos y el código existente para decidir cómo integrarlos. Entrega un resumen en el chat con la ruta, los parámetros, los archivos modificados y las verificaciones realizadas.

## Entradas

- **DER:** imagen adjunta o ruta a una imagen, SQL de definición de tablas, DBML u otra representación legible del esquema.
- **Información requerida:** descripción en lenguaje natural de los datos que debe devolver el endpoint y sus filtros.
- **Backend:** ubicación del proyecto cuando no sea inequívoca a partir del contexto.
- **Opcionalmente:** ruta HTTP, campos de respuesta, orden, paginación y comportamiento ante recursos inexistentes.

Aprovecha los datos ya proporcionados en la conversación. Si falta el DER, no puede leerse una relación necesaria o hay varias copias del backend sin una selección clara, solicita únicamente la aclaración que impide continuar esa parte. Avanza mientras tanto en la inspección independiente. Resuelve decisiones rutinarias usando las convenciones verificadas del proyecto.

## 1. Identificar el Backend y sus convenciones

Lee las instrucciones aplicables del repositorio y verifica los cambios locales antes de editar. Trabaja en la copia del backend indicada; no mezcles archivos de proyectos con nombres similares.

Busca un endpoint de consulta comparable y sigue su recorrido completo: montaje del router, ruta, controlador, validación, servicio, acceso a datos y respuesta. Identifica también autenticación, contexto de usuario, manejo de errores y comandos de comprobación.

Cuando estén disponibles para el proyecto, prioriza las herramientas del grafo de código: `search_graph`, `trace_path`, `get_code_snippet`, `query_graph` y `get_architecture`. Si el proyecto no está indexado o los resultados son insuficientes, usa búsquedas locales enfocadas. No indexes ni modifiques la configuración del proyecto solo para realizar esta consulta.

Adapta la implementación a las capas existentes. No presupongas Express, MySQL, un ORM específico ni que siempre habrá cuatro archivos que modificar. Conserva los nombres reales de archivos, el sistema de módulos y las firmas que deban mantenerse compatibles.

## 2. Interpretar el DER y contrastarlo

Abre visualmente el DER cuando sea una imagen. Identifica las tablas implicadas, claves primarias y foráneas, cardinalidades y campos necesarios. No deduzcas columnas, valores de enumerados ni restricciones que no se puedan leer o confirmar.

Contrasta la parte relevante del DER con migraciones, DDL, modelos o consultas existentes. Si ya hay acceso autorizado al esquema de una base de desarrollo, puede usarse una inspección de solo lectura para resolver dudas. No solicites ni muestres credenciales.

El DER puede estar desactualizado. Si difiere del esquema que usa el backend, determina qué versión representa la implementación actual. Explica las discrepancias que afecten el endpoint; si no se pueden resolver con evidencia, pregunta antes de codificar la parte afectada. No cambies el esquema de la base de datos para hacer coincidir un dibujo sin que sea parte del encargo.

El DER aporta relaciones de datos, pero no define por sí solo la autorización, la ruta HTTP o el contrato de respuesta.

## 3. Definir el contrato de consulta

Deriva y comunica brevemente el método, la ruta, los parámetros, los campos de salida y las condiciones de acceso. Continúa con la implementación cuando el encargo y las convenciones existentes sean suficientes; no conviertas este resumen en un paso obligatorio de aprobación.

- Usa `GET` para consultas sin efectos sobre los datos, salvo que la API tenga una convención justificada distinta.
- Obtén el usuario o tenant del mecanismo confiable existente. No sustituyas la identidad autenticada por un `id_usuario` recibido del cliente. Si existe una consulta administrativa para otro usuario, aplica sus permisos.
- Reutiliza las validaciones y el formato de respuesta existentes.
- Distingue colección vacía, recurso padre inexistente y acceso no permitido conforme al contrato del proyecto. No impongas universalmente HTTP 200 o 404 basándote en los ejemplos de StudentFlow.
- Conserva el comportamiento de paginación existente cuando corresponda. Si el usuario requiere todos los resultados, no introduzcas un límite que los recorte silenciosamente.
- Si la información solicitada admite interpretaciones materialmente distintas —por ejemplo, qué significa «eventos próximos»—, busca reglas existentes o pide una aclaración concreta.

## 4. Implementar el acceso a los datos

Usa la conexión, transacciones y herramientas de persistencia ya presentes. En SQL, selecciona explícitamente los campos necesarios y parametriza los valores. Conserva los alias y convenciones del contrato existente; usa camelCase si esa es la convención de la API. Con un ORM, expresa esas mismas restricciones usando sus mecanismos establecidos.

Incluye la condición de propiedad o autorización en la consulta o en una capa existente que la garantice. Si la tabla hija no tiene usuario, recorre la relación con el recurso propietario. Un ID válido no prueba que el solicitante tenga acceso.

Respeta las cardinalidades: evita duplicar registros de la entidad solicitada por un `JOIN` con varias filas relacionadas. Usa las uniones, agrupaciones o condiciones de existencia que correspondan al resultado pedido. No ocultes un `JOIN` incorrecto agregando `DISTINCT` sin analizarlo.

Devuelve un arreglo para una colección y el formato habitual del proyecto para un recurso individual. Reutiliza mapeadores solo cuando correspondan a la entidad consultada. Los campos de orden dinámicos deben pasar por una lista permitida; no interpoles directamente desde la solicitud.

## 5. Conectar el endpoint

Agrega o modifica las funciones necesarias en las capas que realmente existan. En una API con rutas, controladores, servicios y repositorios:

- **Repositorio:** consulta, filtro de propiedad y transformación de resultados.
- **Servicio:** reglas de negocio y composición de llamadas necesarias.
- **Controlador:** lectura y validación de parámetros, llamada al servicio y respuesta.
- **Router:** registro de la ruta e importación del controlador.

Reutiliza los validadores, helpers de respuesta y middlewares existentes. Modifica el montaje del router únicamente si la nueva ruta lo requiere. Conserva las importaciones y rutas actuales; revisa conflictos entre rutas y evita registrar un endpoint duplicado si ya existe.

Mantén los cambios centrados en el encargo. No reemplaces un middleware temporal de usuario por un sistema de autenticación nuevo como efecto secundario. Si el proyecto usa un usuario fijo, indícalo como limitación observable.

## 6. Verificar y entregar

Ejecuta las comprobaciones disponibles que sean pertinentes al cambio. Comprueba sintaxis, importaciones y registro de la ruta; usa las pruebas del proyecto para verificar comportamiento cuando existan. Agrega pruebas enfocadas si son necesarias para demostrar el filtrado, la autorización o una regla nueva.

Según el contrato, cubre al menos los casos aplicables: resultados correctos, colección vacía, identificador inválido, recurso inexistente y datos de otro usuario. Verifica también los nombres de campos y que el `JOIN` no añada filas duplicadas. Usa datos de prueba aislados y no ejecutes migraciones, borrados o escrituras sobre una base compartida para probar un endpoint de lectura.

Si no hay base de datos o entorno ejecutable disponible, completa las comprobaciones independientes, explica exactamente qué falta y no afirmes haber probado la integración. Distingue entre pruebas con dobles y consultas reales.

Revisa el diff final y confirma que no se alteró trabajo ajeno. La respuesta final debe incluir:

- Endpoint implementado y ejemplo de petición adaptado al proyecto.
- Archivos y funciones principales modificados.
- Resultado de las comprobaciones y limitaciones pendientes.

La implementación termina en cambios locales verificados. La skill no implica publicar, desplegar ni modificar datos de producción.
