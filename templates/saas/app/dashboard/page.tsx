import { createServerSupabase } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-zinc-600">Signed in as {user?.email ?? "(unknown)"}</p>
      <p className="mt-6 text-sm text-zinc-500">
        Replace this scaffold with your real dashboard. The middleware ensures only authenticated
        users reach this route.
      </p>
    </main>
  );
}
