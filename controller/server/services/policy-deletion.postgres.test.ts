// @vitest-environment node
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ControllerConfig } from "../config.js";
import { createTestDatabase } from "../db/postgres-test-database.js";
import { normalizeGuardrailDraft } from "../domain/guardrail-plan.js";
import { emptyPolicyDefinition } from "../../shared/policy-definition.js";
import { ControlPlaneService } from "./control-plane.js";

const url = process.env.GUARD_TEST_POSTGRES_URL;
describe.skipIf(!url)("Policy deletion in PostgreSQL", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let service: ControlPlaneService;
  beforeAll(async () => {
    database = await createTestDatabase(url!, "policy_deletion");
    await database.pool.query("INSERT INTO auth_user (id, name, email, role) VALUES ('test', 'Test', 'test@example.test', 'user')");
    service = new ControlPlaneService(database.db, { policyCatalogDir: resolve("../runner/toolkit/policy_library/assets") } as ControllerConfig);
  });
  afterAll(async () => { await database?.drop(); });
  async function create(id: string) {
    const definition = emptyPolicyDefinition();
    definition.metadata.id = id; definition.metadata.name = id;
    await service.policyResources.save({ definition, maintainer: "Test", expectedRevision: 0, actorId: "test", create: true });
    return definition;
  }
  const remove = (id: string) => service.deletePolicy({ id, actorId: "test" });

  it("deletes a Rules draft and all owned history without resurrecting imported versions", async () => {
    const id = "deletion-complete";
    const definition = await create(id);
    const view = await service.getPolicy(id);
    expect(view).toMatchObject({ implementation: "rules", deletable: true });
    expect((await service.listPolicies()).find(p => p.id === id)).toMatchObject({ deletable: true });
    await database.pool.query("INSERT INTO policy_resource_version (policy_id,version,revision,definition,view,digest) VALUES ($1,'r1',1,$2,$3,'test')", [id, definition, view]);
    await database.pool.query("INSERT INTO policy_imported_version (policy_id,version,digest,definition,source_id) VALUES ($1,'imported','test',$2,'test')", [id, { ...view, version: "imported" }]);
    await database.pool.query("INSERT INTO policy_resource_validation (id,policy_id,parent_id,revision,status,tests) VALUES ('report',$1,NULL,1,'passed','[]'),('job',$1,'report',1,'passed','[]')", [id]);
    await database.pool.query("INSERT INTO controller_outbox (id,kind,aggregate_id,payload) VALUES ('job','policy.validation_requested',$1,'{}')", [id]);
    await remove(id);
    await expect(service.policyResources.save({ definition, maintainer: "Test", expectedRevision: 1, actorId: "test" })).rejects.toMatchObject({ code: "policy_draft_conflict" });
    await expect(service.getPolicy(id)).rejects.toMatchObject({ code: "not_found" });
    expect((await service.listPolicies()).some(p => p.id === id)).toBe(false);
    for (const table of ["policy_resource_version", "policy_imported_version", "policy_resource_validation"]) {
      expect((await database.pool.query(`SELECT * FROM ${table} WHERE policy_id=$1`, [id])).rows).toHaveLength(0);
    }
    expect((await database.pool.query("SELECT * FROM controller_outbox WHERE aggregate_id=$1", [id])).rows).toHaveLength(0);
    expect((await database.pool.query("SELECT detail FROM audit_event WHERE kind='policy.deleted' AND resource_id=$1", [id])).rows).toEqual([{ detail: { name: id } }]);
  });

  it.each(["draft", "version", "profile"])("preserves a Rules Policy referenced by a %s", async kind => {
    const id = `deletion-${kind}`; await create(id);
    if (kind === "profile") {
      await database.pool.query("INSERT INTO guardrail_profile (id,category,category_name,definition) VALUES ($1,'general','General',$2)", [id, { name: "Profile", policies: [{ policyId: id }], optionalPolicyIds: [] }]);
    } else {
      const draft = normalizeGuardrailDraft({ policyBindings: kind === "draft" ? [{ policyId: id, policyVersion: "0" }] : [] });
      await database.pool.query("INSERT INTO guardrail (id,name,draft_config) VALUES ($1,'Reference',$2)", [id, draft]);
      if (kind === "version") await database.pool.query("INSERT INTO guardrail_version (guardrail_id,version,generation,status,runtime_profile,plan,released_at) VALUES ($1,'v1',1,'ready','auto',$2,now())", [id, { policy_bindings: [{ policy_id: id, policy_version: "0" }] }]);
    }
    await expect(remove(id)).rejects.toMatchObject({ code: "policy_in_use" });
    expect(await service.getPolicy(id)).toMatchObject({ id });
    expect((await database.pool.query("SELECT * FROM audit_event WHERE kind='policy.deleted' AND resource_id=$1", [id])).rows).toHaveLength(0);
  });

  it("protects in-flight testing, then permits deletion after completion", async () => {
    const id = "deletion-running"; await create(id);
    await database.pool.query("INSERT INTO policy_resource_validation (id,policy_id,revision,status,tests) VALUES ($1,$1,1,'running','[]')", [id]);
    await expect(remove(id)).rejects.toMatchObject({ code: "policy_validation_in_progress" });
    await database.pool.query("UPDATE policy_resource_validation SET status='failed' WHERE policy_id=$1", [id]);
    await remove(id);
    await expect(service.getPolicy(id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("keeps system Policies protected and returns not found for an absent resource", async () => {
    const builtin = (await service.listPolicies()).find(p => p.id === "local-payment-data")!;
    expect(builtin.deletable).toBe(false);
    await expect(remove(builtin.id)).rejects.toThrow("system managed");
    await expect(remove("no-such-policy")).rejects.toMatchObject({ code: "not_found" });
  });
});
