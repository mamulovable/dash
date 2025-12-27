import {
  MessageSquare,
  Layout,
  Network,
  Users,
  FileText,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: MessageSquare,
    title: "Natural Language Query",
    description: "Ask questions in plain English and get instant answers from your data.",
  },
  {
    icon: Layout,
    title: "Real-time Dashboards",
    description: "Visualize your data with interactive, auto-updating dashboards.",
  },
  {
    icon: Network,
    title: "Seamless Integrations",
    description: "Connect to all your data sources with just a few clicks.",
  },
  {
    icon: Users,
    title: "Collaborative Workspaces",
    description: "Share insights and work together with your team in one place.",
  },
  {
    icon: FileText,
    title: "Automated Reporting",
    description: "Schedule and automate reports to be sent directly to your inbox.",
  },
  {
    icon: Shield,
    title: "Enterprise-grade Security",
    description: "Trust your data is protected with our robust security features.",
  },
];

export function FeaturesGrid() {
  return (
    <section className="container px-4 py-24">
      <div className="mx-auto max-w-2xl text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Unlock Insights Effortlessly
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Explore the key benefits of our platform designed to make data
          analysis intuitive and powerful for your entire team.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}









