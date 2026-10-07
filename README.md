# Andrés Le Vende

Catálogo público de boletas y panel privado para un único administrador. Cada evento aparece una vez; sus localidades muestran disponibilidad exacta y precio «desde». Los compradores consultan por WhatsApp. Andrés registra lotes de terceros, crea reservas manuales y las cancela o completa después de comprobar la transferencia.

## Estado

La aplicación usa un único proyecto Supabase para los datos y Supabase Auth para el panel. El catálogo lee la vista pública `public_catalog`; no hay inventario ficticio ni persistencia en `localStorage`. La base comienza sin eventos: el administrador debe cargar datos auténticos y configurar su número de WhatsApp. No se envían mensajes automáticamente ni se procesan pagos.

## Desarrollo

Requiere Node.js 22 o 24 y pnpm 12.3.4.

1. Copia `.env.example` a `.env.local` y completa la URL y clave **publicable** de Supabase. Nunca pongas una clave de servicio en `NEXT_PUBLIC_*`.
2. Aplica las migraciones de `supabase/migrations/` en orden en una base nueva. En el proyecto `andres-le-vende-dev` las tres ya fueron aplicadas manualmente.
3. Crea/invita el usuario de Auth y registra su UUID como única fila en `public.admin_users`. Desactiva el registro libre. El administrador establece su contraseña desde el correo; no necesita usar el dashboard de Supabase.
4. Ejecuta `pnpm install --frozen-lockfile` y `pnpm dev --hostname 127.0.0.1 --port 3002`.

Rutas: `/` catálogo, `/ingresar` acceso, `/admin` resumen, `/admin/eventos` eventos y lotes, `/admin/reservas` reservas e historial, `/admin/configuracion` marca, teléfono y plantillas de WhatsApp.

## Operación

1. En Configuración, introduce el número de WhatsApp de Andrés con código de país, sin espacios. Sin número los botones públicos avisan que el contacto aún no está disponible.
2. Crea un evento, luego sus localidades y después los lotes de cada propietario. El precio público puede usar el cálculo sugerido por recargo o un valor manual. Los afiches se generan con CSS si no hay imagen.
3. Cuando un comprador confirme por WhatsApp, reserva las unidades del lote elegido. El enlace para el propietario prepara otro mensaje, pero no lo envía. Tras comprobar la transferencia, completa la venta con el precio negociado; si no se concreta, cancela y libera las unidades.

Una consulta por WhatsApp no aparta boletas. Las reservas no vencen solas.

## Reglas y seguridad

- Disponible = cantidad total − reservas activas − ventas completadas.
- La vista pública solo expone evento, localidad, cantidad disponible, precio mínimo, marca y contacto/plantilla del comprador. No expone propietario, teléfono del vendedor, costo, margen, notas ni reservas.
- RLS permite leer y modificar datos privados únicamente al UUID incluido en `admin_users`. La ruta `/admin` también verifica sesión y acceso en servidor.
- Un trigger bloquea el lote al reservar, verifica disponibilidad y copia costo y precio a la reserva. Impide reducir cantidad comprometida o alterar la identidad de un lote con historial. La transición de una reserva solo puede ser `reserved → completed/cancelled`.
- Los registros con reservas históricas no se eliminan; se desactivan. Los eliminables requieren confirmación en el panel.

La utilidad mostrada es una proyección con costo y precio final, no contabilidad ni prueba de pago. No hay cuentas de compradores/vendedores, pagos, escrow, comprobantes ni transferencia automática de boletas.

## Verificación y despliegue

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm exec next build --webpack
pnpm test:e2e
```

Las pruebas unitarias usan fixtures aislados; nunca cargan esas boletas en la aplicación. La prueba E2E pública lee el proyecto Supabase configurado sin modificarlo. Para publicar en Vercel, configura las dos variables de `.env.example` en Production y despliega `main` después de aplicar migraciones. El proyecto actual usa `https://andres-le-vende.vercel.app/`.

Las migraciones se aplicaron inicialmente en SQL Editor, fuera del historial de Supabase CLI. Antes de ejecutar `supabase db push`, marca esas versiones como aplicadas; no vuelvas a ejecutar el esquema inicial sobre esta base. Detalles de entidades y pruebas: [modelo de datos](docs/production-data-model.md).

Antes de atender ventas reales, comprueba el número de WhatsApp, carga y revisa inventario auténtico, realiza una venta de extremo a extremo con Andrés y define un plan de copias de seguridad/restauración de Supabase.
