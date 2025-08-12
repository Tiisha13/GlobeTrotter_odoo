import Header from "@/components/layout/Header";
import Seo from "@/components/Seo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { getUser, upsertUser } from "@/lib/storage";

const Profile = () => {
  const existing = getUser();
  const [firstName, setFirst] = useState(existing?.firstName ?? "");
  const [lastName, setLast] = useState(existing?.lastName ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Profile – GlobeTrotter" description="Manage your profile and preferences." />
      <Header />
      <main className="container py-12 max-w-2xl">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="page-title mb-6">Profile</h1>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              upsertUser({ id: existing?.id ?? 'user_demo', email, firstName, lastName, createdAt: existing?.createdAt ?? Date.now() });
              alert('Saved');
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="First name" value={firstName} onChange={(e) => setFirst(e.target.value)} />
              <Input placeholder="Last name" value={lastName} onChange={(e) => setLast(e.target.value)} />
            </div>
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="pt-2">
              <Button variant="hero" size="lg" type="submit">Save</Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default Profile;


