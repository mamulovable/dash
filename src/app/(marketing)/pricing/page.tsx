import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter Plan",
    price: "$149",
    period: "/mo",
    badge: "Lifetime Access",
    description: "For small teams and startups.",
    features: [
      "50 queries/month",
      "5 data sources",
      "1 user",
      "All future updates",
    ],
  },
  {
    name: "Pro Plan",
    price: "$299",
    period: "/mo",
    badge: "Lifetime Access",
    description: "For growing businesses.",
    popular: true,
    features: [
      "150 queries/month",
      "15 data sources",
      "5 users",
      "Team collaboration",
      "All future updates",
    ],
  },
  {
    name: "Agency Plan",
    price: "$499",
    period: "/mo",
    badge: "Lifetime Access",
    description: "For large scale deployments.",
    features: [
      "300 queries/month",
      "Unlimited data sources",
      "Unlimited users",
      "White-labeling & SSO",
      "All future updates",
    ],
  },
];

export default function PricingPage() {
  return (
    <>
      <MarketingHeader />
      <div className="container px-4 py-24">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground">
            Choose the plan that&apos;s right for your business. No hidden fees, cancel
            anytime.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular ? "border-indigo-500 shadow-lg scale-105" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white">
                    MOST POPULAR
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {plan.badge}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant={plan.popular ? "gradient" : "outline"}
                  className="w-full"
                >
                  Choose Plan
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}






