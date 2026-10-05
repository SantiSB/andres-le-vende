import { test, expect, type Page } from "@playwright/test";

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
test("catálogo, búsqueda y aviso de WhatsApp sin configurar", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".event-card")).toHaveCount(3);
  await expect(page.locator(".event-card").first()).toContainText(
    "4 disponibles · desde",
  );
  await expect(page.locator("main")).not.toContainText("María");
  await noOverflow(page);
  await page.getByLabel("Buscar eventos").fill("medellin");
  await expect(page.locator(".event-card")).toHaveCount(1);
  await expect(page.locator(".event-card")).toContainText("Luna Eléctrica");
  await page.getByLabel("Buscar eventos").fill("no-existe");
  await expect(page.getByText("No encontramos ese plan")).toBeVisible();
  await page.getByRole("button", { name: "Ver todos los eventos" }).click();
  await expect(page.locator(".event-card")).toHaveCount(3);
  await page
    .getByLabel("Consultar EDC Colombia, General · 2 días por WhatsApp")
    .click();
  await expect(page.locator(".toast[role=alert]")).toContainText(
    "Configura el WhatsApp",
  );
  expect(errors).toEqual([]);
});

test("crear evento, localidad, inventario, reservar, cancelar, vender y persistir", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/admin/eventos");
  await page.getByRole("button", { name: "Nuevo evento", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre del evento").fill("Festival de prueba");
  await dialog.getByLabel("Fecha de inicio").fill("2028-06-12");
  await dialog.getByLabel("Lugar", { exact: true }).fill("Teatro Demo");
  await dialog
    .getByRole("button", { name: "Crear evento", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("link", { name: "Ver inventario de Festival de prueba" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Festival de prueba", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Agregar localidad", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre de la localidad").fill("General");
  await dialog
    .getByRole("button", { name: "Crear localidad", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: "Agregar inventario", exact: true })
    .first()
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Propietario", { exact: true })
    .fill("Propietario de prueba");
  await dialog
    .getByLabel("WhatsApp del propietario (opcional)")
    .fill("573001234567");
  await dialog.getByLabel("Cantidad total de boletas").fill("3");
  await dialog
    .getByLabel("Valor por unidad para el propietario")
    .fill("100000");
  await expect(dialog.getByLabel("Precio público por unidad")).toHaveValue(
    "115000",
  );
  await dialog
    .getByRole("button", { name: "Agregar inventario", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await noOverflow(page);
  const detailUrl = page.url();
  const lot = page.locator(".lot-card");
  await expect(lot).toContainText(/\$\s*115\.000/);
  // Intercept external navigation: verify the real click and message without contacting anyone.
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<p>WhatsApp verificado</p>",
    }),
  );
  const sellerPopupPromise = page.waitForEvent("popup");
  await lot.getByRole("link", { name: "Contactar propietario" }).click();
  const sellerPopup = await sellerPopupPromise;
  await sellerPopup.waitForLoadState();
  expect(new URL(sellerPopup.url()).searchParams.get("text")).toContain(
    "Propietario de prueba",
  );
  await sellerPopup.close();
  await lot.getByRole("button", { name: "Reservar", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cantidad a reservar").fill("4");
  await dialog.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(dialog.getByRole("alert")).toContainText("No hay suficientes");
  await dialog.getByLabel("Cantidad a reservar").fill("2");
  await dialog
    .getByLabel("Referencia o nota (opcional)")
    .fill("Reserva del flujo de prueba");
  await dialog.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(dialog).not.toBeVisible();
  await page.goto("/");
  let publicCard = page.locator(".event-card").filter({
    has: page.getByRole("heading", {
      name: "Festival de prueba",
      exact: true,
    }),
  });
  await expect(publicCard).toContainText("1 disponibles");
  await page.goto("/admin/reservas");
  let reservation = page
    .locator(".reservation-card")
    .filter({ hasText: "Reserva del flujo de prueba" });
  await reservation.getByRole("button", { name: "Cancelar reserva" }).click();
  await expect(reservation).toHaveCount(0);
  await page.goto("/");
  publicCard = page
    .locator(".event-card")
    .filter({ hasText: "Festival de prueba" });
  await expect(publicCard).toContainText("3 disponibles");
  await page.goto(detailUrl);
  await page.getByRole("button", { name: "Reservar", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cantidad a reservar").fill("1");
  await dialog
    .getByLabel("Referencia o nota (opcional)")
    .fill("Venta del flujo de prueba");
  await dialog.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(dialog).not.toBeVisible();
  await page.goto("/admin/reservas");
  reservation = page
    .locator(".reservation-card")
    .filter({ hasText: "Venta del flujo de prueba" });
  await reservation.getByRole("button", { name: "Completar venta" }).click();
  await page.getByRole("button", { name: "Historial", exact: true }).click();
  await expect(
    page
      .locator(".reservation-card")
      .filter({ hasText: "Venta del flujo de prueba" }),
  ).toContainText("Vendida");
  await noOverflow(page);
  await page.reload();
  await page.getByRole("button", { name: "Historial", exact: true }).click();
  await expect(page.getByText("Venta del flujo de prueba")).toBeVisible();
  await page.goto("/");
  await expect(
    page.locator(".event-card").filter({ hasText: "Festival de prueba" }),
  ).toContainText("2 disponibles");
  expect(errors).toEqual([]);
});

test("configuración, enlace de comprador y reset confirmado", async ({
  page,
  context,
}) => {
  await page.goto("/admin/configuracion");
  await page
    .getByLabel("WhatsApp de Andrés", { exact: true })
    .fill("573001234567");
  await page.getByLabel("Nombre de la marca").fill("Andrés Demo");
  await page.getByRole("button", { name: "Guardar configuración" }).click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados");
  await page.goto("/");
  await expect(page.locator(".brand")).toContainText("Andrés Demo");
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<p>WhatsApp verificado</p>",
    }),
  );
  const popupPromise = page.waitForEvent("popup");
  await page
    .getByLabel("Consultar EDC Colombia, General · 2 días por WhatsApp")
    .click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  const url = new URL(popup.url());
  expect(url.pathname).toBe("/573001234567");
  expect(url.searchParams.get("text")).toContain("General · 2 días");
  expect(url.searchParams.get("text")).toMatch(/\$\s*450\.000/);
  await popup.close();
  await page.goto("/admin/configuracion");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Restablecer demo", exact: true })
    .click();
  await expect(page.getByLabel("Nombre de la marca")).toHaveValue(
    "Andrés Demo",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Restablecer demo", exact: true })
    .click();
  await expect(page.getByLabel("Nombre de la marca")).toHaveValue(
    "Andrés Le Vende",
  );
  await expect(
    page.getByLabel("WhatsApp de Andrés", { exact: true }),
  ).toHaveValue("");
  await noOverflow(page);
});

test("precio desde se actualiza al agotar el lote barato y cancelar lo recupera", async ({
  page,
}) => {
  page.on("dialog", (d) => d.accept());
  await page.goto("/admin/eventos/edc");
  const lot = page.locator(".lot-card").filter({
    has: page.getByRole("heading", { name: "María (demo)", exact: true }),
  });
  await lot.getByRole("button", { name: "Reservar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cantidad a reservar").fill("2");
  await dialog.getByLabel("Referencia o nota (opcional)").fill("Agotar barato");
  await dialog.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(dialog).not.toBeVisible();
  await page.goto("/");
  let local = page
    .locator(".event-card")
    .filter({ hasText: "EDC Colombia" })
    .locator(".public-locality")
    .filter({ hasText: "General" });
  await expect(local).toContainText(/\$\s*480\.000/);
  await expect(local).toContainText("2 disponibles");
  await page.goto("/admin/reservas");
  await page
    .locator(".reservation-card")
    .filter({ hasText: "Agotar barato" })
    .getByRole("button", { name: "Cancelar reserva" })
    .click();
  await page.goto("/");
  local = page
    .locator(".event-card")
    .filter({ hasText: "EDC Colombia" })
    .locator(".public-locality")
    .filter({ hasText: "General" });
  await expect(local).toContainText(/\$\s*450\.000/);
  await expect(local).toContainText("4 disponibles");
});
