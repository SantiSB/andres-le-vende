# Modelo de datos de producción — módulo 3

Este diseño traduce el demo a PostgreSQL/Supabase. La migración inicial está en
[`supabase/migrations/20261002000000_initial_schema.sql`](../supabase/migrations/20261002000000_initial_schema.sql).
Es un artefacto para revisar y aplicar cuando exista un proyecto de Supabase;
el demo sigue usando `localStorage` y no necesita cuentas ni variables externas.

## Qué representa cada registro

| Entidad        | Significado                                                       | Datos internos relevantes                                                                              |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `events`       | Una tarjeta del catálogo por evento                               | Nombre, fechas, ciudad, lugar, imagen, activo                                                          |
| `localities`   | Una opción dentro de ese evento                                   | Nombre y orden; única por evento sin distinguir mayúsculas                                             |
| `lots`         | Boletas de un propietario con igual localidad, costo y precio     | Propietario, teléfono, cantidad total, costo unitario, recargo sugerido, precio público, notas, activo |
| `reservations` | Un apartado manual hecho por Andrés, luego completado o cancelado | Lote, cantidad, nota opcional, estado, costo y precios unitarios copiados                              |
| `settings`     | Configuración única de la marca                                   | WhatsApp, recargo por defecto y plantillas                                                             |
| `admin_users`  | La única cuenta autorizada a operar el panel                      | ID de usuario de Supabase Auth                                                                         |

El propietario se guarda en el lote. No hay portal ni cuenta de vendedor. Un
comprador no crea reservas al pulsar WhatsApp: Andrés lo hace cuando corresponde.
El campo `note` puede contener datos del trato, pero no exige nombre ni teléfono
del comprador. `admin_users` y `settings` tienen una sola fila por diseño.

## Relaciones y reglas

```text
events 1 ── N localities 1 ── N lots 1 ── N reservations
                        (event_id + locality_id válidos juntos)
auth.users 1 ── 0..1 admin_users
```

- `lots.quantity` es el total registrado. Disponible = total − cantidades con
  reserva `reserved` − cantidades con reserva `completed`. Una cancelación libera
  unidades; completar no las descuenta por segunda vez.
- El catálogo muestra solo eventos activos y lotes activos con disponible > 0.
  Para cada localidad suma disponible y muestra el menor `unit_price` entre sus
  lotes disponibles. La tarjeta del evento suma localidades y muestra el menor
  precio de ellas. Es la misma regla de `src/domain/logic.ts`.
- Al reservar se copian `unit_cost`, `listed_unit_price` y `unit_price`. El
  último puede cambiarse al precio final negociado al completar. La utilidad
  estimada de una venta es `(unit_price − unit_cost) × quantity`.
- Fechas, cantidades, precios, recargos, teléfonos y longitud de textos tienen
  restricciones en SQL, además de la validación actual de formularios.
- Borrar un evento borra localidades y lotes sin historial; cualquier reserva
  asociada, incluso cancelada, bloquea el borrado por clave foránea. Con
  historial se desactiva el evento/lote en lugar de eliminarlo.
- El historial de reservas no depende del precio o costo actual del lote. La
  futura operación de editar lote deberá impedir reducir el total por debajo de
  unidades comprometidas y cambiar evento, localidad o propietario con
  historial, como ya hace el demo.
- No hay vencimiento automático de reservas. El botón de WhatsApp no cambia
  inventario, ni hay pagos o transferencias dentro del sistema.

## Límite entre público y privado

`anon` no tiene acceso a ninguna tabla. El catálogo de producción necesitará
una ruta de Next.js ejecutada en el servidor que lea la base de datos, aplique
la agregación anterior y devuelva **solo** ID/nombre/fecha/ciudad/lugar/imagen
del evento e ID/nombre/cantidad/precio desde cada localidad. No devolverá
filas de lotes, nombres y teléfonos de propietarios, costos, recargos, notas,
reservas ni plantillas. La clave `service_role`, si se usa para esa lectura,
permanecerá únicamente en el servidor. Esa ruta y la separación del contrato
actual `Repository.load()` pertenecen al módulo 6.

`authenticated` puede leer y gestionar filas únicamente si su ID figura en
`admin_users`. La función de comprobación vive en `app_private`, un esquema que
**no debe añadirse** a los esquemas expuestos por la API. La ruta `/admin`
también necesitará protección de sesión en el módulo 4; ocultar la ruta por sí
solo no protege los datos. No se habilita el registro abierto como vía para
crear administradores. Tras crear la cuenta de Andrés, se agregará su ID a la
única fila de `admin_users` mediante un proceso privilegiado.

La migración deja intencionalmente las reservas sin permisos de escritura y los
lotes sin permiso de edición directa. En el módulo 5 se añadirán funciones SQL
transaccionales para reservar, completar, cancelar y editar lotes: bloquearán
el lote, comprobarán disponibilidad y transición de estado, y harán el cambio
en una sola transacción. Las reglas del cliente no son la autoridad final.

## Plan de aplicación y traslado de datos

1. Crear un proyecto Supabase de prueba y aplicar la migración en una base
   vacía. Verificar que ninguna tabla sea legible con la clave pública, que un
   usuario autenticado cualquiera no lea filas y que Andrés sí pueda hacerlo
   después de aprovisionar `admin_users`.
2. Implementar las operaciones atómicas del módulo 5 y probar reservas
   simultáneas sobre la última unidad. Después habilitar el panel con el
   adaptador remoto y la ruta pública del módulo 6.
3. Si Andrés quiere conservar datos del demo, exportarlos explícitamente del
   navegador. Sus IDs actuales son cadenas (`edc`, `maria`); al importar habrá
   que asignar UUIDs nuevos y mantener una tabla temporal de correspondencia
   para los vínculos. No se importan automáticamente los ejemplos ficticios.
4. Antes de inventario real: decidir copias de seguridad, probar restauración
   y revisar permisos en el proyecto final. Las imágenes locales actuales son
   rutas del frontend; subir afiches editables requerirá Storage después.

La migración todavía no se ha ejecutado: aquí no hay proyecto Supabase ni
PostgreSQL local configurado. El siguiente paso técnico es el módulo 4, y el
acceso de escritura al inventario queda condicionado al módulo 5.

Referencias de implementación: [migraciones de Supabase](https://supabase.com/docs/guides/local-development/database-migrations),
[permisos de Data API](https://supabase.com/docs/guides/api/securing-your-api) y
[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
