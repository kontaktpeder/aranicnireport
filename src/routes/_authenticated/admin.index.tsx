import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/sign-out";
import { statusToken, useAdminOverview } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Gold of Sicily admin" },
      {
        name: "description",
        content: "Sales demand, customer stock, feedback and production planning at a glance.",
      },
      { property: "og:title", content: "Dashboard — Gold of Sicily admin" },
      {
        property: "og:description",
        content: "Sales demand, customer stock and production planning at a glance.",
      },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { t, lang } = useI18n();
  const { data } = useAdminOverview();
  const metrics = data?.metrics;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16">
      <h1 className="pt-8 text-3xl font-semibold">{t("dashboard")}</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label={t("sold_this_week")} value={metrics?.soldThisWeek ?? 0} />
        <Metric label={t("stock_at_customers")} value={metrics?.currentStock ?? 0} />
        <Metric label={t("requested_next")} value={metrics?.requestedNext ?? 0} />
        <Metric label={t("awaiting_report")} value={metrics?.awaiting ?? 0} plain />
      </div>

      <h2 className="eyebrow mt-10">{t("customers")}</h2>
      <div className="mt-3 space-y-3">
        {(data?.rows ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("no_customers")}</p>
        ) : (
          data?.rows.map((row) => (
            <Link
              key={row.id}
              to="/admin/customers/$customerId"
              params={{ customerId: row.id }}
              className="surface-card flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <span className={`size-3 shrink-0 rounded-full ${statusToken(row.status)}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {row.name}
                  {!row.active ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({t("inactive")})
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("last_report")}: {row.lastReportAt ? formatDate(row.lastReportAt, lang) : t("never")}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span>
                    {t("sold")}: <strong className="tabular-nums">{row.soldThisWeek}</strong>
                  </span>
                  <span>
                    {t("current_stock")}: <strong className="tabular-nums">{row.currentStock}</strong>
                  </span>
                  <span>
                    {t("next_requirement")}:{" "}
                    <strong className="tabular-nums">{row.nextRequirement ?? "—"}</strong>
                  </span>
                  {row.needsReview ? (
                    <span className="flex items-center gap-1 text-warning-foreground">
                      <AlertTriangle className="size-3" /> {t("needs_review")}
                    </span>
                  ) : null}
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))
        )}
      </div>
    </main>
  );
}

function Metric({ label, value, plain }: { label: string; value: number; plain?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="surface-card p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">
        {value}
        {plain ? null : <span className="ml-1 text-xs font-normal">{t("pcs")}</span>}
      </p>
    </div>
  );
}
