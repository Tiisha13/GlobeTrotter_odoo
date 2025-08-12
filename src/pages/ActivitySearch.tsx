import Header from "@/components/layout/Header";
import Seo from "@/components/Seo";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Activity = { id: string; title: string; tags: string[]; description: string };

const allActivities: Activity[] = [
  { id: "a", title: "Museum Tour", tags: ["culture", "history"], description: "Explore iconic museums with a guided experience." },
  { id: "b", title: "Street Food Crawl", tags: ["food", "local"], description: "Taste the city's best food stalls and hidden gems." },
  { id: "c", title: "Sunset Hike", tags: ["outdoor", "scenic"], description: "Catch breathtaking views on an easy hike." },
  { id: "d", title: "Cooking Class", tags: ["food", "hands-on"], description: "Cook traditional dishes with a local chef." },
];

const ActivitySearch = () => {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const tags = useMemo(() => Array.from(new Set(allActivities.flatMap((a) => a.tags))), []);

  const results = useMemo(() => {
    return allActivities.filter((a) =>
      (!query || a.title.toLowerCase().includes(query.toLowerCase())) && (!tag || a.tags.includes(tag))
    );
  }, [query, tag]);

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Activity Search – GlobeTrotter" description="Browse activities with interest tags and details." />
      <Header />
      <main className="container py-12">
        <h1 className="page-title mb-6">Activity Search</h1>
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search activities..." className="max-w-md" />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTag(null)} className={`text-sm px-2 py-1 rounded-md border ${tag === null ? 'bg-accent' : ''}`}>All</button>
            {tags.map((t) => (
              <button key={t} onClick={() => setTag(t)} className={`text-sm px-2 py-1 rounded-md border ${tag === t ? 'bg-accent' : ''}`}>{t}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((a) => (
            <motion.article key={a.id} whileHover={{ y: -4 }} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="font-poppins text-lg font-semibold">{a.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {a.tags.map((t) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="mt-4 text-primary underline-offset-4 hover:underline text-sm">View details</button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{a.title}</DialogTitle>
                  </DialogHeader>
                  <p className="text-muted-foreground">{a.description}</p>
                </DialogContent>
              </Dialog>
            </motion.article>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ActivitySearch;


