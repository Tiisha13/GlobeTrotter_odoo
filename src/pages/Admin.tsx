import Header from "@/components/layout/Header";
import Seo from "@/components/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area } from "recharts";

const Admin = () => {
  const engagement = [
    { day: 'Mon', users: 20 },
    { day: 'Tue', users: 40 },
    { day: 'Wed', users: 32 },
    { day: 'Thu', users: 54 },
    { day: 'Fri', users: 60 },
  ];

  const popular = [
    { name: 'Paris', score: 96 },
    { name: 'Tokyo', score: 98 },
    { name: 'Bali', score: 90 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Admin – GlobeTrotter" description="Analytics overview for demo purposes." />
      <Header />
      <main className="container py-12 grid md:grid-cols-2 gap-6">
        <h1 className="page-title md:col-span-2">Admin Analytics</h1>
        <Card>
          <CardHeader>
            <CardTitle className="font-poppins">User engagement</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engagement}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-poppins">Popular cities score</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={popular}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--secondary))" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;


