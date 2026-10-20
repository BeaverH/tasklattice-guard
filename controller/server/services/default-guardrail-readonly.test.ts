import { describe, expect, it, vi } from "vitest";
import type { ControllerConfig } from "../config.js";
import type { ControllerDatabase } from "../db/client.js";
import { ControlPlaneService } from "./control-plane.js";

const id = "guardrail-default";
const actorId = "admin";
const operations: Array<[string, (service: ControlPlaneService) => Promise<unknown>]> = [
  ["rename", service => service.updateGuardrail({ id, actorId, name: "Changed" })],
  ["change runtime", service => service.updateGuardrail({ id, actorId, runtimeProfile: "iorails_native" })],
  ["discard draft", service => service.discardGuardrailDraft({ id, actorId, expectedDraftRevision: 5, expectedBaselineVersion: "published" })],
  ["publish draft", service => service.requestGuardrailPublish({ guardrailId: id, actorId })],
  ["test draft", service => service.requestValidation({ guardrailId: id, actorId, compilerAvailable: true })],
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
  it.each(operations)("rejects user attempts to %s before any database changes", async (_name, operation) => {
    const transaction = vi.fn();
    const db = { transaction } as unknown as ControllerDatabase;
    const service = new ControlPlaneService(db, {} as ControllerConfig);
    await expect(operation(service)).rejects.toMatchObject({ code: "default_guardrail_read_only" });
    expect(transaction).not.toHaveBeenCalled();
  });
});
