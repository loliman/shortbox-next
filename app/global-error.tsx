"use client";

import Link from "next/link";

type GlobalErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function GlobalError(props: GlobalErrorProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        margin: 0,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: "#f4f1ea",
        color: "#161616",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "640px",
          background: "#fffdf9",
          border: "1px solid #d8d1c2",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 18px 50px rgba(0,0,0,0.08)",
        }}
      >
        <p
          style={{
            margin: "0 0 12px",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#8b5e34",
          }}
        >
          Shortbox
        </p>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(2rem, 5vw, 2.8rem)", lineHeight: 1.05 }}>
          Etwas ist schiefgelaufen.
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: "1rem", lineHeight: 1.6, color: "#4f4a40" }}>
          Die Seite konnte gerade nicht geladen werden. Du kannst es direkt noch einmal versuchen
          oder zur Startseite zurueckgehen.
        </p>

        {props.error?.digest ? (
          <p style={{ margin: "0 0 24px", fontSize: "0.9rem", color: "#6a6458" }}>
            Fehler-ID: {props.error.digest}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => props.reset()}
            style={{
              border: 0,
              borderRadius: "999px",
              background: "#161616",
              color: "#ffffff",
              padding: "12px 18px",
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
          <Link
            href="/de"
            style={{
              borderRadius: "999px",
              border: "1px solid #cfc6b6",
              color: "#161616",
              padding: "12px 18px",
              fontSize: "0.95rem",
              textDecoration: "none",
            }}
          >
            Zu Shortbox DE
          </Link>
        </div>
      </section>
    </main>
  );
}
