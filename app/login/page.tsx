import type { Metadata } from "next";
import Login from "@/src/components/Login";
import { createStaticMetadata } from "@/src/lib/routes/metadata";

export const metadata: Metadata = createStaticMetadata(
  "Login",
  "Login für redaktionelle Funktionen und Bearbeitung in Shortbox."
);

export default function LoginPage() {
  return <Login />;
}
