import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="text-center px-6">
        <p className="kicker mb-3">404</p>
        <h1 className="text-h1 font-display">Sidan hittades inte</h1>
        <p className="mt-3 text-body text-ink-70">Länken kan ha flyttats eller skrivits fel.</p>
        <Link href="/" className="btn-primary mt-8 inline-flex">
          Till startsidan
        </Link>
      </div>
    </div>
  );
}
