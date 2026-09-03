import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function AuthPending() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Clock className="size-5 animate-pulse text-muted-foreground" />
    </main>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingComponent: AuthPending,
  pendingMs: 0,
  beforeLoad: async () => {
    // Session lives in the browser (localStorage). Never treat a server-side
    // missing user as logged-out — that bounced /report back to login on the
    // custom portal domain.
    if (typeof window === "undefined") {
      return {};
    }
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      throw redirect({ to: "/" });
    }
    return { user };
  },
  component: () => <Outlet />,
});
