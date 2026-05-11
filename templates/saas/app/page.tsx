import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-4xl font-bold tracking-tight">Studio Zero SaaS</h1>
      <p className="mt-4 text-lg text-zinc-600">
        Next.js 15 + Supabase + Stripe + Tailwind 4 + Resend. Production-ready scaffold for
        multi-tenant SaaS.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/signup" className="rounded bg-black px-4 py-2 text-white">Sign up</Link>
        <Link href="/login" className="rounded border border-zinc-300 px-4 py-2">Sign in</Link>
      </div>
    </main>
  );
}
