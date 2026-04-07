"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { Calendar, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ShowcaseAccordion } from "@/components/showcase/showcase-accordion";
import { homeShowcaseSections } from "@/content/showcase";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none dark:bg-emerald-500/10" />
      <div className="absolute top-1/2 -right-48 h-96 w-96 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none dark:bg-cyan-500/10" />

      <SiteHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-12">
        <motion.div 
          initial="initial"
          animate="animate"
          variants={stagger}
          className="flex flex-col gap-16"
        >
          <motion.div variants={fadeInUp} className="space-y-8 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-4 py-1.5 text-xs font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400 dark:border-emerald-500/20">
              <Zap className="h-3 w-3 fill-emerald-600 dark:fill-emerald-400" />
              Engineered for Speed
            </div>
            
            <div className="space-y-4">
              <h1 className="text-6xl font-bold leading-[1.05] sm:text-8xl lg:text-9xl text-emerald-950 dark:text-white">
                Seamless <br />
                <span className="bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-cyan-400 dark:to-emerald-400">Scheduling</span>
              </h1>
              
              <p className="max-w-2xl text-xl leading-relaxed text-muted-foreground sm:text-2xl">
                A high-performance booking engine powered by Go and Next.js. 
                Atomic transactions, real-time availability, and uncompromising security.
              </p>
            </div>

            <div className="flex pt-4">
              <Link 
                href="/book" 
                className={buttonVariants({ size: "lg", className: "h-16 px-10 text-xl font-bold rounded-2xl shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-r from-emerald-600 to-cyan-600 border-0" })}
              >
                Start Booking Now <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
            </div>
          </motion.div>

          <motion.div 
            variants={fadeInUp}
            className="grid gap-6 sm:grid-cols-3"
          >
            {[
              { 
                title: "Atomic Consistency", 
                desc: "Database-level locks prevent double-booking at the source.",
                icon: ShieldCheck,
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-500/5"
              },
              { 
                title: "High Concurrency", 
                desc: "Go's lightweight goroutines handle thousands of simultaneous requests.",
                icon: Zap,
                color: "text-cyan-600 dark:text-cyan-400",
                bg: "bg-cyan-500/5"
              },
              { 
                title: "Real-time Sync", 
                desc: "Instant availability updates across all clients and regions.",
                icon: Calendar,
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-500/5"
              }
            ].map((feature, i) => (
              <div 
                key={i}
                className="group relative overflow-hidden rounded-3xl border border-emerald-500/5 bg-white p-8 transition-all hover:bg-emerald-500/[0.02] hover:border-emerald-500/10 dark:bg-white/[0.02] dark:border-white/5 dark:hover:bg-white/[0.04] dark:hover:border-white/10 shadow-sm hover:shadow-md"
              >
                <div className={`mb-4 inline-flex rounded-2xl p-3 ${feature.bg} ${feature.color}`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-emerald-950 dark:text-white">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeInUp} className="w-full pt-4">
            <ShowcaseAccordion
              title="Architecture & implementation notes"
              description={
                <>
                  Portfolio-oriented breakdown with real paths in this repo. Full walkthrough:{" "}
                  <Link href="/how-it-works" className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-600 dark:text-emerald-400">
                    How it works
                  </Link>{" "}
                  (includes a{" "}
                  <Link
                    href="/how-it-works#system-architecture"
                    className="font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-600 dark:text-emerald-400"
                  >
                    live architecture diagram
                  </Link>
                  ).
                </>
              }
              sections={homeShowcaseSections}
              defaultOpenIds={["stack"]}
            />
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
