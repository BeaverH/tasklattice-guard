// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";

const url = process.env.GUARD_TEST_POSTGRES_URL;
const migrationsFolder = fileURLToPath(new URL("./migrations/", import.meta.url));

describe.skipIf(!url)("Scan defaults across divergent migration histories", () => {
  it.each([false, true])("upgrades past Policy Studio when the Scan column already exists: %s", async (hasScanColumn) => {
    expect(["127.0.0.1", "localhost", "[::1]"]).toContain(new URL(url!).hostname);
    const namespace = `scan_upgrade_${randomUUID().replaceAll("-", "")}`;
    const admin = new Pool({ connectionString: url, max: 1 });
    const pool = new Pool({ connectionString: url, max: 1, options: `-c search_path=${namespace}` });
    try {
      await admin.query(`CREATE SCHEMA "${namespace}"`);
      await pool.query(`CREATE TABLE endpoint (id text PRIMARY KEY${hasScanColumn ? ", scan_flag_only_default boolean NOT NULL DEFAULT true" : ""})`);
      await pool.query("INSERT INTO endpoint(id) VALUES ('existing')");
      if (hasScanColumn) await pool.query("UPDATE endpoint SET scan_flag_only_default=false");
      // Simulate an installed main whose latest recorded migration is 0037.
      // Drizzle skips 0036 by timestamp, even if that migration was never applied.
      const journal = JSON.parse(readFileSync(`${migrationsFolder}/meta/_journal.json`, "utf8")) as {
        entries: { tag: string; when: number }[];
      };
      const policyMigration = journal.entries.find(entry => entry.tag === "0037_policy_resources")!;
      await pool.query("CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)");
      await pool.query("INSERT INTO __drizzle_migrations(hash,created_at) VALUES ('installed-main',$1)", [policyMigration.when]);

      const db = drizzle(pool);
      const config = { migrationsFolder, migrationsSchema: namespace };
      await migrate(db, config);
      expect((await pool.query("SELECT scan_flag_only_default FROM endpoint WHERE id='existing'")).rows[0])
        .toEqual({ scan_flag_only_default: !hasScanColumn });
      await pool.query("INSERT INTO endpoint(id) VALUES ('new')");
      expect((await pool.query("SELECT scan_flag_only_default FROM endpoint WHERE id='new'")).rows[0])
        .toEqual({ scan_flag_only_default: true });

      const applied = (await pool.query("SELECT count(*)::int AS n FROM __drizzle_migrations")).rows[0].n;
      expect(applied).toBeGreaterThan(1);
      await migrate(db, config);
      expect((await pool.query("SELECT count(*)::int AS n FROM __drizzle_migrations")).rows[0].n).toBe(applied);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS "${namespace}" CASCADE`);
      await admin.end();
    }
  });
});
