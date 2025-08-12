import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus, ArrowRight, Plane, MapPin, Calendar } from "lucide-react";
import Seo from "@/components/Seo";
import Header from "@/components/layout/Header";
import { useAuth } from "@/context/AuthContext";

// Types
interface Activity {
  id: number;
  name: string;
  time: string;
  icon: JSX.Element;
}

interface Trip {
  id: number;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  image: string;
  activities: Activity[];
}

interface BudgetData {
  name: string;
  value: number;
  color: string;
}

interface UpcomingActivity {
  id: number;
  trip: string;
  name: string;
  date: string;
  time: string;
}

interface PopularDestination {
  id: number;
  name: string;
  price: number;
  rating: number;
}

// Mock data
const mockTrips: Trip[] = [
  {
    id: 1,
    title: "Summer in Paris",
    destination: "Paris, France",
    startDate: "2023-07-15",
    endDate: "2023-07-22",
    budget: 2500,
    image: "https://images.unsplash.com/photo-1502602897457-9152e030e4e6?w=800&auto=format&fit=crop&q=60",
    activities: [
      { id: 1, name: "Eiffel Tower Visit", time: "10:00 AM", icon: <MapPin className="h-4 w-4" /> },
      { id: 2, name: "Louvre Museum", time: "2:00 PM", icon: <MapPin className="h-4 w-4" /> },
    ],
  },
  {
    id: 2,
    title: "Tokyo Adventure",
    destination: "Tokyo, Japan",
    startDate: "2023-09-01",
    endDate: "2023-09-10",
    budget: 3500,
    image: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=800&auto=format&fit=crop&q=60",
    activities: [
      { id: 1, name: "Shibuya Crossing", time: "9:00 AM", icon: <MapPin className="h-4 w-4" /> },
      { id: 2, name: "Sushi Making Class", time: "1:00 PM", icon: <MapPin className="h-4 w-4" /> },
    ],
  },
];

const popularDestinations: PopularDestination[] = [
  { id: 1, name: "Bali, Indonesia", price: 1200, rating: 4.8 },
  { id: 2, name: "Santorini, Greece", price: 1800, rating: 4.9 },
  { id: 3, name: "Kyoto, Japan", price: 2200, rating: 4.7 },
];

const budgetData: BudgetData[] = [
  { name: 'Flights', value: 1200, color: 'hsl(var(--primary))' },
  { name: 'Hotels', value: 1800, color: 'hsl(var(--secondary))' },
  { name: 'Food', value: 800, color: 'hsl(var(--accent))' },
  { name: 'Activities', value: 600, color: 'hsl(var(--muted-foreground))' },
];

const upcomingActivities: UpcomingActivity[] = [
  { id: 1, trip: "Paris", name: "Eiffel Tower Visit", date: "2023-07-15", time: "10:00 AM" },
  { id: 2, trip: "Tokyo", name: "Sushi Making Class", date: "2023-09-02", time: "1:00 PM" },
  { id: 3, trip: "Paris", name: "Louvre Museum", date: "2023-07-16", time: "2:00 PM" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTrips, setFilteredTrips] = useState(mockTrips);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTrips(mockTrips);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredTrips(
        mockTrips.filter(
          (trip) =>
            trip.title.toLowerCase().includes(query) ||
            trip.destination.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery]);

  const totalBudget = budgetData.reduce((sum, item) => sum + item.value, 0);
  const remainingBudget = 5000 - totalBudget;

  return (
    <div className="min-h-screen bg-background">
      <Seo 
        title="Dashboard – GlobeTrotter" 
        description="Your recent trips, insights, and quick actions." 
      />
      <Header />

      <main className="container py-6 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.firstName || 'Traveler'}
              <span className="ml-2">👋</span>
            </h1>
            <p className="text-muted-foreground">Here's what's happening with your trips</p>
          </div>
          <NavLink to="/create-trip" className="w-full md:w-auto">
            <Button className="w-full md:w-auto" size="lg">
              <Plus className="mr-2 h-4 w-4" /> Plan New Trip
            </Button>
          </NavLink>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search your trips..."
            className="w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* Recent Trips */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Trips</h2>
            <NavLink to="/trips" className="text-sm text-primary hover:underline flex items-center">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </NavLink>
          </div>
          
          {filteredTrips.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTrips.map((trip) => (
                <motion.div 
                  key={trip.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="relative group"
                >
                  <Card className="h-full overflow-hidden transition-all duration-200 group-hover:shadow-lg">
                    <div className="relative h-40 overflow-hidden">
                      <img 
                        src={trip.image} 
                        alt={trip.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-4 text-white">
                        <h3 className="font-semibold text-lg">{trip.title}</h3>
                        <p className="text-sm text-gray-200">{trip.destination}</p>
                      </div>
                      <Badge className="absolute top-3 right-3 bg-white/90 text-foreground hover:bg-white">
                        ${trip.budget}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {trip.activities.slice(0, 2).map((activity) => (
                            <div key={activity.id} className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">
                                {activity.icon}
                              </span>
                              <span className="truncate">{activity.name}</span>
                              <span className="ml-auto text-muted-foreground">{activity.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        View Itinerary <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="mx-auto max-w-md space-y-4">
                  <Plane className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No trips found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery 
                      ? "No trips match your search. Try different keywords."
                      : "You haven't planned any trips yet. Start your adventure!"}
                  </p>
                  <NavLink to="/create-trip" className="inline-block">
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" /> Plan Your First Trip
                    </Button>
                  </NavLink>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Budget Summary */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Budget Summary</CardTitle>
              <CardDescription>Your spending breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budgetData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {budgetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`$${value}`, 'Spent']}
                      labelFormatter={(name) => `${name}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {budgetData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">${item.value}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-3 border-t">
                    <div className="flex items-center justify-between font-medium">
                      <span>Total Spent</span>
                      <span>${totalBudget}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Remaining Budget</span>
                      <span>${remainingBudget}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Activities */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Upcoming Activities</CardTitle>
              <CardDescription>Your scheduled events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{activity.name}</h4>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.trip} • {activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Popular Destinations */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Popular Destinations</CardTitle>
              <CardDescription>Top picks for your next trip</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {popularDestinations.map((destination) => (
                  <div key={destination.id} className="group relative overflow-hidden rounded-lg">
                    <div className="aspect-video bg-muted relative rounded-lg overflow-hidden">
                      <img
                        src={`https://source.unsplash.com/random/400x300/?${destination.name.split(',')[0].toLowerCase()}`}
                        alt={destination.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-4">
                        <h4 className="font-medium text-white">{destination.name}</h4>
                        <div className="flex items-center text-sm text-white/90">
                          <span>⭐ {destination.rating}</span>
                          <span className="mx-2">•</span>
                          <span>From ${destination.price}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full mt-4">
                  Explore More Destinations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
