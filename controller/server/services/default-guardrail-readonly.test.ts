import { describe, expect, it, vi } from "vitest";
import type { ControllerConfig } from "../config.js";
import type { ControllerDatabase } from "../db/client.js";
import { ControlPlaneService } from "./control-plane.js";

const id = "guardrail-default";
const actorId = "user";
const operations: Array<[string, (service: ControlPlaneService) => Promise<unknown>]> = [
  ["rename", service => service.updateGuardrail({ id, actorId, name: "Changed" })],
  ["change runtime", service => service.updateGuardrail({ id, actorId, runtimeProfile: "iorails_native" })],
  ["discard draft", service => service.discardGuardrailDraft({ id, actorId, expectedDraftRevision: 5, expectedBaselineVersion: "published" })],
  ["add test", service => service.createTestCase({
    guardrailId: id, actorId, name: "Custom", policyId: "custom", phase: "input",
    content: "hello", expectedDecision: "allow", trustedInstruction: "", targetSource: "user_input",
    query: "", groundingSources: [], expectedReasoningResult: null,
  })],
  ["delete test", service => service.deleteTestCase({ guardrailId: id, actorId, caseId: "custom" })],
  ["exclude test", service => service.setTestCaseExcluded({ guardrailId: id, actorId, caseId: "inherited", excluded: true })],
  ["restore test", service => service.setTestCaseExcluded({ guardrailId: id, actorId, caseId: "inherited", excluded: false })],
];

describe("platform-maintained Default Guardrail", () => {
  it.each(["publish", "test"])("requires platform authority to %s Default before any writes", async action => {
    const transaction = vi.fn();
    const db = { transaction, select: () => ({ from: () => ({ where: async () => [{ role: "user" }] }) }) } as unknown as ControllerDatabase;
    const service = new ControlPlaneService(db, {} as ControllerConfig);
    const operation = action === "publish"
      ? service.requestGuardrailPublish({ guardrailId: id, actorId })
      : service.requestValidation({ guardrailId: id, actorId, compilerAvailable: true });
    await expect(operation).rejects.toMatchObject({ code: "forbidden", status: 403 });
    expect(transaction).not.toHaveBeenCalled();
  });
  it.each(operations)("rejects user attempts to %s before any database changes", async (_name, operation) => {
    const transaction = vi.fn();
    const db = { transaction } as unknown as ControllerDatabase;
    const service = new ControlPlaneService(db, {} as ControllerConfig);
    await expect(operation(service)).rejects.toMatchObject({ code: "default_guardrail_read_only" });
    expect(transaction).not.toHaveBeenCalled();
  });
});
