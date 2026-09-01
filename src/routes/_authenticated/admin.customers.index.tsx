import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { statusToken, useAdminOverview } from "@/lib/admin-data";
import { createCustomerAccount } from "@/lib/admin.functions";
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
  const { data } = useAdminOverview();
  const queryClient = useQueryClient();
  const create = useServerFn(createCustomerAccount);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState<"no" | "en">("no");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || username.trim().length < 3 || password.length < 6) {
      toast.error("Name, username (min 3) and password (min 6) are required.");
      return;
    }
    setBusy(true);
    try {
      await create({
        data: { name, location, username, password, language, active: true },
      });
      toast.success(`${name} created`);
      setOpen(false);
      setName("");
      setLocation("");
      setUsername("");
      setPassword("");
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create customer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16">
      <div className="flex items-center justify-between pt-8">
        <h1 className="text-3xl font-semibold">{t("customers")}</h1>
        <button
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" />
          {t("new_customer")}
        </button>
      </div>

      {open ? (
        <div className="surface-card mt-5 space-y-4 p-5">
          <TextField label={t("customer_name")} value={name} onChange={setName} />
          <TextField label={t("location")} value={location} onChange={setLocation} />
          <TextField label={t("username")} value={username} onChange={setUsername} />
          <TextField label={t("password")} value={password} onChange={setPassword} />
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
          <PrimaryButton onClick={submit} disabled={busy}>
            {busy ? "…" : t("create")}
          </PrimaryButton>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {(data?.rows ?? []).length === 0 ? (
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
