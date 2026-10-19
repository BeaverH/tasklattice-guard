import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Kubernetes mounts the complete account Secret; protocol-specific field names
// live in the application image rather than the deployment package.
export function clusterBootstrapEnvironment(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const result = { ...environment };
  if (environment.CONTROLLER_MIN_LOGIN_LENGTH) result.BETTER_AUTH_MIN_PASSWORD_LENGTH = environment.CONTROLLER_MIN_LOGIN_LENGTH;
  for (const role of ["ADMIN", "USER"]) {
    const prefix = `CONTROLLER_BOOTSTRAP_${role}`;
    const directory = environment[`${prefix}_DIRECTORY`];
    if (!directory) continue;
    const fields = JSON.parse(environment[`${prefix}_FIELDS`] || "{}") as Record<string, string>;
    for (const [suffix, key, optional] of [
      ["EMAIL", fields.emailKey || "email", false],
      ["NAME", fields.nameKey || "name", false],
      ["PASSWORD", fields.credentialKey || "password", true],
      ["PASSWORD_HASH", fields.digestKey || "password-hash", true],
    ] as const) {
      if (key === "." || key === ".." || key.includes("/") || key.includes("\\")) throw new Error("Invalid bootstrap Secret field name.");
      const path = join(directory, key);
      result[`${prefix}_${suffix}`] = optional && !existsSync(path) ? undefined : readFileSync(path, "utf8");
    }
  }
  return result;
}
