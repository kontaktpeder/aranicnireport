import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/sign-out";
import { resetCustomerPassword } from "@/lib/admin.functions";
import { PrimaryButton, TextField } from "@/components/field";

export const Route = createFileRoute("/_authenticated/admin/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer detail — Gold of Sicily admin" },
      {
        name: "description",
        content: "Stock, sales, feedback, deliveries and account settings for one partner venue.",
      },
      { property: "og:title", content: "Customer detail — Gold of Sicily admin" },
      {
        property: "og:description",
        content: "Stock, sales, feedback, deliveries and account settings for a partner venue.",
      },
    ],
  }),
  component: CustomerDetail,
});

type Tab = "overview" | "reports" | "deliveries" | "account";

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");

  const { data } = useQuery({
    queryKey: ["customer-detail", customerId],
    queryFn: async () => {
      const [customer, reports, deliveries, profile] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId).maybeSingle(),
        supabase
          .from("shift_reports")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("deliveries")
          .select("*")
          .eq("customer_id", customerId)
          .order("delivered_at", { ascending: false })
          .limit(100),
        supabase
          .from("profiles")
          .select("id, username, preferred_language")
          .eq("customer_id", customerId)
          .maybeSingle(),
      ]);
      return {
        customer: customer.data,
        reports: reports.data ?? [],
        deliveries: deliveries.data ?? [],
        profile: profile.data,
      };
    },
  });

  const latest = data?.reports[0] ?? null;
  const weekStart = (() => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - day);
    return monday.toISOString();
  })();
  const soldThisWeek = (data?.reports ?? [])
    .filter((report) => report.created_at >= weekStart)
    .reduce((sum, report) => sum + report.sold_this_shift, 0);
  const deliveredSince = (data?.deliveries ?? [])
    .filter((delivery) => !latest || delivery.created_at > latest.created_at)
    .reduce((sum, delivery) => sum + delivery.quantity, 0);
  const estimated = (latest?.remaining_stock ?? 0) + deliveredSince;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16">
      <div className="pt-6">
        <Link
          to="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" /> {t("customers")}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">{data?.customer?.name ?? "—"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.customer?.location ?? "—"} ·{" "}
          {data?.customer?.active ? t("active") : t("inactive")}
        </p>
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto">
        {(["overview", "reports", "deliveries", "account"] as Tab[]).map((option) => (
          <button
            key={option}
            onClick={() => setTab(option)}
            className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${
              tab === option
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(option === "reports" ? "reports" : option === "deliveries" ? "deliveries" : option)}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Info label={t("est_stock")} value={`${estimated} ${t("pcs")}`} />
          <Info label={t("stock")} value={`${latest?.remaining_stock ?? 0} ${t("pcs")}`} />
          <Info label={t("sales_this_week")} value={`${soldThisWeek} ${t("pcs")}`} />
          <Info
            label={t("latest_feedback")}
            value={latest?.guest_feedback_rating ? t(latest.guest_feedback_rating) : t("none")}
            detail={latest?.guest_feedback_text ?? undefined}
          />
          <Info
            label={t("latest_prep_issue")}
            value={latest?.preparation_issue ? t("yes") : t("none")}
            detail={latest?.preparation_issue_text ?? undefined}
          />
          <Info
            label={t("requested_next")}
            value={`${latest?.next_required_quantity ?? 0} ${t("pcs")}`}
          />
          <Info
            label={t("last_report")}
            value={latest ? formatDate(latest.created_at, lang) : t("never")}
          />
        </div>
      ) : null}

      {tab === "reports" ? (
        <div className="mt-5 space-y-3">
          {(data?.reports ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("history_empty")}</p>
          ) : (
            data?.reports.map((report) => (
              <article key={report.id} className="surface-card p-4">
                <div className="flex items-baseline justify-between">
                  <p className="font-medium">{formatDate(report.created_at, lang)}</p>
                  {report.guest_feedback_rating ? (
                    <span className="text-xs text-muted-foreground">
                      {t(report.guest_feedback_rating)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span>
                    {t("sold")}: <strong className="tabular-nums">{report.sold_this_shift}</strong>
                  </span>
                  <span>
                    {t("stock")}: <strong className="tabular-nums">{report.remaining_stock}</strong>
                  </span>
                  <span>
                    {t("next_need")}:{" "}
                    <strong className="tabular-nums">{report.next_required_quantity ?? "—"}</strong>
                  </span>
                </div>
                {report.needs_review ? (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning/15 px-3 py-2 text-xs">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      <strong>{t("needs_review")}.</strong> {report.review_note}
                    </span>
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      ) : null}

      {tab === "deliveries" ? (
        <div className="mt-5 space-y-3">
          {(data?.deliveries ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("history_empty")}</p>
          ) : (
            data?.deliveries.map((delivery) => (
              <article
                key={delivery.id}
                className="surface-card flex items-center justify-between p-4"
              >
                <div>
                  <p className="font-medium">{formatDate(delivery.delivered_at, lang)}</p>
                  {delivery.note ? (
                    <p className="text-xs text-muted-foreground">{delivery.note}</p>
                  ) : null}
                </div>
                <p className="text-lg font-semibold tabular-nums">
                  {delivery.quantity} <span className="text-xs font-normal">{t("pcs")}</span>
                </p>
              </article>
            ))
          )}
        </div>
      ) : null}

      {tab === "account" && data?.customer ? (
        <AccountTab
          customer={data.customer}
          profile={data.profile ?? null}
          onSaved={() => queryClient.invalidateQueries()}
        />
      ) : null}
    </main>
  );
}

function Info({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="surface-card p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">“{detail}”</p> : null}
    </div>
  );
}

function AccountTab({
  customer,
  profile,
  onSaved,
}: {
  customer: { id: string; name: string; location: string | null; active: boolean; default_language: string };
  profile: { id: string; username: string; preferred_language: string } | null;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const resetPassword = useServerFn(resetCustomerPassword);
  const [name, setName] = useState(customer.name);
  const [location, setLocation] = useState(customer.location ?? "");
  const [active, setActive] = useState(customer.active);
  const [language, setLanguage] = useState<"no" | "en">(
    customer.default_language === "en" ? "en" : "no",
  );
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(customer.name);
    setLocation(customer.location ?? "");
    setActive(customer.active);
  }, [customer]);

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("customers")
      .update({
        name,
        location: location.trim() || null,
        active,
        default_language: language,
      })
      .eq("id", customer.id);
    if (!error && profile) {
      await supabase
        .from("profiles")
        .update({ preferred_language: language })
        .eq("id", profile.id);
    }
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("save"));
    onSaved();
  }

  async function changePassword() {
    if (!profile || password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword({ data: { userId: profile.id, password } });
      toast.success(t("reset_password"));
      setPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="surface-card space-y-4 p-5">
        <TextField label={t("customer_name")} value={name} onChange={setName} />
        <TextField label={t("location")} value={location} onChange={setLocation} />
        <div>
          <span className="eyebrow mb-2 block">{t("language")}</span>
          <div className="flex gap-2">
            {(["no", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLanguage(option)}
                className={`rounded-full px-4 py-2 text-sm font-semibold uppercase ${
                  language === option
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActive((value) => !value)}
          className="flex items-center gap-3 text-sm font-medium"
        >
          <span
            className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
              active ? "bg-success" : "bg-muted"
            }`}
          >
            <span
              className={`size-5 rounded-full bg-card transition-transform ${
                active ? "translate-x-5" : ""
              }`}
            />
          </span>
          {active ? t("active") : t("inactive")}
        </button>
        <PrimaryButton onClick={save} disabled={busy}>
          {t("save")}
        </PrimaryButton>
      </div>

      <div className="surface-card space-y-4 p-5">
        <div>
          <span className="eyebrow block">{t("username")}</span>
          <p className="mt-1 text-lg font-semibold">{profile?.username ?? "—"}</p>
        </div>
        <TextField label={t("new_password")} value={password} onChange={setPassword} />
        <PrimaryButton onClick={changePassword} disabled={busy || !profile}>
          {t("reset_password")}
        </PrimaryButton>
      </div>
    </div>
  );
}
