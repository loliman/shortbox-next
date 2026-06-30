"use client";

import React from "react";

type GlobalErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function GlobalError({ error }: GlobalErrorProps) {
  React.useEffect(() => {
    console.error("Shortbox global layout error boundary caught:", error);
  }, [error]);

  return (
    <html lang="de">
      <head>
        <title>Fehler | Shortbox</title>
        <style>{`
          :root {
            --bg: #f9fafb;
            --paper: #ffffff;
            --text: #111827;
            --text-sec: #4b5563;
            --divider: #e5e7eb;
            --primary: #000000;
            --primary-hover: #1f2937;
            --primary-text: #ffffff;
            --secondary: #b12c4a;
            --shadow: 0 18px 50px rgba(0,0,0,0.06);
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg: #141413;
              --paper: #1b1b1a;
              --text: #f3f2ef;
              --text-sec: #9d9a94;
              --divider: #2d2b28;
              --primary: #eae6df;
              --primary-hover: #f9f8f6;
              --primary-text: #111827;
              --secondary: #b12c4a;
              --shadow: 0 18px 50px rgba(0,0,0,0.36);
            }
          }
          body {
            margin: 0;
            font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background-color: var(--bg);
            color: var(--text);
            transition: background-color 200ms ease, color 200ms ease;
          }
          .container {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
          }
          .card {
            width: 100%;
            max-width: 540px;
            background-color: var(--paper);
            border: 1px solid var(--divider);
            border-radius: 24px;
            padding: 40px;
            box-shadow: var(--shadow);
            box-sizing: border-box;
            position: relative;
            z-index: 2;
          }
          .logo-container {
            margin-bottom: 32px;
            display: flex;
            justify-content: flex-start;
          }
          .logo-img {
            height: 36px;
          }
          .overline {
            margin: 0 0 12px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--secondary);
          }
          .title {
            font-family: var(--font-outfit), ui-sans-serif, system-ui, sans-serif;
            margin: 0 0 16px;
            font-size: clamp(2rem, 5vw, 2.5rem);
            font-weight: 700;
            line-height: 1.1;
          }
          .text {
            margin: 0;
            font-size: 16px;
            line-height: 1.6;
            color: var(--text-sec);
          }
          .digest {
            font-family: monospace;
            color: var(--text-sec);
            font-size: 13px;
            margin-top: 24px;
            background-color: var(--divider);
            padding: 12px 16px;
            border-radius: 8px;
            display: inline-block;
          }
          .watermark {
            position: absolute;
            right: 0;
            bottom: 0;
            width: 220px;
            height: 220px;
            background-image: url("/background.png");
            background-repeat: no-repeat;
            background-position: right bottom;
            background-size: contain;
            opacity: 0.08;
            z-index: 1;
            pointer-events: none;
          }
          @media (prefers-color-scheme: dark) {
            .watermark {
              filter: invert(1);
              opacity: 0.12;
            }
          }
        `}</style>
      </head>
      <body>
        <main className="container">
          <div className="watermark" />
          <section className="card">
            <div className="logo-container">
              <img src="/Shortbox_Logo.png" alt="Shortbox" className="logo-img" />
            </div>
            <p className="overline">HTTP 500</p>
            <h1 className="title">Interner Fehler</h1>
            <p className="text">
              Ups, da ist was schiefgelaufen... Bitte versuche es später noch einmal oder lade die Seite in deinem Browser neu.
            </p>

            {error?.digest ? (
              <div className="digest">
                Fehler-ID: {error.digest}
              </div>
            ) : null}
          </section>
        </main>
      </body>
    </html>
  );
}
