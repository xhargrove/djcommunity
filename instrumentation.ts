export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertPublicEnv } = await import("@/lib/env/public");
    assertPublicEnv();

    const { assertServerEnv } = await import("@/lib/env/server");
    assertServerEnv();
  }
}
