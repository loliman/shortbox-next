import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <p style={{ margin: "0 0 8px", fontWeight: 700 }}>404</p>
        <h1 style={{ margin: 0, fontSize: "2rem", lineHeight: 1.1 }}>Route not found.</h1>
        <p style={{ margin: "16px 0" }}>This path does not exist.</p>
        <Link href="/de">Back to /de</Link>
      </section>
    </main>
  );
}
