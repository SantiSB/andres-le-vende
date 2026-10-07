# Andrés Le Vende

Demo interactivo del catálogo y la operación de Andrés. Una tarjeta por evento; cantidades y precios mínimos agregados por localidad; inventario de propietarios, reservas y ventas dentro del panel.

## Ejecutar

Requiere Node.js 22 LTS o 24 LTS y pnpm 12.3.4.

```sh
cd /Users/santiago/Dev/andres-le-vende
pnpm install --frozen-lockfile
pnpm dev --hostname 127.0.0.1 --port 3002
```

- Catálogo: http://127.0.0.1:3002
- Resumen: http://127.0.0.1:3002/admin
- Eventos: http://127.0.0.1:3002/admin/eventos
- Inventario: `/admin/eventos/[id]`
- Reservas e historial: `/admin/reservas`
- Configuración: `/admin/configuracion`

Usa siempre el mismo host y puerto para conservar el mismo espacio de almacenamiento. `localhost` y `127.0.0.1` tienen datos independientes.

## Probar con Andrés

1. Revisa el catálogo: EDC tiene inventario de distintos propietarios en la misma localidad.
2. Entra a **Panel de Andrés → Eventos e inventario → EDC Colombia**.
3. Reserva las dos unidades disponibles de María. General pasa de cuatro unidades desde $450.000 a dos desde $480.000.
4. Cancela esa reserva: regresan las unidades y el precio menor. También puedes completar una venta desde Reservas y verla en Historial.
5. Crea un evento, agrega localidades y registra un lote. Cambia el costo/recargo para ver el precio sugerido, o sobrescribe el precio público.
6. Configura el WhatsApp de Andrés y, si quieres probarlo, el de un propietario. El número incluye código de país y no lleva espacios. Los ejemplos dejan teléfonos vacíos para no enlazar personas reales.
7. Recarga: los datos permanecen. En **Configuración → Restablecer demo** puedes recuperar los ejemplos, previa confirmación.

Los enlaces de WhatsApp preparan mensajes; no los envían y no alteran inventario.

## Tecnología y arquitectura

Next.js App Router, React, TypeScript estricto y Tailwind CSS 4, con estilos compartidos y afiches generados mediante CSS. No se descargan fuentes ni imágenes externas. React Hook Form + Zod validan formularios; Zustand conserva el estado ya hidratado; Lucide aporta iconos. Vitest verifica el dominio y Playwright verifica los flujos de navegador.

El logo entregado por Andrés está en `public/andres-logo.jpg`. Su paleta roja, naranja y azul oscuro se aplica al catálogo y al panel desde `src/app/brand-theme.css`. La imagen original se conserva sin alterar; el recorte visible en las cabeceras se hace mediante CSS.

Las versiones están fijadas y se incluye `pnpm-lock.yaml`. TypeScript 5.9 y ESLint 9 se mantienen por compatibilidad con los plugins actuales de Next.js; la versión 10 de ESLint falla en `eslint-plugin-react`. Actualizar esa combinación conjuntamente cuando sea compatible. El paquete nativo `unrs-resolver` tiene su script de instalación permitido explícitamente en `pnpm-workspace.yaml`.

| Área                                  | Responsabilidad                                                       |
| ------------------------------------- | --------------------------------------------------------------------- |
| `src/domain/model.ts`                 | Entidades, esquemas Zod y comandos tipados                            |
| `src/domain/logic.ts`                 | Cantidades, precios, catálogo público, transiciones e integridad      |
| `src/domain/seed.ts`                  | Eventos y personas ficticias; fechas del siguiente año al inicializar |
| `src/domain/format.ts`, `whatsapp.ts` | Pesos colombianos, fechas y enlaces de WhatsApp                       |
| `src/data/repository.ts`              | Contrato asíncrono de acceso a datos y adaptador local                |
| `src/state/store.ts`                  | Hidratación, comandos, errores y estado de guardado                   |
| `src/components/`                     | Catálogo, panel, formularios y elementos compartidos                  |
| `src/app/`                            | Rutas, layouts y diseño responsive                                    |
| `src/domain/logic.test.ts`, `e2e/`    | Pruebas de negocio y flujos completos                                 |

Los componentes no acceden a `localStorage`. El repositorio lee los datos actuales antes de cada comando, ejecuta reglas puras y guarda únicamente un resultado válido. Las operaciones de almacenamiento son síncronas dentro del adaptador local; el contrato público es asíncrono para facilitar el cambio de implementación.

Se guarda un sobre `{ version: 1, data }` bajo la clave `andres-le-vende:v1`. Se comprueban esquema, relaciones e inventario al leer. Ante datos corruptos o una versión no compatible, se muestra recuperación explícita sin sobrescribirlos silenciosamente. Si el navegador impide guardar o se llena, la acción falla y no se anuncia un guardado exitoso. Las pestañas del mismo origen reciben cambios mediante el evento `storage`.

La hidratación ocurre después del primer render; servidor y cliente parten del mismo estado de carga. El render inicial de Next.js no ejecuta operaciones de negocio. La ruta dinámica del evento renderiza la estructura de la página; no hay API propia ni backend de datos.

## Reglas de inventario

- Disponible = total del lote − reservas activas − reservas completadas.
- Reservar requiere evento y lote activos, cantidad entera positiva y disponibilidad suficiente.
- Completar convierte reserva en venta sin volver a descontar unidades; cancelar libera unidades. Ambas acciones requieren confirmación.
- Una operación completada o cancelada no se puede procesar otra vez.
- Las reservas no vencen automáticamente.
- El catálogo incluye únicamente eventos activos con inventario activo disponible y localidades con unidades disponibles.
- “Desde” es el menor precio de lotes disponibles. Un lote inactivo o agotado no influye en precio ni cantidad.
- Al completar una reserva, el precio publicado queda como valor inicial; Andrés puede registrar el precio final acordado por unidad. La utilidad de ventas se calcula con ese precio final y el costo guardado al reservar.
- Precio sugerido = costo unitario × (1 + recargo / 100), redondeado al peso. El precio público se puede editar manualmente.
- Las reservas copian costo y precio unitarios para conservar el historial aunque después cambie el lote. La utilidad de ventas es una proyección basada en esos valores, no contabilidad ni conciliación de pagos negociados por WhatsApp.
- No se puede reducir el total por debajo de unidades comprometidas ni reasignar evento, localidad o propietario de un lote con historial.
- Los registros con cualquier reserva, incluso cancelada, no se eliminan. Desactivar conserva el historial. Los registros sin historial se pueden eliminar con confirmación; eliminar un evento/localidad elimina sus hijos sin historial.
- El orden de las localidades se edita con un número en su formulario; no requiere arrastrar y soltar.

## Verificación

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Playwright usa Google Chrome instalado y ejecuta los mismos recorridos en escritorio (1440×1000) y móvil (390×844). Inicia el servidor del puerto 3002 si hace falta. Las pruebas interceptan los enlaces externos: comprueban destino y mensaje sin contactar a nadie. Los contextos de prueba son independientes y no modifican los datos de tu navegador habitual.

Para probar el resultado compilado:

```sh
pnpm build
pnpm start --hostname 127.0.0.1 --port 3002
```

Detén antes el servidor de desarrollo si utiliza ese puerto.

## Limitaciones deliberadas

- Demo local de un único administrador, sin autenticación ni control real de acceso. La privacidad de la interfaz es visual: los datos internos existen en el navegador y el panel está abierto. No utilizar datos sensibles reales ni publicar esto como sistema operativo de producción.
- No hay base de datos central: otros dispositivos no ven los cambios. La sincronización entre pestañas no ofrece transacciones entre usuarios ni garantía de evitar sobreventa concurrente en producción.
- Borrar los datos del navegador elimina el inventario del demo. No hay copia de seguridad remota.
- No hay login de compradores/vendedores, pagos, comprobantes, escrow, transferencia de boletas ni automatización del envío de mensajes.
- Las imágenes son opcionales y locales. Para una imagen personalizada, coloca el archivo dentro de `public` y escribe su ruta, por ejemplo `/evento.svg`. Los afiches por defecto son diseños CSS de muestra, no piezas oficiales.
- Todos los nombres, lugares, fechas, precios e inventario inicial son ilustrativos; no confirman eventos reales ni entradas auténticas.

## Migración futura a producción

Recomendación: Supabase con PostgreSQL, Auth para Andrés y Storage para imágenes. La conexión de Auth está preparada localmente; el inventario del demo aún usa `localStorage`.

El [modelo de datos de producción](docs/production-data-model.md) y la
[migración SQL inicial](supabase/migrations/20261002000000_initial_schema.sql)
ya están preparados como módulo 3. La migración se aplicó manualmente el 7 de octubre de 2026 al proyecto único de Supabase `andres-le-vende-dev` (`wqmesuafuoozzhnxpilu`); el sufijo `-dev` es solo el nombre actual, no otro entorno. Se verificaron las seis tablas con RLS activo. Antes de usar `supabase db push`, habrá que registrar esta migración inicial como ya aplicada en el historial de migraciones del proyecto para evitar ejecutarla dos veces.

El módulo 4 preparó el login con Supabase Auth en `/ingresar`, la activación de invitaciones en `/auth/complete`, la creación de contraseña en `/establecer-clave` y una comprobación de administrador en el servidor para todas las rutas `/admin`. La comprobación consulta la fila de `settings`, que RLS solo deja leer al identificador incluido en `admin_users`. No se confía únicamente en una cookie ni en ocultar la interfaz. Sin variables de Supabase, el panel conserva el demo local solo en desarrollo; un despliegue sin Auth configurado no permite entrar a `/admin`.

Para desarrollo, copia `.env.example` a `.env.local` y completa la URL y la clave **publicable** del proyecto; no uses una clave secreta ni de servicio en el navegador. El proyecto local ya tiene estos valores en un archivo ignorado por Git. En Vercel, esas dos variables se configuraron únicamente para Production. El Site URL de Supabase apunta a `https://andres-le-vende.vercel.app/auth/complete` para recibir invitaciones estándar; la ruta debe estar desplegada antes de enviar una invitación. Sigue pendiente invitar al administrador temporal y registrar su ID en `admin_users`.

1. Crear tablas de eventos, localidades, lotes y reservas con claves foráneas, restricciones e índices. Conservar snapshots monetarios en reservas.
2. Separar la lectura pública del acceso administrativo. Exponer al catálogo una vista/consulta que contenga solo campos públicos y agregados, nunca nombres, teléfonos, costos ni notas. El contrato actual carga el estado entero para el demo; producción debe dividir esa lectura y sus suscripciones.
3. Proteger el panel con Supabase Auth y aplicar Row Level Security basada en el identificador del único administrador. Ocultar la ruta por sí solo no protege los datos. No exponer claves de servicio en el cliente.
4. Implementar un adaptador de repositorio que ejecute comandos contra Supabase. Los formularios, componentes y selectores pueden conservarse; reemplazar inicialización y lectura del catálogo público por su consulta específica.
5. Ejecutar reservas en una función SQL transaccional: bloquear el lote, recalcular disponibilidad y crear la reserva en una misma transacción. Usar transiciones condicionales e idempotencia para completar/cancelar. Las validaciones del cliente son ayuda de UX, no la autoridad de inventario.
6. Configurar permisos de Storage para que Andrés gestione imágenes y el catálogo pueda leer solamente imágenes públicas.
7. Añadir recuperación y backups, límites de entrada, observabilidad y pruebas de concurrencia antes de recibir clientes reales.

La lógica pura y sus pruebas especifican el comportamiento esperado del futuro backend; migrar requerirá implementar y validar esas mismas garantías en PostgreSQL.
