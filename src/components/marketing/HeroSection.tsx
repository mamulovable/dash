import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="container px-4 py-24 md:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
          Chat with Your Data,
          <br />
          Get Interactive Dashboards
        </h1>
        <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
          Transform complex data into actionable insights through natural
          language. Our AI-powered platform makes business intelligence
          accessible to everyone.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button variant="gradient" size="lg" asChild>
            <Link href="/dashboard">Get Started for Free</Link>
          </Button>
          <Button variant="outline" size="lg">
            Watch Demo
          </Button>
        </div>
        <div className="mt-16">
          <div className="relative mx-auto max-w-5xl">
            <div className="aspect-video rounded-lg border bg-muted shadow-2xl">
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Dashboard Mockup Image</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}






