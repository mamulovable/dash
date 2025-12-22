import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter Plan",
    price: "$149",
    period: "/mo",
    description: "For small teams and startups.",
    features: [
      "5 users included",
      "2 data sources",
      "Basic dashboards",
      "Email support",
    ],
  },
  {
    name: "Pro Plan",
    price: "$299",
    period: "/mo",
    description: "For growing businesses.",
    popular: true,
    features: [
      "20 users included",
      "10 data sources",
      "Advanced dashboards & AI",
      "Priority email & chat support",
      "API Access",
    ],
  },
  {
    name: "Agency Plan",
    price: "$499",
    period: "/mo",
    description: "For large scale deployments.",
    features: [
      "Unlimited users",
      "Unlimited data sources",
      "White-labeling & SSO",
      "Dedicated support manager",
    ],
  },
];

export function PricingPreview() {
  return (
    <section className="container px-4 py-24">
      <div className="mx-auto max-w-2xl text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Simple, Transparent Pricing
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose the plan that&apos;s right for your business. No hidden fees, cancel
          anytime.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${
              plan.popular ? "border-indigo-500 shadow-lg" : ""
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
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
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
    </section>
  );
}






