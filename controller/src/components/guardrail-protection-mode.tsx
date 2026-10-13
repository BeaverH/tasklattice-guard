import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { MenuItem, MenuItemDivider } from "@carbon/react";
import { EntitySheet } from "./entity-sheet";
import { ErrorNotice, StateBadge } from "./product-shell";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Textarea } from "./ui/textarea";
import { toast } from "./ui/notifications";
import { useAuth } from "@/lib/auth";
import type { Guardrail } from "@/lib/api";
import { updateGuardrailProtectionMode } from "@/lib/guardrails-api";
import { protectionModes, type ProtectionMode, type ProtectionModeSettings } from "../../shared/protection-mode";

function CurrentModeMarker() {
  return <strong className="text-base font-bold" aria-hidden="true">*</strong>;
}

// Keep mutation controls at the detail-page level so Actions works from every tab.
export function useGuardrailProtectionActions(guardrail: Guardrail | undefined, onChanged: () => Promise<unknown>) {
  const { t } = useTranslation();
  const canEdit = useAuth().user?.role === "admin";
  const settings = guardrail?.protection;
  const menuRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState<ProtectionModeSettings | null>(null);
  const [mode, setMode] = useState<ProtectionMode>("enforce");
  const [reason, setReason] = useState("");
  const mutation = useMutation({
    mutationFn: (input: { mode: ProtectionMode; expectedGeneration: number; reason: string }) => {
      if (!guardrail) throw new Error(t("protectionMode.unavailable"));
      return updateGuardrailProtectionMode(guardrail.id, input);
    },
    onSuccess: async () => { setEditing(null); toast.success(t("protectionMode.submitted")); await onChanged(); },
  });
  const open = (next: ProtectionMode) => { if (settings?.ready && canEdit && !mutation.isPending) { returnFocusRef.current = menuRef.current?.querySelector("button") ?? null; mutation.reset(); setEditing(settings); setMode(next); setReason(""); } };
  const submit = (next: ProtectionMode) => { if (settings?.ready && canEdit && !mutation.isPending) mutation.mutate({ mode: next, expectedGeneration: settings.generation, reason: "" }); };
  const pending = settings && settings.status !== "applied";
  const editable = Boolean(settings?.ready && canEdit);

  return {
    menuRef,
    menuItems: canEdit ? [
      <MenuItem key="change-mode" label={t("protectionMode.change")} aria-label={t("protectionMode.change")} renderIcon={ShieldCheck} disabled={!editable || mutation.isPending}>
        {editable && !mutation.isPending && settings ? <>
          {protectionModes.map(value => {
            const current = value === settings.appliedMode;
            const requested = pending && value === settings.mode && !current;
            const label = `${t(`states.${value}`)}${requested ? ` · ${t("protectionMode.requested")}` : ""}`;
            return <MenuItem key={value} label={label} renderIcon={current ? CurrentModeMarker : undefined} aria-current={current ? "true" : undefined} onClick={() => open(value)} />;
          })}
          {pending ? <><MenuItemDivider /><MenuItem label={t("protectionMode.retry")} renderIcon={RefreshCw} onClick={() => submit(settings.mode)} /></> : null}
        </> : null}
      </MenuItem>,
      <MenuItemDivider key="mode-divider" />,
    ] : null,
    feedback: canEdit ? <>
    {!editing && mutation.error ? <div className="mt-4"><ErrorNotice error={mutation.error} /><Button variant="outline" onClick={() => void onChanged()}>{t("resourceList.refresh")}</Button></div> : null}
    {editing && guardrail ? <EntitySheet open width="md" returnFocusRef={returnFocusRef} closeDisabled={mutation.isPending} onOpenChange={value => { if (!value) setEditing(null); }}
      eyebrow={guardrail.name} title={t("protectionMode.change")} description={t("protectionMode.scope")}
      footer={<><Button variant="outline" disabled={mutation.isPending} onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
        <Button disabled={mutation.isPending || mode === editing.mode || !editable} onClick={() => mutation.mutate({ mode, expectedGeneration: editing.generation, reason })}>
          {mutation.isPending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : null}
          {t(mutation.isPending ? "common.saving" : mode === "bypass" ? "protectionMode.enableBypass" : "protectionMode.apply")}
        </Button></>}>
      <div className="space-y-6">
        <RadioGroup value={mode} onValueChange={value => { setMode(value as ProtectionMode); mutation.reset(); }} orientation="vertical" disabled={mutation.isPending} legendText={t("protectionMode.title")}>
          {protectionModes.map(value => <div key={value} className="flex min-h-11 items-start gap-3 py-3">
            <RadioGroupItem id={`protection-${value}`} value={value} aria-label={t(`states.${value}`)} />
            <div><Label htmlFor={`protection-${value}`}>{t(`states.${value}`)}</Label><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(`protectionMode.descriptions.${value}`)}</p></div>
          </div>)}
        </RadioGroup>
        <div className="space-y-2"><Label htmlFor="protection-reason">{t("protectionMode.reason")}</Label><Textarea id="protection-reason" value={reason} maxLength={500} disabled={mutation.isPending} onChange={event => setReason(event.target.value)} /></div>
        {mutation.error ? <><ErrorNotice error={mutation.error} /><Button variant="outline" disabled={mutation.isPending} onClick={async () => { await onChanged(); setEditing(null); }}>{t("resourceList.refresh")}</Button></> : null}
      </div>
    </EntitySheet> : null}
    </> : null,
  };
}

export function GuardrailProtectionMode({ guardrail }: { guardrail: Guardrail }) {
  const { t, i18n } = useTranslation();
  const settings = guardrail.protection;
  const pending = settings && settings.status !== "applied";
  return <section className="border border-border bg-card p-5" aria-label={t("protectionMode.title")}>
    <div className="space-y-2">
      <h2 className="text-base font-medium">{t("protectionMode.title")}</h2>
      <StateBadge state={guardrail.status} />
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{guardrail.status === "not_ready" ? t("protectionMode.notReady") : t(`protectionMode.descriptions.${guardrail.status}`)}</p>
    </div>
    {settings?.ready ? <div className="mt-4 space-y-2 text-sm">
      <p role="status" className="flex items-center gap-2">
        {pending && settings.status !== "failed" ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
        <span>{t(`protectionMode.states.${settings.status}`)}{pending ? ` · ${t("protectionMode.switching", { mode: t(`states.${settings.mode}`) })}` : ""} · {t("protectionMode.progress", settings)}</span>
      </p>
      {settings.runners.length ? <details><summary className="inline-flex min-h-11 cursor-pointer items-center text-primary">{t("protectionMode.details")}</summary>
        <ul className="divide-y border-y">{settings.runners.map(runner => <li key={runner.runnerId} className="flex items-start justify-between gap-5 py-3">
          <span className="font-mono text-xs">{runner.runnerId}</span><span>{t(`protectionMode.runners.${runner.status}`)}{runner.reason ? ` · ${runner.reason}` : ""}</span>
        </li>)}</ul>
      </details> : null}
      {settings.updatedAt ? <p className="text-xs text-muted-foreground">{t("protectionMode.updated", { time: new Date(settings.updatedAt).toLocaleString(i18n.language), actor: settings.updatedBy ?? t("protectionMode.system") })}</p> : null}
      {settings.reason ? <p className="text-xs text-muted-foreground">{t("protectionMode.reasonValue", { reason: settings.reason })}</p> : null}
    </div> : !settings ? <p className="mt-3 text-sm text-muted-foreground">{t("protectionMode.unavailable")}</p> : null}
  </section>;
}
