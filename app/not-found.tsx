import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">404</p>
        <h1>Route not found.</h1>
        <p className="copy">This path does not exist.</p>
        <Link href="/de">
          Back to /de
        </Link>
      </section>
    </main>
  );
}
