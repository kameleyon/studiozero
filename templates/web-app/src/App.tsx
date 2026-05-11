import { Routes, Route, Link } from "react-router-dom";

function Home() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Studio Zero Web App</h1>
      <p className="mt-3 text-zinc-600">
        React 19 + Vite + Supabase + Tailwind 4 + TanStack Query + Zustand.
        Replace this scaffold with your real app.
      </p>
      <div className="mt-6">
        <Link to="/about" className="text-blue-600 underline">
          About
        </Link>
      </div>
    </div>
  );
}

function About() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">About</h1>
      <Link to="/" className="mt-4 inline-block text-blue-600 underline">
        Home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
}
