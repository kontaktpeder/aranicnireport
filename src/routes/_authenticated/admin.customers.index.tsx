import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { statusToken, useAdminOverview } from "@/lib/admin-data";
import { createCustomerAccount } from "@/lib/admin.functions";
import { isValidUsername, parseLoginIdentifier } from "@/lib/username";
import { errorMessage } from "@/lib/utils";
import { PrimaryButton, TextField } from "@/components/field";

export const Route = createFileRoute("/_authenticated/admin/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — Gold of Sicily admin" },
      { name: "description", content: "Create and manage Gold of Sicily partner venues." },
      { property: "og:title", content: "Customers — Gold of Sicily admin" },
      { property: "og:description", content: "Create and manage partner venues and their logins." },
    ],
  }),
  component: AdminCustomers,
});

function AdminCustomers() {
  const { t } = useI18n();
  const { data, error: loadError } = useAdminOverview();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const create = useServerFn(createCustomerAccount);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState<"no" | "en">("no");
  const [busy, setBusy] = useState(false);
  const loginPreview = parseLoginIdentifier(username)?.username;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || username.trim().length < 3 || password.length < 6) {
      toast.error(t("create_customer_missing"));
      return;
    }
    if (!isValidUsername(username)) {
      toast.error(t("create_customer_username"));
      return;
    }
    setBusy(true);
    try {
      const created = await create({
        data: { name, location, username, password, language, active: true },
      });
      toast.success(
        `${name.trim()} ${t("create_customer_created")} (${loginPreview ?? username.trim()})`,
      );
      setOpen(false);
      setName("");
      setLocation("");
      setUsername("");
      setPassword("");
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      if (created?.customerId) {
        void navigate({
          to: "/admin/customers/$customerId",
          params: { customerId: created.customerId },
        });
      }
    } catch (error) {
      const message = errorMessage(error, t("create_customer_failed"));
      const lower = message.toLowerCase();
      if (lower.includes("already") || lower.includes("opptatt")) {
        toast.error(t("create_customer_username_taken"));
      } else if (
        lower.includes("weak") ||
        lower.includes("pwned") ||
        lower.includes("easy to guess")
      ) {
        toast.error(t("create_customer_weak_password"));
      } else if (lower.includes("invalid format") || lower.includes("23505")) {
        toast.error(t("create_customer_username"));
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16">
      <div className="flex items-center justify-between pt-8">
        <h1 className="text-3xl font-semibold">{t("customers")}</h1>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" />
          {t("new_customer")}
        </button>
      </div>

      {open ? (
        <form className="surface-card mt-5 space-y-4 p-5" onSubmit={submit}>
          <TextField label={t("customer_name")} value={name} onChange={setName} />
          <TextField label={t("location")} value={location} onChange={setLocation} />
          <div>
            <TextField label={t("username")} value={username} onChange={setUsername} />
            {loginPreview && loginPreview !== username.trim().toLowerCase() ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("create_customer_login_as")}: <strong>{loginPreview}</strong>
              </p>
            ) : null}
          </div>
          <TextField
            label={t("password")}
            value={password}
            onChange={setPassword}
            type="password"
          />
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
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "…" : t("create")}
          </PrimaryButton>
        </form>
      ) : null}

      <div className="mt-6 space-y-3">
        {loadError ? (
          <p className="text-sm text-destructive">
            {errorMessage(loadError, t("create_customer_failed"))}
          </p>
        ) : (data?.rows ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("no_customers")}</p>
        ) : (
          data?.rows.map((row) => (
            <Link
              key={row.id}
              to="/admin/customers/$customerId"
              params={{ customerId: row.id }}
              className="surface-card flex items-center gap-4 p-4"
            >
              <span className={`size-3 shrink-0 rounded-full ${statusToken(row.status)}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.location ?? "—"} · {row.active ? t("active") : t("inactive")}
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
