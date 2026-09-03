import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { usernameToEmail, normalizeUsername } from "@/lib/username";

const createSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional().default(""),
  username: z.string().min(3),
  password: z.string().min(6),
  language: z.enum(["no", "en"]).default("no"),
  active: z.boolean().default(true),
});

async function assertAdmin(supabase: {
  rpc: (fn: "is_admin") => Promise<{ data: unknown; error: unknown }>;
}) {
  const { data, error } = await supabase.rpc("is_admin");
  if (error || data !== true) {
    throw new Error("Not authorized");
  }
}

export const createCustomerAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const username = normalizeUsername(data.username);
    const email = usernameToEmail(username);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid username: use letters, numbers, dot or dash — or a full email address.");
    }


    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .insert({
        name: data.name,
        location: data.location || null,
        active: data.active,
        default_language: data.language,
      })
      .select("id")
      .single();
    if (customerError || !customer) throw new Error(customerError?.message ?? "Could not create customer");

    const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (userError || !created.user) {
      await supabaseAdmin.from("customers").delete().eq("id", customer.id);
      throw new Error(userError?.message ?? "Could not create login");
    }

    const userId = created.user.id;
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      username,
      customer_id: customer.id,
      preferred_language: data.language,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("customers").delete().eq("id", customer.id);
      throw new Error(profileError.message);
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "customer" });
    if (roleError) throw new Error(roleError.message);

    return { customerId: customer.id, userId };
  });

export const resetCustomerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(6) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * One-time bootstrap: creates the very first admin account. Refuses to run once
 * an admin exists, so it can never be used as a public signup.
 */
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ username: z.string().min(3), password: z.string().min(6) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) throw new Error("An administrator already exists");

    const username = normalizeUsername(data.username);
    const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(username),
      password: data.password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (userError || !created.user) throw new Error(userError?.message ?? "Could not create admin");

    await supabaseAdmin.from("profiles").insert({ id: created.user.id, username });
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin" });
    if (roleError) throw new Error(roleError.message);
    return { ok: true };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});
