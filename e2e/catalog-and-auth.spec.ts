import { test, expect, type Page } from "@playwright/test";

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("el catálogo real no carga el demo y mantiene la búsqueda responsive", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /En cartelera/ }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Demo interactivo");
  await expect(page.locator("main")).not.toContainText("Restablecer demo");
  await noOverflow(page);

  const hasEvents = (await page.locator(".event-card").count()) > 0;
  await page
    .getByLabel("Buscar eventos")
    .fill("busqueda-sin-resultados-987654");
  await expect(page.locator(".event-card")).toHaveCount(0);
  await expect(
    page.getByText(
      hasEvents ? "No encontramos ese plan" : "Aún no hay boletas disponibles",
    ),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("el panel no es accesible sin sesión", async ({ page }) => {
  await page.goto("/admin/eventos");
  await expect(page).toHaveURL(/\/ingresar$/);
  await expect(
    page.getByRole("heading", { name: "Panel de administración" }),
  ).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await noOverflow(page);
});
