import Header from "@/components/layout/Header";
import Seo from "@/components/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const Budget = () => {
  const pieData = useMemo(() => [
    { name: 'Flights', value: 520 },
    { name: 'Stay', value: 380 },
    { name: 'Food', value: 240 },
    { name: 'Activities', value: 180 },
  ], []);

  const barData = useMemo(() => [
    { day: 'Day 1', spend: 160 },
    { day: 'Day 2', spend: 220 },
    { day: 'Day 3', spend: 180 },
  ], []);

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Budget – GlobeTrotter" description="Visualize trip costs and overbudget alerts." />
      <Header />
      <main className="container py-12 grid md:grid-cols-2 gap-6">
        <h1 className="page-title md:col-span-2">Trip Budget & Cost Breakdown</h1>
        <Card>
          <CardHeader>
            <CardTitle className="font-poppins">Cost breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-poppins">Daily spend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Budget;


