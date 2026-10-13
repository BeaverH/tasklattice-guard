import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Guardrail } from "@/lib/api";
import type { ProtectionModeSettings } from "../../shared/protection-mode";
import { MenuButton } from "@carbon/react";
import { GuardrailProtectionMode, useGuardrailProtectionActions } from "./guardrail-protection-mode";
const mocks = vi.hoisted(() => ({ role: "admin", update: vi.fn() }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { role: mocks.role } }) }));
vi.mock("@/lib/guardrails-api", () => ({ updateGuardrailProtectionMode: mocks.update }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en", exists: () => false } }) }));
vi.mock("./ui/notifications", () => ({ toast: { success: vi.fn() } }));
const settings: ProtectionModeSettings = { guardrailId: "g", mode: "enforce", appliedMode: "enforce", generation: 7, ready: true,
  status: "applied", applied: 1, total: 1, runners: [{ runnerId: "r", modeApplied: true, status: "applied", reason: null }], updatedAt: null, updatedBy: null, reason: "" };
function ModeControls({ guardrail, onChanged }: { guardrail: Guardrail; onChanged: () => Promise<unknown> }) {
  const actions = useGuardrailProtectionActions(guardrail, onChanged);
  return <>
    {mocks.role === "admin" ? <MenuButton ref={actions.menuRef} label="Actions">{actions.menuItems}</MenuButton> : null}
    {actions.feedback}
    <GuardrailProtectionMode guardrail={guardrail} />
  </>;
}
function openActions() { fireEvent.click(screen.getByRole("button", { name: "Actions" })); }
function openModeMenu() {
  openActions();
  fireEvent.click(screen.getByRole("menuitem", { name: "protectionMode.change" }));
}
function chooseMode(mode: string) {
  fireEvent.click(screen.getByRole("menuitem", { name: new RegExp(`^states.${mode}( · |$)`) }));
}
function show(overrides: Partial<ProtectionModeSettings> = {}) {
  const onChanged = vi.fn().mockResolvedValue(undefined);
  const protection = { ...settings, ...overrides };
  const guardrail = { id: "g", name: "Test", status: protection.ready ? protection.appliedMode : "not_ready", protection } as Guardrail;
  render(<QueryClientProvider client={new QueryClient()}><ModeControls guardrail={guardrail} onChanged={onChanged} /></QueryClientProvider>);
  return onChanged;
}
beforeEach(() => { mocks.role = "admin"; mocks.update.mockReset().mockResolvedValue(settings); });
afterEach(cleanup);
describe("protection-mode interaction", () => {
  it("keeps healthy mode compact and opens Runner details without changing protection", () => {
    show();
    expect(screen.queryByRole("region", { name: "protectionMode.title" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("protectionMode.descriptions.enforce")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "protectionMode.details" }));
    expect(screen.getByRole("dialog", { name: "protectionMode.details" })).toBeTruthy();
    expect(screen.getByText("protectionMode.runners.applied")).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("stages selection until Apply with the reviewed generation and reason", async () => {
    const onChanged = show();
    openModeMenu();
    chooseMode("bypass");
    expect((screen.getByRole("radio", { name: "states.bypass" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.change(screen.getByLabelText("protectionMode.reason"), { target: { value: "upstream outage" } });
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "protectionMode.enableBypass" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("g", { mode: "bypass", expectedGeneration: 7, reason: "upstream outage" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  });
  it("uses a single top-level action, marks the current mode and leaves it unchanged on cancel", async () => {
    show({ mode: "bypass", appliedMode: "bypass" });
    openActions();
    const rootMenu = screen.getByRole("menu", { name: "Actions" });
    expect(screen.getAllByRole("menuitem").filter(item => item.parentElement === rootMenu)).toHaveLength(1);
    fireEvent.click(screen.getByRole("menuitem", { name: "protectionMode.change" }));
    const current = screen.getByRole("menuitem", { name: "states.bypass" });
    expect(current.getAttribute("aria-current")).toBe("true");
    fireEvent.click(current);
    expect((screen.getByRole("button", { name: "protectionMode.enableBypass" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    openModeMenu();
    chooseMode("monitor");
    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Actions" })));
    expect(screen.getByText("bypass")).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("keeps selection and reason after a conflict", async () => {
    mocks.update.mockRejectedValue(new Error("Protection mode changed; refresh"));
    show();
    openModeMenu();
    chooseMode("monitor");
    fireEvent.change(screen.getByLabelText("protectionMode.reason"), { target: { value: "observe" } });
    fireEvent.click(screen.getByRole("button", { name: "protectionMode.apply" }));
    await screen.findByText("Protection mode changed; refresh");
    expect((screen.getByRole("radio", { name: "states.monitor" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("protectionMode.reason") as HTMLTextAreaElement).value).toBe("observe");
  });
  it("offers recovery while bypass is partially applied", async () => {
    show({ mode: "bypass", status: "partial", applied: 1, total: 2, runners: [...settings.runners, { runnerId: "offline", status: "offline", modeApplied: false, reason: null }] });
    expect(screen.getByText("enforce")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("protectionMode.states.partial");
    fireEvent.click(screen.getByRole("button", { name: "protectionMode.details" }));
    expect(screen.getByText("protectionMode.runners.offline")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "common.close" }).at(-1)!);
    openModeMenu();
    const current = screen.getByRole("menuitem", { name: "states.enforce" });
    expect(current.getAttribute("aria-current")).toBe("true");
    expect(current.getAttribute("aria-disabled")).not.toBe("true");
    expect(screen.getByRole("menuitem", { name: "states.bypass · protectionMode.requested" }).getAttribute("aria-current")).toBeNull();
    chooseMode("enforce");
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "protectionMode.apply" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("g", { mode: "enforce", expectedGeneration: 7, reason: "" }));
  });
  it("disables changes for Not ready", () => {
    show({ ready: false });
    openActions();
    expect(screen.getByRole("menuitem", { name: "protectionMode.change" }).getAttribute("aria-disabled")).toBe("true");
  });
  it("keeps rollout details on demand and retries rollout from Actions", async () => {
    show({ mode: "monitor", status: "failed", applied: 0 });
    expect(screen.queryByRole("region", { name: "protectionMode.title" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "protectionMode.details" }));
    const panel = screen.getByRole("dialog", { name: "protectionMode.details" });
    expect(within(panel).queryByRole("radio")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "common.close" }).at(-1)!);
    openModeMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "protectionMode.retry" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("g", { mode: "monitor", expectedGeneration: 7, reason: "" }));
  });
  it("shows retry failures outside the menu", async () => {
    mocks.update.mockRejectedValue(new Error("Runner mode conflict"));
    show({ mode: "bypass", appliedMode: "enforce", status: "failed" });
    openModeMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "protectionMode.retry" }));
    await screen.findByText("Runner mode conflict");
    expect(screen.getByRole("button", { name: "resourceList.refresh" })).toBeTruthy();
  });
  it("lets viewers inspect but not change the mode", () => {
    mocks.role = "viewer"; show({ mode: "bypass", appliedMode: "bypass" });
    expect(screen.getByText("bypass")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Actions" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "protectionMode.change" })).toBeNull();
  });
});
