import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Policy } from "@/lib/api";
import type { GuardrailProfilePreview } from "@/lib/guardrails-api";
import { PolicyLibraryPage } from "./policy-library";

const mocks = vi.hoisted(() => ({ policies: vi.fn(), profiles: vi.fn(), navigate: vi.fn(), search: {} as { collection?: string } }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate, useSearch: () => mocks.search }));
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
  useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => String(values?.defaultValue ?? key), i18n: { language: "en" } }),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { role: "user" } }) }));
vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), getPolicies: () => mocks.policies(), getGuardrailProfiles: () => mocks.profiles() }));
vi.mock("./create-guardrail-wizard", () => ({ CreateGuardrailWizard: ({ initialProfileId }: { initialProfileId: string }) => <div role="dialog">Wizard: {initialProfileId}</div> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const policy = { id: "shared-identifiers", version: "4.0.0", name: "Shared identifiers", description: "Reusable formats", source: "built_in", implementation: "rules",
  tags: [], parameters: [], rails: ["input", "output"], effects: ["transform"], detectors: [], test_cases: [], test_count: 0, safety_level: "balanced", output_delivery: "full_buffered",
  rules: ["sg-id", "eu-id", "unused-id"].map(id => ({ id, name: id, description: `${id} coverage`, effect: "transform", rails: ["input", "output"], detector: { ref: "text/regex", version: "1.0.0" } })),
} as Policy;
const makeProfile = (id: string, region: string, name: string, rule: string): GuardrailProfilePreview => ({
  id, version: "2.0.0", name, description: name, industry: "general", jurisdictions: [region], policies: [], suggestedTopics: [], optionalPolicyIds: [], limitations: [],
  bindings: [{ policy_id: policy.id, policy_version: policy.version, enabled_rule_ids: [rule], rule_order: [rule], enabled_rails: ["input"], parameter_values: {}, rule_actions: {} }],
});
const sg = makeProfile("singapore-data-protection", "singapore", "Singapore data protection", "sg-id");
const eu = makeProfile("eu-data-protection", "eu", "EU data protection", "eu-id");
beforeEach(() => {
  mocks.search = {};
  mocks.policies.mockResolvedValue({ items: [policy], count: 1 });
  mocks.profiles.mockResolvedValue({ items: [sg, eu], count: 2 });
});
function mount() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PolicyLibraryPage /></QueryClientProvider>); }

describe("Policy set discovery workflow", () => {
  it("filters by region and framework, offers an honest empty state, and opens the selected set in the wizard", async () => {
    mount();
    const catalog = await screen.findByLabelText("policyLibrary.catalogLabel");
    await waitFor(() => expect(within(catalog).getAllByRole("article")).toHaveLength(3));
    expect(screen.queryByText("policyLibrary.collections.capabilities")).toBeNull();
    expect(screen.queryByText("policyLibrary.collections.title")).toBeNull();
    const filters = within(screen.getByRole("complementary"));
    fireEvent.click(filters.getByRole("checkbox", { name: /^Singapore\s*1$/ }));
    expect(within(catalog).getAllByRole("article")).toHaveLength(1);
    fireEvent.click(filters.getByRole("checkbox", { name: /GDPR/ }));
    expect(screen.getByText("policyLibrary.noCatalogResults")).toBeTruthy();
    fireEvent.click(filters.getByRole("checkbox", { name: /GDPR/ }));
    fireEvent.click(screen.getByRole("button", { name: "policyLibrary.inspectPolicy" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getAllByText("sg-id")[0]).toBeTruthy();
    expect(within(sheet).queryByText("eu-id")).toBeNull();
    expect(within(sheet).queryByText("unused-id")).toBeNull();
    expect(within(sheet).getAllByRole("tab")).toHaveLength(3);
    expect(within(sheet).getByRole("tab", { name: /policyLibrary.tabs.policy/ })).toBeTruthy();
    expect(within(sheet).getByRole("tab", { name: /policyLibrary.tabs.testCases/ })).toBeTruthy();
    expect(within(sheet).getByRole("tab", { name: /policyLibrary.tabs.compliance/ })).toBeTruthy();
    expect(within(sheet).queryByText("Shared identifiers")).toBeNull();
    expect(within(sheet).queryByRole("button", { name: "policyLibrary.collections.inspectSource" })).toBeNull();
    fireEvent.click(within(sheet).getByRole("button", { name: "policyLibrary.collections.use" }));
    expect(await screen.findByText("Wizard: singapore-data-protection")).toBeTruthy();
  });

  it("shows the selected Rules' tests and compliance in the same Policy inspector", async () => {
    const withTests = { ...policy, test_count: 2, test_cases: ["sg-id", "eu-id"].map(id => ({
      id: `${id}-case`, name: `${id} sample`, group: "Identifiers", phase: "input", content: `${id} sample input`,
      covered_rule_ids: [id], kind: "rule_acceptance", expected_decision: "transform", required: true, parameter_names: [], description: "",
    })) };
    mocks.policies.mockResolvedValue({ items: [withTests], count: 1 }); mocks.search = { collection: sg.id };
    mount();
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(sheet).getByRole("tab", { name: /policyLibrary.tabs.testCases/ }));
    expect(within(sheet).getByText("sg-id sample")).toBeTruthy();
    expect(within(sheet).queryByText("eu-id sample")).toBeNull();
    fireEvent.click(within(sheet).getByRole("tab", { name: /policyLibrary.tabs.compliance/ }));
    expect(within(sheet).getByRole("heading", { name: "policyLibrary.compliance.title" })).toBeTruthy();
    expect(within(sheet).getByText("policyLibrary.compliance.empty")).toBeTruthy();
  });

  it("loads a set deep link and blocks applying unavailable versions", async () => {
    const missing = structuredClone(sg); missing.bindings[0].policy_version = "not-installed";
    mocks.profiles.mockResolvedValue({ items: [missing], count: 1 }); mocks.search = { collection: sg.id };
    mount();
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("alert").textContent).toContain("shared-identifiers@not-installed");
    expect(within(sheet).getByRole("button", { name: "policyLibrary.collections.use" }).hasAttribute("disabled")).toBe(true);
  });

  it("keeps capability browsing available after Profile failure and recovers on retry", async () => {
    mocks.profiles.mockRejectedValueOnce(new Error("offline")); mount();
    expect(await screen.findByText("policyLibrary.collections.loadFailed")).toBeTruthy();
    expect(screen.getByText(policy.name)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "policyLibrary.collections.retry" }));
    await screen.findByRole("heading", { name: sg.name });
    await waitFor(() => expect(screen.queryByText("policyLibrary.collections.loadFailed")).toBeNull());
  });
});
