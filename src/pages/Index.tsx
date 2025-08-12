import Header from "@/components/layout/Header";
import Hero from "@/components/sections/Hero";
import Seo from "@/components/Seo";
import { motion } from "framer-motion";
import { CheckCircle2, Wallet, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const features = [
  { title: "Plan with ease", icon: CheckCircle2, blurb: "Drag-and-drop days, add activities, and stay organized." },
  { title: "Smart budgets", icon: Wallet, blurb: "Track costs automatically and keep trips on budget." },
  { title: "Share instantly", icon: Share2, blurb: "Send a link to friends and plan together in real time." },
];

const Index = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <Seo title="GlobeTrotter – Personalized Travel Planning" description="Plan, budget, and share unforgettable trips with GlobeTrotter." />
      <Header />
      <Hero />

      <main className="container py-16">
        <section className="mb-16">
          <h2 className="font-poppins text-2xl md:text-3xl font-semibold">Everything you need</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl">A focused toolkit that keeps planning simple and delightful.</p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <motion.article
                key={f.title}
                whileHover={{ y: -4, scale: 1.01 }}
                className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <f.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-poppins text-xl font-semibold">{f.title}</h3>
                <p className="text-muted-foreground mt-1">{f.blurb}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="text-center">
          {isAuthenticated ? (
            <Button asChild size="lg" variant="hero">
              <a href="/create-trip">Plan a trip</a>
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <Button asChild size="lg" variant="hero">
                <a href="/signup">Sign up</a>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="/login">Log in</a>
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;
