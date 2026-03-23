export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#f4f1ea",
        color: "#161616",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "620px",
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
          404 / Shortbox
        </p>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(2rem, 5vw, 2.8rem)", lineHeight: 1.05 }}>
          Diese Route gibt es nicht.
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: "1rem", lineHeight: 1.6, color: "#4f4a40" }}>
          Der angeforderte Pfad passt zu keiner bekannten Shortbox-Seite. Am schnellsten kommst du
          ueber die deutsche oder US-Uebersicht wieder in den Katalog.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <a
            href="/de"
            style={{
              borderRadius: "999px",
              background: "#161616",
              color: "#ffffff",
              padding: "12px 18px",
              fontSize: "0.95rem",
              textDecoration: "none",
            }}
          >
            Zu Shortbox DE
          </a>
          <a
            href="/us"
            style={{
              borderRadius: "999px",
              border: "1px solid #cfc6b6",
              color: "#161616",
              padding: "12px 18px",
              fontSize: "0.95rem",
              textDecoration: "none",
            }}
          >
            Zu Shortbox US
          </a>
        </div>
      </section>
    </main>
  );
}
