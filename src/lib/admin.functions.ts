import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { usernameToEmail, normalizeUsername, isValidUsername } from "@/lib/username";

const createSchema = z.object({
  name: z.string().trim().min(1),
  location: z.string().trim().optional().default(""),
  username: z
    .string()
    .trim()
    .min(3)
    .transform(normalizeUsername)
    .refine((value) => isValidUsername(value), {
      message: "Username can only contain letters, numbers, dots, hyphens and underscores (min 3).",
    }),
  password: z.string().min(6),
  language: z.enum(["no", "en"]).default("no"),
  active: z.boolean().default(true),
});

async function assertAdmin(supabase: {
  rpc: (fn: "is_admin") => Promise<{ data: unknown; error: { message: string } | null }>;
}) {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    throw new Error(`Could not verify admin access: ${error.message}`);
  }
  if (data !== true) {
    throw new Error("Not authorized");
  }
}

export const createCustomerAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const username = data.username;

    const { data: taken } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (taken) throw new Error("Username is already taken");

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
    if (customerError || !customer)
      throw new Error(customerError?.message ?? "Could not create customer");

    let userId: string | undefined;
    try {
      const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: usernameToEmail(username),
        password: data.password,
        email_confirm: true,
        user_metadata: {
          username,
          customer_id: customer.id,
          language: data.language,
        },
      });
      if (userError || !created?.user) {
        throw new Error(userError?.message ?? "Could not create login");
      }
      userId = created.user.id;

      const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          username,
          customer_id: customer.id,
          preferred_language: data.language,
        },
        { onConflict: "id" },
      );
      if (profileError) throw new Error(profileError.message);

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "customer" });
      if (roleError && roleError.code !== "23505") {
        throw new Error(roleError.message);
      }

      return { customerId: customer.id, userId };
    } catch (error) {
      if (userId) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      await supabaseAdmin.from("customers").delete().eq("id", customer.id);
      throw error instanceof Error ? error : new Error("Could not create customer");
    }
  });

export const resetCustomerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
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
  .validator((data: unknown) =>
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
    if (userError || !created?.user)
      throw new Error(userError?.message ?? "Could not create admin");

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, username }, { onConflict: "id" });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError.message);
    }
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
