import { draftStateKey, hasUnpublishedDraft } from "@/lib/guardrail-draft-state";
import { GuardrailRowActions } from "./guardrail-row-actions";
import { Link } from "@tanstack/react-router";
import { Info, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StateBadge } from "@/components/product-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { formatCost } from "./model-pricing";
import type { Guardrail } from "@/lib/api";

export function GuardrailRegistry({
  guardrails,
  onOpen,
}: {
  guardrails: Guardrail[];
  onOpen: (guardrailId: string) => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <Table className="resource-table resource-guardrail-table table-fixed" aria-label={t("pages.guardrails.title")}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="resource-name-column">{t("guardrails.guardrail")}</TableHead>
            <TableHead className="resource-protection-column"><ColumnHelp label={t("guardrails.registryReadiness")} help={t("guardrails.registryReadinessHelp")} /></TableHead>
            <TableHead className="resource-cost-column"><ColumnHelp label={t("modelPricing.monthlyCost")} help={t("modelPricing.monthlyCostHelp")} /></TableHead>
            <TableHead className="resource-traffic-column"><ColumnHelp label={t("guardrails.registryTraffic")} help={t("guardrails.registryTrafficHelp")} /></TableHead>
            <TableHead className="resource-updated-column">{t("guardrails.updated")}</TableHead>
            <TableHead className="resource-actions-column"><span className="sr-only">{t("common.actions")}</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guardrails.map((guardrail) => (
            <TableRow
              key={guardrail.id}
              className="resource-row"
              onClick={() => onOpen(guardrail.id)}
            >
              <TableCell className="min-w-0">
                <Link
                  to="/guardrails/$guardrailId"
                  params={{ guardrailId: guardrail.id }}
                  aria-label={t("guardrails.openNamedGuardrail", { name: guardrail.name })}
                  className="resource-name"
                  onClick={(event) => event.stopPropagation()}
                >
                  <ShieldCheck aria-hidden="true" />
                  <span>{guardrail.name}</span>
                </Link>
                <code className="resource-secondary" title={guardrail.id}>{guardrail.id}</code>
                <p className="resource-lifecycle">{hasUnpublishedDraft(guardrail) ? <>{t(guardrail.version_summary?.released ? "guardrails.unpublishedChanges" : "resourceList.draftOnly")} · {t(draftStateKey(guardrail))}</> : t(guardrail.traffic_versions?.length ? "resourceList.routed" : "resourceList.releasedUnrouted")}</p>
              </TableCell>
              <TableCell><StateBadge state={guardrail.status} />
                {guardrail.status !== "not_ready" && guardrail.protection && guardrail.protection.status !== "applied" ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{t(`protectionMode.states.${guardrail.protection.status}`)} · {t("protectionMode.switching", { mode: t(`states.${guardrail.protection.mode}`) })} · {t("protectionMode.progress", guardrail.protection)}</p> : null}
              </TableCell>
              <TableCell>
                <Link to="/guardrails/$guardrailId" params={{ guardrailId: guardrail.id }} search={{ tab: "usage" }}
                  onClick={event => event.stopPropagation()} className="inline-flex min-h-11 items-center font-mono text-sm text-primary hover:underline"
                  aria-label={t("modelPricing.openCosts", { name: guardrail.name })}>
                  {guardrail.monthly_cost ? guardrail.monthly_cost.cost === null ? t("modelPricing.unpriced") : formatCost(guardrail.monthly_cost.cost, "USD", i18n.language) : "—"}
                </Link>
                {Boolean(guardrail.monthly_cost?.unpriced) && <p className="text-xs text-muted-foreground">{t("modelPricing.incomplete", { count: guardrail.monthly_cost!.unpriced })}</p>}
              </TableCell>
              <TableCell>
                {guardrail.traffic_versions?.length ? <div className="space-y-3 py-2">{guardrail.traffic_versions.map(target => <div key={target.version}>
                  <Link to="/guardrails/$guardrailId" params={{ guardrailId: guardrail.id }} search={{ tab: "immutable", version: target.version }}
                    onClick={event => event.stopPropagation()} className="inline-flex min-h-8 items-center font-mono text-xs text-primary hover:underline">{target.version}</Link>
                  {target.baseline ? <p className="text-xs text-muted-foreground">{t("guardrailPackage.baselineCurrent")}</p> : null}
                  {target.routers.map(router => <div key={router.id} className="flex min-w-0">
                    <Link to="/integration/routers/$routerId" params={{ routerId: router.id }} onClick={event => event.stopPropagation()}
                      title={router.name} className="inline-flex min-h-8 min-w-0 items-center text-xs text-primary hover:underline"><span className="truncate">{router.name}</span></Link>
                  </div>)}
                </div>)}</div> : <span className="text-xs text-muted-foreground">{t("guardrails.registryUnrouted")}</span>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(guardrail.updated_at).toLocaleString(i18n.language)}
              </TableCell>
              <TableCell className="resource-actions-column" onClick={event => event.stopPropagation()}><GuardrailRowActions guardrail={guardrail} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
  );
}

function ColumnHelp({ label, help }: { label: string; help: string }) {
  return <Tooltip><TooltipTrigger asChild><button type="button" className="inline-flex min-h-11 items-center gap-1 text-left" aria-label={label}>
    {label}<Info className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
  </button></TooltipTrigger><TooltipContent className="max-w-80 text-left leading-5">{help}</TooltipContent></Tooltip>;
}
