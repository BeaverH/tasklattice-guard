// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { clusterBootstrapEnvironment } from "./cluster-bootstrap.js";
const directories: string[] = [];
function account(fields: Record<string, string>) {
  const directory = mkdtempSync(join(tmpdir(), "guard-account-"));
  directories.push(directory);
  for (const [name, value] of Object.entries(fields)) writeFileSync(join(directory, name), value);
  return directory;
}
afterEach(() => directories.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));
describe("mounted bootstrap accounts", () => {
  it("loads legacy fields and the login policy without mutating the environment", () => {
    const input = { CONTROLLER_BOOTSTRAP_ADMIN_DIRECTORY: account({ email: "admin@example.com", name: "Admin", "password-hash": "digest" }), CONTROLLER_MIN_LOGIN_LENGTH: "16" };
    const result = clusterBootstrapEnvironment(input);
    expect(result.CONTROLLER_BOOTSTRAP_ADMIN_EMAIL).toBe("admin@example.com");
    expect(result.CONTROLLER_BOOTSTRAP_ADMIN_PASSWORD_HASH).toBe("digest");
    expect(result.CONTROLLER_BOOTSTRAP_ADMIN_PASSWORD).toBeUndefined();
    expect(result.BETTER_AUTH_MIN_PASSWORD_LENGTH).toBe("16");
    expect(input).not.toHaveProperty("CONTROLLER_BOOTSTRAP_ADMIN_EMAIL");
  });
  it("supports custom user fields", () => {
    const result = clusterBootstrapEnvironment({ CONTROLLER_BOOTSTRAP_USER_DIRECTORY: account({ mail: "user@example.com", label: "User", login: "key" }), CONTROLLER_BOOTSTRAP_USER_FIELDS: JSON.stringify({ emailKey: "mail", nameKey: "label", credentialKey: "login" }) });
    expect(result.CONTROLLER_BOOTSTRAP_USER_EMAIL).toBe("user@example.com");
    expect(result.CONTROLLER_BOOTSTRAP_USER_PASSWORD).toBe("key");
    expect(result.CONTROLLER_BOOTSTRAP_USER_PASSWORD_HASH).toBeUndefined();
  });
  it("fails for missing required fields and field traversal", () => {
    const directory = account({ email: "admin@example.com" });
    expect(() => clusterBootstrapEnvironment({ CONTROLLER_BOOTSTRAP_ADMIN_DIRECTORY: directory })).toThrow();
    expect(() => clusterBootstrapEnvironment({ CONTROLLER_BOOTSTRAP_ADMIN_DIRECTORY: directory, CONTROLLER_BOOTSTRAP_ADMIN_FIELDS: '{"nameKey":"../name"}' })).toThrow("Invalid bootstrap Secret field");
  });
});
