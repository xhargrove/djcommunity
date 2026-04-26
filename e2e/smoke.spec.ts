import { expect, test } from "@playwright/test";

test.describe("public routes", () => {
  test("landing shows product title", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "MixerHQ" }),
    ).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  });

  test("sign-up page loads", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(
      page.getByRole("heading", { name: "Create an account" }),
    ).toBeVisible();
  });

  test("terms placeholder page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(
      page.getByRole("heading", { name: /Terms of Service/i }),
    ).toBeVisible();
  });
});

test.describe("unauthenticated redirects", () => {
  test("deep link to /home preserves next param", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get("next")).toBe("/home");
  });

  test("staff route /admin redirects with next", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get("next")).toBe("/admin");
  });

  test("creator roadmap requires session", async ({ page }) => {
    await page.goto("/creator");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get("next")).toBe("/creator");
  });
});

const e2eEmail = process.env.E2E_EMAIL?.trim();
const e2ePassword = process.env.E2E_PASSWORD?.trim();

test.describe("optional signed-in smoke", () => {
  test.skip(
    !e2eEmail || !e2ePassword,
    "Set E2E_EMAIL and E2E_PASSWORD for authenticated flows.",
  );

  test("sign in reaches home with feed shell", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(e2eEmail!);
    await page.getByLabel("Password").fill(e2ePassword!);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("signed-in user can open account data (deletion request surface)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(e2eEmail!);
    await page.getByLabel("Password").fill(e2ePassword!);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
    await page.goto("/settings/data");
    await expect(page).toHaveURL(/\/settings\/data/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Your data" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Account deletion request" }),
    ).toBeVisible();
  });
});
