# Modelo de datos y controles de inventario

## Entidades

| Tabla          | Representa                                                                 | Visibilidad                                       |
| -------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| `events`       | Una tarjeta por evento, con fechas, ciudad, lugar y estado                 | Panel; campos seleccionados en la vista pública   |
| `localities`   | Localidades ordenadas dentro de un evento                                  | Panel; nombre y orden en vista pública            |
| `lots`         | Un conjunto de boletas del mismo propietario, localidad, costo y precio    | Solo panel                                        |
| `reservations` | Apartado manual y transición a venta/cancelación, con snapshots monetarios | Solo panel                                        |
| `settings`     | Marca, número de Andrés, recargo y plantillas de WhatsApp                  | Panel; subconjunto del comprador en vista pública |
| `admin_users`  | UUID del único administrador autorizado                                    | Privado                                           |

La relación principal es `events → localities → lots → reservations`. El comprador no crea reservas desde la página pública; Andrés las registra cuando corresponde. `note` puede contener la referencia del trato sin exigir datos personales del comprador.

## Lectura pública

La vista `public.public_catalog` agrupa los lotes activos y disponibles por evento/localidad. Suma cantidades y muestra el precio más bajo entre lotes con disponibilidad. Solo concede `SELECT` a `anon`/`authenticated` sobre esa vista; `anon` no puede leer tablas privadas. La consulta usa la clave publicable en el servidor Next.js, sin clave de servicio. Si la base no tiene boletas, el catálogo muestra un estado vacío y no inventa publicaciones.

## Escrituras y reservas

RLS autoriza al usuario cuyo UUID está en `admin_users`. Los privilegios de escritura son por columna para que el navegador no establezca IDs, marcas de tiempo ni snapshots de reservas. El trigger de inserción toma `FOR UPDATE` sobre el lote, calcula unidades comprometidas y rechaza la sobreventa dentro de la transacción. Completar conserva las unidades descontadas; cancelar las libera. Ninguna transición posterior es válida. Un trigger adicional evita reducir la cantidad de un lote bajo lo comprometido y cambiar evento, localidad o propietario si existe cualquier reserva histórica.

El valor `unit_price` de la reserva arranca en el publicado y puede actualizarse al precio final al completarla. `listed_unit_price` y `unit_cost` quedan como historial; la utilidad estimada es `(unit_price − unit_cost) × quantity`.

## Migraciones y comprobaciones

1. [`20261002000000_initial_schema.sql`](../supabase/migrations/20261002000000_initial_schema.sql): tablas, restricciones, índices y RLS.
2. [`20261007000000_public_catalog.sql`](../supabase/migrations/20261007000000_public_catalog.sql): proyección pública.
3. [`20261007010000_admin_inventory_guards.sql`](../supabase/migrations/20261007010000_admin_inventory_guards.sql): privilegios de escritura y triggers.

Las tres se aplicaron manualmente al proyecto `andres-le-vende-dev`. Se comprobó que la base tenía un administrador y ningún evento/lote/reserva antes de la conexión del frontend. En una transacción revertida se probaron dos propietarios con precios distintos, cambio del precio mínimo al agotar el lote barato, rechazo de sobreventa, rechazo de reducción de cantidad comprometida y liberación tras cancelar. Después del `ROLLBACK` los recuentos volvieron a cero. También se verificó que `anon` puede seleccionar la vista y no los lotes; `authenticated` solo tiene inserción de columnas permitidas en `reservations`, no privilegio de inserción de tabla completa.

Pendiente antes de una operación comercial sostenida: prueba concurrente desde dos sesiones autenticadas independientes, prueba de restauración de copia de seguridad y configuración del WhatsApp definitivo de Andrés. El esquema no automatiza pagos, comprobantes, escrow, contacto con vendedores ni caducidad de reservas.
