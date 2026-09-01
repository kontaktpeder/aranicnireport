import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Clock, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionInfo } from "@/hooks/use-session";
import { useI18n } from "@/lib/i18n";
import { signOutAndReturn } from "@/lib/sign-out";
import { LanguageToggle, Wordmark } from "@/components/brand";
import {
  BigChoice,
  NumberStepper,
  PrimaryButton,
  QuestionCard,
  TextAreaField,
} from "@/components/field";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({
    meta: [
      { title: "60 second shift report — Gold of Sicily" },
      {
        name: "description",
        content:
          "Report your shift: delivery, sales, remaining stock, guest feedback and your next requirement.",
      },
      { property: "og:title", content: "60 second shift report — Gold of Sicily" },
      {
        property: "og:description",
        content: "Report delivery, sales, stock, guest feedback and next requirement.",
      },
    ],
  }),
  component: ReportPage,
});

type Feedback = "positive" | "mixed" | "negative";

function ReportPage() {
  const { t, setLang } = useI18n();
  const navigate = useNavigate();
  const { data: info, isLoading } = useSessionInfo();
  const [languageApplied, setLanguageApplied] = useState(false);

  const [deliveryCorrect, setDeliveryCorrect] = useState<boolean | null>(null);
  const [actualReceived, setActualReceived] = useState<number | "">("");
  const [sold, setSold] = useState<number | "">(0);
  const [remaining, setRemaining] = useState<number | "">(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [prepIssue, setPrepIssue] = useState<boolean | null>(null);
  const [prepText, setPrepText] = useState("");
  const [nextNeed, setNextNeed] = useState<number | "">(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (info?.isAdmin) void navigate({ to: "/admin", replace: true });
  }, [info?.isAdmin, navigate]);

  useEffect(() => {
    if (info && !languageApplied) {
      setLang(info.preferredLanguage);
      setLanguageApplied(true);
    }
  }, [info, languageApplied, setLang]);

  const customerId = info?.customerId ?? null;

  const { data: delivery } = useQuery({
    queryKey: ["latest-delivery", customerId],
    enabled: Boolean(customerId),
    queryFn: async () => {
      const { data } = await supabase
        .from("deliveries")
        .select("id, quantity, delivered_at")
        .eq("customer_id", customerId!)
        .order("delivered_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  async function submit() {
    if (!customerId || !info?.session) return;
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from("shift_reports").insert({
      customer_id: customerId,
      submitted_by: info.session.user.id,
      delivery_id: delivery?.id ?? null,
      delivery_correct: deliveryCorrect,
      actual_quantity_received:
        deliveryCorrect === false && actualReceived !== "" ? actualReceived : null,
      sold_this_shift: sold === "" ? 0 : sold,
      remaining_stock: remaining === "" ? 0 : remaining,
      guest_feedback_rating: feedback,
      guest_feedback_text: feedbackText.trim() || null,
      preparation_issue: prepIssue === true,
      preparation_issue_text: prepIssue === true && prepText.trim() ? prepText.trim() : null,
      next_required_quantity: nextNeed === "" ? null : nextNeed,
    });
    setBusy(false);
    if (insertError) {
      setError(t("submit_error"));
      return;
    }
    setDone(true);
    window.scrollTo({ top: 0 });
  }

  function reset() {
    setDeliveryCorrect(null);
    setActualReceived("");
    setSold(0);
    setRemaining(0);
    setFeedback(null);
    setFeedbackText("");
    setPrepIssue(null);
    setPrepText("");
    setNextNeed(0);
    setDone(false);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Clock className="size-5 animate-pulse text-muted-foreground" />
      </main>
    );
  }

  if (!customerId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <Wordmark size="md" />
        <p className="max-w-xs text-sm text-muted-foreground">{t("no_access")}</p>
        <button onClick={signOutAndReturn} className="text-sm underline underline-offset-4">
          {t("sign_out")}
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-5 py-3">
          <Wordmark size="sm" />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={signOutAndReturn}
              aria-label={t("sign_out")}
              className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg px-5">
        {done ? (
          <section className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-success/12">
              <Check className="size-9 text-success" />
            </div>
            <h1 className="mt-8 text-3xl leading-tight font-semibold">{t("success")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{t("success_sub")}</p>
            <div className="mt-10 flex flex-col items-center gap-4">
              <button
                onClick={reset}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-medium"
              >
                {t("new_report")}
              </button>
              <Link
                to="/history"
                className="text-sm text-muted-foreground underline underline-offset-4"
              >
                {t("history")}
              </Link>
            </div>
          </section>
        ) : (
          <>
            <div className="pt-8 pb-6">
              <h1 className="text-3xl leading-tight font-semibold uppercase">
                {info?.customerName}
              </h1>
              <p className="eyebrow mt-3">{t("report_title")}</p>
            </div>

            <div className="space-y-4">
              <QuestionCard
                step={1}
                label={t("q_delivery")}
                question={
                  delivery
                    ? `${t("delivered_intro_1")} ${delivery.quantity} ${t("delivered_intro_2")} ${t("delivery_correct_q")}`
                    : t("no_delivery")
                }
              >
                {delivery ? (
                  <>
                    <BigChoice<boolean>
                      options={[
                        { value: true, label: t("yes") },
                        { value: false, label: t("no") },
                      ]}
                      value={deliveryCorrect}
                      onChange={(value) => setDeliveryCorrect(value)}
                    />
                    {deliveryCorrect === false ? (
                      <div className="mt-5">
                        <p className="mb-3 text-sm font-medium">{t("actual_received_q")}</p>
                        <NumberStepper
                          value={actualReceived}
                          onChange={setActualReceived}
                          step={10}
                        />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </QuestionCard>

              <QuestionCard step={2} label={t("q_sales")} question={t("sold_q")}>
                <NumberStepper value={sold} onChange={setSold} step={10} />
              </QuestionCard>

              <QuestionCard step={3} label={t("q_stock")} question={t("stock_q")}>
                <NumberStepper value={remaining} onChange={setRemaining} step={10} />
              </QuestionCard>

              <QuestionCard step={4} label={t("q_feedback")} question={t("feedback_q")}>
                <BigChoice<Feedback>
                  options={[
                    { value: "positive", label: t("positive") },
                    { value: "mixed", label: t("mixed") },
                    { value: "negative", label: t("negative") },
                  ]}
                  value={feedback}
                  onChange={setFeedback}
                />
                <div className="mt-5">
                  <p className="mb-2 text-sm font-medium">
                    {t("feedback_text_q")}{" "}
                    <span className="text-xs text-muted-foreground">({t("optional")})</span>
                  </p>
                  <TextAreaField value={feedbackText} onChange={setFeedbackText} />
                </div>
              </QuestionCard>

              <QuestionCard step={5} label={t("q_prep")} question={t("prep_q")}>
                <BigChoice<boolean>
                  options={[
                    { value: true, label: t("yes") },
                    { value: false, label: t("no") },
                  ]}
                  value={prepIssue}
                  onChange={setPrepIssue}
                />
                {prepIssue === true ? (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-medium">{t("prep_text_q")}</p>
                    <TextAreaField value={prepText} onChange={setPrepText} />
                  </div>
                ) : null}
              </QuestionCard>

              <QuestionCard step={6} label={t("q_next")} question={t("next_q")}>
                <NumberStepper value={nextNeed} onChange={setNextNeed} step={50} />
              </QuestionCard>
            </div>

            {error ? (
              <p className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="mt-6">
              <PrimaryButton onClick={submit} disabled={busy}>
                {busy ? t("submitting") : t("submit")}
              </PrimaryButton>
            </div>

            <p className="mt-6 text-center">
              <Link
                to="/history"
                className="text-sm text-muted-foreground underline underline-offset-4"
              >
                {t("history")}
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
