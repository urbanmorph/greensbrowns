import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Leaf, Truck, Recycle, ShieldCheck, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-2xl font-bold">
            <span className="text-forest">Greens</span>
            <span className="text-soil">Browns</span>
          </span>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Leaf className="h-4 w-4" />
          Bengaluru&apos;s Green Waste Marketplace
        </div>
        <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Turn Leafy Waste Into{" "}
          <span className="text-primary">Valuable Compost</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          GreensBrowns connects bulk waste generators, licensed collectors, and
          farmers in a transparent circular marketplace. Schedule pickups, track
          waste, and ensure compliance — all in one platform.
        </p>
        <div className="mt-8 flex gap-4">
          <Button size="lg" asChild>
            <Link href="/register">
              Start Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-card py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">How It Works</h2>
          <p className="mt-4 text-center text-muted-foreground">
            A seamless three-step process from waste to compost
          </p>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Truck,
                title: "Schedule Pickup",
                description:
                  "Apartments and tech parks schedule regular green waste pickups with transparent pricing.",
              },
              {
                icon: Recycle,
                title: "Track & Collect",
                description:
                  "Licensed collectors pick up waste with real-time tracking, weight verification, and photo proof.",
              },
              {
                icon: Leaf,
                title: "Deliver to Farms",
                description:
                  "Fresh green waste is delivered directly to farmers for composting, closing the circular loop.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">Built for Everyone</h2>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "🏢",
                title: "Bulk Waste Generators",
                description:
                  "Apartments, RWAs, and Tech Parks. Schedule pickups, track compliance, manage subscriptions.",
              },
              {
                icon: "🚛",
                title: "Collectors",
                description:
                  "Licensed waste collectors. Manage routes, update pickups in real-time, earn per collection.",
              },
              {
                icon: "🌾",
                title: "Farmers",
                description:
                  "Receive quality green waste for composting. Track deliveries and build inventory.",
              },
              {
                icon: "🛡️",
                title: "Administrators",
                description:
                  "Platform oversight, user management, compliance reporting, and analytics.",
              },
            ].map((role) => (
              <div
                key={role.title}
                className="rounded-lg border bg-card p-6"
              >
                <span className="text-3xl">{role.icon}</span>
                <h3 className="mt-3 font-semibold">{role.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {role.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground">
            Ready to Go Green?
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Join Bengaluru&apos;s growing circular waste management network.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-8"
            asChild
          >
            <Link href="/register">
              Create Your Account <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} GreensBrowns. Built for
            Bengaluru&apos;s green future.
          </p>
        </div>
      </footer>
    </div>
  );
}
