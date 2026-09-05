import type { Metadata } from "next";
import "../styles/globals.css";
import AppShell from "./components/AppShell";

export const metadata: Metadata = { title: "GentleSuite", description: "Agentur-Management System" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);})();` }} />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
