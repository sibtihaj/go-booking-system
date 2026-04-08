import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deployment Architecture",
  description:
    "How IB Scheduling is deployed across Supabase, Vercel, and Railway services.",
};

export default function DeploymentArchitectureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

