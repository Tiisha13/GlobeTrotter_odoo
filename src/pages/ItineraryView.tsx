import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { getTrips } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock, 
  Sun, 
  Moon, 
  Star,
  Camera,
  Share,
  FileText,
  Map,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  List,
  Utensils,
  Mountain,
  Eye,
  ShoppingBag,
  Music,
  Palette,
  CloudSun,
  Sunrise,
  Sunset
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trip } from "@/types";

// Enhanced types for the immersive view
interface ViewStop {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  date: string;
  activities: ViewActivity[];
  totalCost: number;
  weather: WeatherInfo;
  heroImage: string;
  dayNumber: number;
}

interface ViewActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'food' | 'adventure' | 'sightseeing' | 'shopping' | 'nightlife' | 'culture';
  cost: number;
  duration: number;
  icon: any;
}

interface WeatherInfo {
  temperature: number;
  condition: string;
  icon: string;
}

// Mock data for the immersive view
const MOCK_ITINERARY_DATA: ViewStop[] = [
  {
    id: '1',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    date: '2024-06-15',
    dayNumber: 1,
    heroImage: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=1200&h=600&fit=crop&q=80',
    weather: { temperature: 22, condition: 'Sunny', icon: '☀️' },
    totalCost: 180,
    activities: [
      {
        id: 'a1',
        title: 'Visit Eiffel Tower',
        description: 'Iconic landmark with stunning city views and photo opportunities',
        time: '09:00',
        type: 'sightseeing',
        cost: 25,
        duration: 120,
        icon: Eye
      },
      {
        id: 'a2',
        title: 'Lunch at Café de Flore',
        description: 'Historic café in Saint-Germain with traditional French cuisine',
        time: '12:30',
        type: 'food',
        cost: 45,
        duration: 90,
        icon: Utensils
      },
      {
        id: 'a3',
        title: 'Seine River Cruise',
        description: 'Romantic boat tour along the Seine with sunset views',
        time: '15:00',
        type: 'sightseeing',
        cost: 15,
        duration: 90,
        icon: Eye
      },
      {
        id: 'a4',
        title: 'Evening at Montmartre',
        description: 'Explore the artistic district and enjoy street performances',
        time: '18:00',
        type: 'culture',
        cost: 35,
        duration: 180,
        icon: Palette
      }
    ]
  },
  {
    id: '2',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    date: '2024-06-18',
    dayNumber: 2,
    heroImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=600&fit=crop&q=80',
    weather: { temperature: 18, condition: 'Cloudy', icon: '☁️' },
    totalCost: 220,
    activities: [
      {
        id: 'b1',
        title: 'Tsukiji Fish Market',
        description: 'Early morning visit to the famous fish market for fresh sushi',
        time: '06:00',
        type: 'food',
        cost: 30,
        duration: 120,
        icon: Utensils
      },
      {
        id: 'b2',
        title: 'Senso-ji Temple',
        description: 'Ancient Buddhist temple in Asakusa district',
        time: '10:00',
        type: 'culture',
        cost: 0,
        duration: 90,
        icon: Palette
      },
      {
        id: 'b3',
        title: 'Shibuya Crossing',
        description: 'Experience the world\'s busiest pedestrian crossing',
        time: '14:00',
        type: 'sightseeing',
        cost: 0,
        duration: 60,
        icon: Eye
      },
      {
        id: 'b4',
        title: 'Harajuku Shopping',
        description: 'Explore unique fashion and pop culture in Harajuku',
        time: '16:00',
        type: 'shopping',
        cost: 80,
        duration: 150,
        icon: ShoppingBag
      },
      {
        id: 'b5',
        title: 'Karaoke Night',
        description: 'Traditional Japanese karaoke experience in Shinjuku',
        time: '20:00',
        type: 'nightlife',
        cost: 25,
        duration: 120,
        icon: Music
      }
    ]
  },
  {
    id: '3',
    city: 'Bali',
    country: 'Indonesia',
    countryCode: 'ID',
    date: '2024-06-21',
    dayNumber: 3,
    heroImage: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=1200&h=600&fit=crop&q=80',
    weather: { temperature: 28, condition: 'Partly Cloudy', icon: '⛅' },
    totalCost: 95,
    activities: [
      {
        id: 'c1',
        title: 'Sunrise at Mount Batur',
        description: 'Early morning hike to watch sunrise from volcanic peak',
        time: '04:00',
        type: 'adventure',
        cost: 45,
        duration: 360,
        icon: Mountain
      },
      {
        id: 'c2',
        title: 'Ubud Rice Terraces',
        description: 'Scenic walk through traditional Balinese rice paddies',
        time: '11:00',
        type: 'sightseeing',
        cost: 10,
        duration: 120,
        icon: Eye
      },
      {
        id: 'c3',
        title: 'Traditional Balinese Lunch',
        description: 'Authentic local cuisine in a village setting',
        time: '13:30',
        type: 'food',
        cost: 15,
        duration: 90,
        icon: Utensils
      },
      {
        id: 'c4',
        title: 'Beach Sunset',
        description: 'Relax at Tanah Lot temple with ocean sunset views',
        time: '17:00',
        type: 'sightseeing',
        cost: 5,
        duration: 120,
        icon: Eye
      }
    ]
  }
];

const ItineraryView = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  
  // State management for the view
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);

  // Get the trip or redirect if invalid
  const trip = useMemo(() => {
    if (!tripId) {
      navigate('/trips');
      return undefined;
    }
    
    const trips = getTrips();
    const foundTrip = trips[tripId];
    
    if (!foundTrip) {
      navigate('/trips');
      return undefined;
    }
    
    return foundTrip;
  }, [tripId, navigate]);

  const totalBudget = MOCK_ITINERARY_DATA.reduce((sum, stop) => sum + stop.totalCost, 0);
  const totalDays = MOCK_ITINERARY_DATA.length;
  const totalCountries = new Set(MOCK_ITINERARY_DATA.map(s => s.country)).size;

  // Activity type colors
  const getActivityColor = (type: string) => {
    const colors = {
      food: 'bg-yellow-500',
      adventure: 'bg-green-500',
      sightseeing: 'bg-blue-500',
      shopping: 'bg-pink-500',
      nightlife: 'bg-orange-500',
      culture: 'bg-purple-500'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  const getTimeIcon = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 6) return Star;
    if (hour < 12) return Sunrise;
    if (hour < 18) return Sun;
    return Sunset;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Sticky Trip Summary Bar */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {trip?.name || 'My Dream Trip'}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{totalDays} Days</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{totalCountries} Countries</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>${totalBudget}</span>
                  </div>
                </div>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('timeline')}
                  className="rounded-md"
                >
                  <List className="h-4 w-4 mr-1" />
                  Timeline
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="rounded-md"
                >
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  Calendar
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMapOpen(!isMapOpen)}
              >
                <Map className="h-4 w-4 mr-2" />
                {isMapOpen ? 'Hide Map' : 'Show Map'}
              </Button>
              
              <Button variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Add Photos
              </Button>
              
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8">
        {/* Collapsible Map Panel */}
        <AnimatePresence>
          {isMapOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 300 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="h-72 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }}></div>
                    
                    {/* Animated Travel Route */}
                    <div className="relative z-10 flex items-center justify-center gap-8">
                      {MOCK_ITINERARY_DATA.map((stop, index) => (
                        <motion.div
                          key={stop.id}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.2 }}
                          className="flex flex-col items-center"
                        >
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center border-4 border-blue-500">
                              <img
                                src={`https://flagcdn.com/32x24/${stop.countryCode.toLowerCase()}.png`}
                                alt={stop.country}
                                className="rounded"
                              />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {stop.dayNumber}
                            </div>
                          </div>
                          <div className="mt-2 text-center">
                            <div className="font-semibold text-sm">{stop.city}</div>
                            <div className="text-xs text-gray-500">{stop.country}</div>
                          </div>
                          
                          {index < MOCK_ITINERARY_DATA.length - 1 && (
                            <motion.div
                              className="absolute top-8 left-20 w-8 h-0.5 bg-blue-300"
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ delay: (index + 1) * 0.2 }}
                            />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="space-y-8">
            {MOCK_ITINERARY_DATA.map((stop, index) => (
              <motion.div
                key={stop.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
                  {/* Hero Image Banner */}
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={stop.heroImage}
                      alt={stop.city}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* Day Number Badge */}
                    <div className="absolute top-6 left-6">
                      <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                        <div className="text-center">
                          <div className="text-xs font-medium text-gray-600">DAY</div>
                          <div className="text-xl font-bold text-gray-900">{stop.dayNumber}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* City Info */}
                    <div className="absolute bottom-6 left-6 text-white">
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={`https://flagcdn.com/32x24/${stop.countryCode.toLowerCase()}.png`}
                          alt={stop.country}
                          className="rounded shadow-sm"
                        />
                        <div>
                          <h2 className="text-3xl font-bold">{stop.city}</h2>
                          <p className="text-lg opacity-90">{stop.country}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(stop.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CloudSun className="h-4 w-4" />
                          <span>{stop.weather.temperature}°C</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>${stop.totalCost}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-8">
                    {/* Activities Timeline */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold mb-6">Daily Activities</h3>
                      
                      <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500"></div>
                        
                        <div className="space-y-6">
                          {stop.activities.map((activity, activityIndex) => {
                            const TimeIcon = getTimeIcon(activity.time);
                            const ActivityIcon = activity.icon;
                            
                            return (
                              <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: activityIndex * 0.1 }}
                                className={cn(
                                  "relative pl-16 pr-4 py-4 rounded-xl transition-all duration-200",
                                  hoveredActivity === activity.id 
                                    ? "bg-blue-50 shadow-md scale-[1.02]" 
                                    : "hover:bg-gray-50"
                                )}
                                onMouseEnter={() => setHoveredActivity(activity.id)}
                                onMouseLeave={() => setHoveredActivity(null)}
                              >
                                {/* Timeline Dot */}
                                <div className="absolute left-4 top-6 w-4 h-4 bg-white border-4 border-blue-500 rounded-full shadow-sm"></div>
                                
                                {/* Time Badge */}
                                <div className="absolute left-0 top-4 w-12 flex flex-col items-center">
                                  <TimeIcon className="h-4 w-4 text-gray-400 mb-1" />
                                  <span className="text-xs font-medium text-gray-600">
                                    {activity.time}
                                  </span>
                                </div>
                                
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-white",
                                        getActivityColor(activity.type)
                                      )}>
                                        <ActivityIcon className="h-4 w-4" />
                                      </div>
                                      
                                      <div>
                                        <h4 className="font-semibold text-gray-900">
                                          {activity.title}
                                        </h4>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                          <Clock className="h-3 w-3" />
                                          <span>{activity.duration} min</span>
                                          <Badge 
                                            variant="outline" 
                                            className={cn(
                                              "text-xs capitalize",
                                              activity.type === 'food' && "border-yellow-200 text-yellow-700",
                                              activity.type === 'sightseeing' && "border-blue-200 text-blue-700",
                                              activity.type === 'adventure' && "border-green-200 text-green-700",
                                              activity.type === 'culture' && "border-purple-200 text-purple-700",
                                              activity.type === 'shopping' && "border-pink-200 text-pink-700",
                                              activity.type === 'nightlife' && "border-orange-200 text-orange-700"
                                            )}
                                          >
                                            {activity.type}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                                      {activity.description}
                                    </p>
                                    
                                    {/* Photo Memories Slot */}
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                      <Camera className="h-3 w-3" />
                                      <span>Add your photos from this activity</span>
                                    </div>
                                  </div>
                                  
                                  <div className="ml-4 text-right">
                                    <div className="text-lg font-bold text-green-600">
                                      ${activity.cost}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      per person
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_ITINERARY_DATA.map((stop, index) => (
              <motion.div
                key={stop.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden hover:shadow-2xl transition-all duration-300">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={stop.heroImage}
                      alt={stop.city}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    <div className="absolute top-4 left-4">
                      <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-900">{stop.dayNumber}</span>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-4 left-4 text-white">
                      <h3 className="text-xl font-bold">{stop.city}</h3>
                      <p className="text-sm opacity-90">{stop.country}</p>
                    </div>
                    
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary" className="bg-white/90 text-gray-900">
                        ${stop.totalCost}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(stop.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CloudSun className="h-3 w-3" />
                          <span>{stop.weather.temperature}°C</span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {stop.activities.length} activities planned
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {stop.activities.slice(0, 3).map((activity) => (
                          <div
                            key={activity.id}
                            className={cn(
                              "w-2 h-2 rounded-full",
                              getActivityColor(activity.type)
                            )}
                          />
                        ))}
                        {stop.activities.length > 3 && (
                          <span className="text-xs text-gray-400 ml-1">
                            +{stop.activities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Budget Tracker Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-sm text-gray-600">Total Budget</div>
                <div className="text-2xl font-bold text-gray-900">${totalBudget}</div>
              </div>
              
              <div className="flex-1 max-w-md">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Spent</span>
                  <span>Planned: ${totalBudget}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '75%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  75% of budget allocated
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                Edit Trip
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="sm"
              >
                Book Activities
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryView;
