import Header from "@/components/layout/Header";
import Seo from "@/components/Seo";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

const CalendarView = () => {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  return (
    <div className="min-h-screen bg-background">
      <Seo title="Calendar – GlobeTrotter" description="Visual trip timeline and activity dates." />
      <Header />
      <main className="container py-12">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="page-title mb-6">Calendar View</h1>
          <Calendar mode="single" selected={selected} onSelect={setSelected} className="rounded-md border" />
        </div>
      </main>
    </div>
  );
};

export default CalendarView;


