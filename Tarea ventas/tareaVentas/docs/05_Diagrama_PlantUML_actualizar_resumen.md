# Diagrama PlantUML del proceso **Actualizar resumen**

El siguiente diagrama de secuencia representa el proceso ejecutado cuando el usuario hace clic en el botón **Actualizar resumen**. Incluye la confirmación, la llamada al endpoint, la ejecución del procedimiento almacenado, la recarga del dashboard y el manejo de errores.

```plantuml
@startuml
title Proceso ejecutado al hacer clic en "Actualizar resumen"

skinparam backgroundColor #FFFFFF
skinparam sequence {
  ArrowColor #34495E
  ActorBorderColor #34495E
  LifeLineBorderColor #95A5A6
  LifeLineBackgroundColor #F8F9F9
  ParticipantBorderColor #009688
  ParticipantBackgroundColor #E8F8F5
  DatabaseBorderColor #E74C3C
  DatabaseBackgroundColor #FDEDEC
  GroupBorderColor #7F8C8D
  GroupBackgroundColor #FAFAFA
}

actor Usuario
participant "Frontend\nventas.js" as Front
participant "API REST\nExpress" as API
participant "resumen.controller" as Controller
participant "resumen.service" as Service
participant "resumen.repository" as Repository
database "MariaDB\nlaboratorio_ventas" as DB
participant "sp_actualizar_\nresumen_ventas" as Procedure

note over Front
El botón está habilitado porque
GET /api/v1/resumen/estado
devolvió pendiente = true.
end note

Usuario -> Front: Clic en "Actualizar resumen"
activate Front
Front -> Usuario: Mostrar ventana de confirmación

alt El usuario cancela
  Usuario --> Front: Cancelar
  Front -> Front: Finalizar sin modificar datos
  Front --> Usuario: Mantener el dashboard actual
else El usuario confirma
  Usuario --> Front: Aceptar
  Front -> Front: Deshabilitar botón
  Front -> Front: Mostrar "Consolidando" y spinner

  Front -> API: POST /api/v1/resumen/actualizar
  activate API
  API -> Controller: refreshSummary(request, response, next)
  activate Controller
  Controller -> Service: refreshSummary()
  activate Service
  Service -> Repository: refreshSummary()
  activate Repository
  Repository -> DB: CALL sp_actualizar_resumen_ventas()
  activate DB
  DB -> Procedure: Ejecutar procedimiento
  activate Procedure

  Procedure -> DB: START TRANSACTION
  Procedure -> DB: DELETE FROM resumen_ventas_diarias
  Procedure -> DB: Consultar ventas y detalle_venta
  note right of Procedure
  Solo incluye ventas con
  estado = 'CONFIRMADA'.

  Agrupa por fecha y calcula:
  - cantidad de ventas
  - unidades vendidas
  - ingresos
  - ticket promedio
  end note
  Procedure -> DB: INSERT INTO resumen_ventas_diarias\nSELECT ... GROUP BY DATE(fecha_venta)

  alt El procedimiento finaliza correctamente
    Procedure -> DB: COMMIT
    Procedure --> DB: Resumen actualizado
    deactivate Procedure
    deactivate DB

    Repository -> DB: SELECT COUNT(*) y MAX(ultima_actualizacion)\nFROM resumen_ventas_diarias
    activate DB
    DB --> Repository: diasConsolidados, ultimaActualizacion
    deactivate DB
    Repository --> Service: Resultado de la actualización
    deactivate Repository
    Service --> Controller: Resultado
    deactivate Service
    Controller --> API: HTTP 200 + JSON
    deactivate Controller
    API --> Front: { success: true, data: {...} }
    deactivate API

    group Recargar información del dashboard
      par Actualizar indicadores
        Front -> API: GET /api/v1/resumen/indicadores?desde=...&hasta=...
        activate API
        API -> DB: Consultar resumen del período
        activate DB
        DB --> API: Ventas, unidades, ingresos y ticket promedio
        deactivate DB
        API --> Front: Indicadores actualizados
        deactivate API
      else Actualizar gráfico diario
        Front -> API: GET /api/v1/resumen/ventas-diarias?desde=...&hasta=...
        activate API
        API -> DB: Consultar resumen diario del período
        activate DB
        DB --> API: Datos agrupados por fecha
        deactivate DB
        API --> Front: Ventas diarias actualizadas
        deactivate API
      end
      Front -> Front: Actualizar tarjetas, gráfico\ny última consolidación
    end

    Front --> Usuario: Mostrar mensaje de actualización exitosa

  else Ocurre un error en el procedimiento
    Procedure -> DB: ROLLBACK
    Procedure --> DB: RESIGNAL del error
    deactivate Procedure
    DB --> Repository: Error de base de datos
    deactivate DB
    Repository --> Service: Propagar error
    deactivate Repository
    Service --> Controller: Propagar error
    deactivate Service
    Controller --> API: Middleware de errores
    deactivate Controller
    API --> Front: Respuesta HTTP de error
    deactivate API
    Front --> Usuario: Mostrar mensaje de error
  end

  group Verificar el estado final de consolidación
    Front -> API: GET /api/v1/resumen/estado
    activate API
    API -> DB: Comparar ventas confirmadas\ncon resumen_ventas_diarias
    activate DB
    DB --> API: pendiente = true o false
    deactivate DB
    API --> Front: Estado de consolidación
    deactivate API

    alt pendiente = false
      Front -> Front: Mantener botón deshabilitado
      Front -> Front: Mostrar "Resumen actualizado"
    else pendiente = true
      Front -> Front: Habilitar nuevamente el botón rojo
      Front -> Front: Mostrar "Actualizar resumen"
    end
  end
end

deactivate Front
@enduml
```

## Resumen del flujo

1. El frontend solicita confirmación al usuario.
2. Si el usuario acepta, envía `POST /api/v1/resumen/actualizar`.
3. El backend ejecuta `CALL sp_actualizar_resumen_ventas()`.
4. El procedimiento reconstruye `resumen_ventas_diarias` usando únicamente ventas confirmadas.
5. Si la operación tiene éxito, el frontend vuelve a consultar los indicadores y las ventas diarias.
6. Finalmente, consulta `GET /api/v1/resumen/estado` para habilitar o deshabilitar el botón según existan cambios pendientes.
