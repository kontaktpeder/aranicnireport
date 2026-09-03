import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { daysSince } from "@/lib/sign-out";

export type CustomerRow = {
  id: string;
  name: string;
  location: string | null;
  active: boolean;
  lastReportAt: string | null;
  soldThisWeek: number;
  currentStock: number;
  nextRequirement: number | null;
  estimatedStock: number;
  prepIssue: boolean;
  needsReview: boolean;
  status: "green" | "orange" | "red";
};

export function startOfWeek() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - day);
  return monday.toISOString();
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const weekStart = startOfWeek();
      const [customersRes, reportsRes, deliveriesRes] = await Promise.all([
        supabase.from("customers").select("*").order("name"),
        supabase
          .from("shift_reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("deliveries")
          .select("*")
          .order("delivered_at", { ascending: false })
          .limit(1000),
      ]);

      if (customersRes.error) throw customersRes.error;

      const customers = customersRes.data ?? [];
      const reports = reportsRes.data ?? [];
      const deliveries = deliveriesRes.data ?? [];

      const rows: CustomerRow[] = customers.map((customer) => {
        const own = reports.filter((r) => r.customer_id === customer.id);
        const latest = own[0] ?? null;
        const soldThisWeek = own
          .filter((r) => r.created_at >= weekStart)
          .reduce((sum, r) => sum + (r.sold_this_shift ?? 0), 0);

        const deliveredSinceReport = latest
          ? deliveries
              .filter((d) => d.customer_id === customer.id && d.created_at > latest.created_at)
              .reduce((sum, d) => sum + d.quantity, 0)
          : deliveries
              .filter((d) => d.customer_id === customer.id)
              .reduce((sum, d) => sum + d.quantity, 0);

        const currentStock = latest?.remaining_stock ?? 0;
        const estimatedStock = currentStock + deliveredSinceReport;
        const age = daysSince(latest?.created_at ?? null);

        let status: CustomerRow["status"] = "green";
        if (!latest || age > 10) status = "red";
        else if (
          age > 6 ||
          latest.preparation_issue ||
          latest.needs_review ||
          estimatedStock <= 20
        )
          status = "orange";

        return {
          id: customer.id,
          name: customer.name,
          location: customer.location,
          active: customer.active,
          lastReportAt: latest?.created_at ?? null,
          soldThisWeek,
          currentStock,
          nextRequirement: latest?.next_required_quantity ?? null,
          estimatedStock,
          prepIssue: Boolean(latest?.preparation_issue),
          needsReview: Boolean(latest?.needs_review),
          status: customer.active ? status : "orange",
        };
      });

      const active = rows.filter((row) => row.active);
      return {
        rows,
        metrics: {
          soldThisWeek: active.reduce((sum, row) => sum + row.soldThisWeek, 0),
          currentStock: active.reduce((sum, row) => sum + row.estimatedStock, 0),
          requestedNext: active.reduce((sum, row) => sum + (row.nextRequirement ?? 0), 0),
          awaiting: active.filter((row) => row.status !== "green").length,
        },
      };
    },
  });
}

export function statusToken(status: CustomerRow["status"]) {
  if (status === "green") return "bg-success";
  if (status === "orange") return "bg-warning";
  return "bg-destructive";
}
