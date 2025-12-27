import Link from "next/link";

const footerLinks = {
  Product: [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "/pricing" },
    { name: "Integrations", href: "#integrations" },
    { name: "Updates", href: "#updates" },
  ],
  Resources: [
    { name: "Docs", href: "#docs" },
    { name: "Blog", href: "#blog" },
    { name: "Case Studies", href: "#case-studies" },
    { name: "API Reference", href: "#api" },
  ],
  Company: [
    { name: "About Us", href: "#about" },
    { name: "Careers", href: "#careers" },
    { name: "Contact Us", href: "#contact" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "#privacy" },
    { name: "Terms of Service", href: "#terms" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container px-4 py-12">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
                D
              </div>
              <span className="text-xl font-bold">DashMind</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 DashMind. All rights reserved.
            </p>
          </div>
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold mb-4">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}









