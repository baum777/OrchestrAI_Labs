import "./styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Agent System",
  description: "Consulting-first agent console"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

