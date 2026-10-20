// @vitest-environment node
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { describe, expect, it, vi } from "vitest";
import { ensureBootstrapAdmin, ensureBootstrapUser } from "./bootstrap.js";
import type { ControllerAuth } from "./auth.js";
import type { ControllerDatabase } from "./db/client.js";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { createAuth } from "./auth.js";
import { loadConfig } from "./config.js";

function fixture(existing = false) {
  const linkAccount = vi.fn();
  const createUser = vi.fn(async () => ({ user: { id: "bootstrap-user" } }));
  const select = vi.fn()
    .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: async () => existing ? [{ id: "bootstrap-user" }] : [] }) }) })
    .mockReturnValueOnce({ from: () => ({ where: async () => [{ providerId: "credential" }] }) });
  const auth = { api: { createUser }, $context: Promise.resolve({ internalAdapter: { linkAccount } }) } as unknown as ControllerAuth;
  const db = { select } as unknown as ControllerDatabase;
  return { auth, db, createUser, linkAccount, select, email: "admin@example.test", name: "Administrator" };
}

describe("bootstrap credential import", () => {
  it.each([["admin", ensureBootstrapAdmin], ["user", ensureBootstrapUser]] as const)("signs in the real Better Auth %s account with password", async (role, ensure) => {
    const config = loadConfig({ NODE_ENV: "test", CONTROLLER_DATABASE_URL: "postgresql://unused:unused@localhost/unused",
      CONTROLLER_RUNNER_TOKEN: "test-runner-token-at-least-32-characters", CONTROLLER_ARTIFACT_SIGNING_KEY_PATH: "/unused-key",
      BETTER_AUTH_SECRET: "test-auth-secret-at-least-32-characters" });
    const data = { user: [], account: [], session: [], verification: [] };
    const options = createAuth(config, {} as ControllerDatabase).options;
    const auth = betterAuth({ ...options, database: memoryAdapter(data), databaseHooks: undefined });
    const passwordHash = await hashPassword("password");
    const input = { ...fixture(), auth: auth as unknown as ControllerAuth, email: `${role}@tasklattice.local`, passwordHash };
    await ensure(input);
    const login = await auth.api.signInEmail({ body: { email: input.email, password: "password" } });
    expect(login.user).toMatchObject({ email: input.email, role });
    await expect(auth.api.signInEmail({ body: { email: input.email, password: "Password" } })).rejects.toThrow();
    await expect(auth.api.signInEmail({ body: { email: input.email, password: passwordHash } })).rejects.toThrow();
  });
  it("generates independent development account digests in the initialization Job", async () => {
    const { secretData } = await import(new URL("../scripts/runtime/bootstrap-secrets.mjs", import.meta.url).href);
    const hashes: string[] = [];
    for (const role of ["admin", "user"]) {
      const data = await secretData({ kind: "account", email: `${role}@tasklattice.local`, displayName: role, localDefault: true });
      hashes.push(data["password-hash"]);
    }
    expect(new Set(hashes).size).toBe(2);
    for (const hash of hashes) {
      expect(await verifyPassword({ hash, password: "password" })).toBe(true);
      expect(await verifyPassword({ hash, password: "Password" })).toBe(false);
    }
  });

  it("imports a Better Auth hash without hashing it again", async () => {
    const input = fixture();
    const passwordHash = await hashPassword("password");
    expect(await ensureBootstrapAdmin({ ...input, passwordHash })).toBe("created");
    expect(input.createUser).toHaveBeenCalledWith({ body: { email: input.email, name: input.name, role: "admin" } });
    const credential = input.linkAccount.mock.calls[0]![0];
    expect(credential).toMatchObject({ providerId: "credential", accountId: "bootstrap-user", password: passwordHash });
    expect(await verifyPassword({ hash: credential.password, password: "password" })).toBe(true);
    expect(await verifyPassword({ hash: credential.password, password: passwordHash })).toBe(false);
  });

  it("does not replace existing credentials on restart", async () => {
    const input = fixture(true);
    expect(await ensureBootstrapAdmin({ ...input, passwordHash: await hashPassword("new-password") })).toBe("existing");
    expect(input.createUser).not.toHaveBeenCalled();
    expect(input.linkAccount).not.toHaveBeenCalled();
  });

  it("preserves the plaintext bootstrap API", async () => {
    const input = fixture();
    await ensureBootstrapAdmin({ ...input, password: "initial-password" });
    expect(input.createUser).toHaveBeenCalledWith({ body: { email: input.email, name: input.name, role: "admin", password: "initial-password" } });
    expect(input.linkAccount).not.toHaveBeenCalled();
  });

  it("creates the default user with user authority and an imported password hash", async () => {
    const input = { ...fixture(), email: "user@tasklattice.local", name: "Local User" };
    const passwordHash = await hashPassword("password");
    expect(await ensureBootstrapUser({ ...input, passwordHash })).toBe("created");
    expect(input.createUser).toHaveBeenCalledWith({ body: { email: input.email, name: input.name, role: "user" } });
    expect(input.linkAccount).toHaveBeenCalledWith(expect.objectContaining({ password: passwordHash, providerId: "credential" }));
  });

  it("does not reset an existing user's credentials or role", async () => {
    const input = { ...fixture(true), email: "user@tasklattice.local" };
    expect(await ensureBootstrapUser({ ...input, passwordHash: await hashPassword("password") })).toBe("existing");
    expect(input.createUser).not.toHaveBeenCalled();
    expect(input.linkAccount).not.toHaveBeenCalled();
  });

  it.each([{}, { passwordHash: "invalid" }, { password: "password", passwordHash: "hash" }])("rejects invalid or ambiguous configuration before writing: %j", async (credentials) => {
    const input = fixture();
    await expect(ensureBootstrapAdmin({ ...input, ...credentials })).rejects.toThrow();
    expect(input.select).not.toHaveBeenCalled();
    expect(input.createUser).not.toHaveBeenCalled();
  });
});
