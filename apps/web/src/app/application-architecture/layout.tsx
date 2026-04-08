import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Architecture",
  description:
    "How the Next.js app, Supabase Auth, Postgres, and the Go booking API fit together.",
};

export default function ApplicationArchitectureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
