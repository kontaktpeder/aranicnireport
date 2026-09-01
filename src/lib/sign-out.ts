import { supabase } from "@/integrations/supabase/client";

export async function signOutAndReturn() {
  await supabase.auth.signOut();
  window.location.replace("/");
}

export function formatDate(value: string | null | undefined, lang: "no" | "en" = "no") {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(lang === "no" ? "nb-NO" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysSince(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(value).getTime()) / 86_400_000;
}
