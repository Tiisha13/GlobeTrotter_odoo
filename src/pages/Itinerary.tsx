import Header from "@/components/layout/Header";
import Seo from "@/components/Seo";
import { Reorder, motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useParams, useNavigate } from "react-router-dom";
import { getTrips, upsertTrip } from "@/lib/storage";
import { 
  Plus, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Edit3, 
  Sun, 
  Moon, 
  Plane, 
  Clock,
  Sparkles,
  Flag,
  CloudSun,
  TrendingUp,
  Camera,
  Save,
  Share,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trip } from "@/types";

// Enhanced types for the immersive itinerary builder
interface TripStop {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  startDate: string;
  endDate: string;
  activities: Activity[];
  estimatedBudget: number;
  weather?: WeatherInfo;
  costOfLiving?: number;
  heroImage?: string;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'food' | 'adventure' | 'sightseeing' | 'shopping' | 'nightlife' | 'culture';
  cost: number;
  duration: number;
  isAISuggested?: boolean;
}

interface WeatherInfo {
  temperature: number;
  condition: string;
  icon: string;
}

interface CityOption {
  name: string;
  country: string;
  countryCode: string;
  costOfLiving: number;
  weather: WeatherInfo;
  popularActivities: string[];
}

// Mock data for city suggestions
const CITY_SUGGESTIONS: CityOption[] = [
  {
    name: "Paris",
    country: "France",
    countryCode: "FR",
    costOfLiving: 85,
    weather: { temperature: 22, condition: "Sunny", icon: "☀️" },
    popularActivities: ["Eiffel Tower", "Louvre Museum", "Seine River Cruise"]
  },
  {
    name: "Tokyo",
    country: "Japan", 
    countryCode: "JP",
    costOfLiving: 78,
    weather: { temperature: 18, condition: "Cloudy", icon: "☁️" },
    popularActivities: ["Shibuya Crossing", "Senso-ji Temple", "Tsukiji Market"]
  },
  {
    name: "Bali",
    country: "Indonesia",
    countryCode: "ID", 
    costOfLiving: 35,
    weather: { temperature: 28, condition: "Partly Cloudy", icon: "⛅" },
    popularActivities: ["Ubud Rice Terraces", "Beach Hopping", "Temple Tours"]
  }
];

// Activity suggestions based on city and season
const AI_ACTIVITY_SUGGESTIONS = {
  "Paris": {
    spring: ["Picnic in Luxembourg Gardens", "Seine River Walk", "Montmartre Art Tour"],
    summer: ["Outdoor Café Hopping", "Versailles Day Trip", "Evening Seine Cruise"],
    autumn: ["Museum Marathon", "Champs-Élysées Shopping", "Wine Tasting"],
    winter: ["Christmas Markets", "Indoor Art Galleries", "Cozy Bistro Tours"]
  },
  "Tokyo": {
    spring: ["Cherry Blossom Viewing", "Harajuku Street Fashion", "Traditional Tea Ceremony"],
    summer: ["Summer Festivals", "Tokyo Bay Cruise", "Rooftop Bar Hopping"],
    autumn: ["Autumn Leaves in Parks", "Sake Tasting", "Traditional Crafts Workshop"],
    winter: ["Hot Springs Day Trip", "Winter Illuminations", "Ramen Shop Crawl"]
  }
};

const Itinerary = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  
  // State management for the immersive builder
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [editingField, setEditingField] = useState<{ stopId: string; field: string } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  
  // Trip stops data
  const [tripStops, setTripStops] = useState<TripStop[]>([
    {
      id: '1',
      city: 'Paris',
      country: 'France',
      countryCode: 'FR',
      startDate: '2024-06-15',
      endDate: '2024-06-18',
      activities: [
        {
          id: 'a1',
          title: 'Visit Eiffel Tower',
          description: 'Iconic landmark with stunning city views',
          time: '09:00',
          type: 'sightseeing',
          cost: 25,
          duration: 120,
          isAISuggested: true
        },
        {
          id: 'a2',
          title: 'Seine River Cruise',
          description: 'Romantic boat tour along the Seine',
          time: '15:00',
          type: 'sightseeing',
          cost: 15,
          duration: 90
        }
      ],
      estimatedBudget: 450,
      weather: { temperature: 22, condition: 'Sunny', icon: '☀️' },
      costOfLiving: 85,
      heroImage: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=400&fit=crop'
    }
  ]);

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
    
    // Set this as the last viewed trip
    localStorage.setItem('lastViewedTripId', tripId);
    return foundTrip;
  }, [tripId, navigate]);
  // Helper functions
  const addNewStop = useCallback(() => {
    setIsAddingStop(true);
  }, []);

  const handleCitySelect = useCallback((city: CityOption) => {
    const newStop: TripStop = {
      id: Date.now().toString(),
      city: city.name,
      country: city.country,
      countryCode: city.countryCode,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      activities: [],
      estimatedBudget: 0,
      weather: city.weather,
      costOfLiving: city.costOfLiving,
      heroImage: `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop&q=80`
    };
    
    setTripStops(prev => [...prev, newStop]);
    setIsAddingStop(false);
    setCitySearch('');
    setShowCitySuggestions(false);
    
    // Trigger confetti if 5+ stops
    if (tripStops.length >= 4) {
      setConfettiTrigger(prev => prev + 1);
    }
  }, [tripStops.length]);

  const filteredCities = CITY_SUGGESTIONS.filter(city =>
    city.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    city.country.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <div className={cn(
      "min-h-screen transition-all duration-500",
      isDarkMode 
        ? "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" 
        : "bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50"
    )}>
      <Seo title="GlobeTrotter – Itinerary Builder" description="Create your perfect travel itinerary with drag-and-drop planning." />
      
      {/* Header with Dark/Light Mode Toggle */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              GlobeTrotter
            </h1>
            <Badge variant="secondary" className="text-xs">
              {tripStops.length} {tripStops.length === 1 ? 'Stop' : 'Stops'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="rounded-full"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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

      <main className="container mx-auto px-6 py-8">
        {/* Trip Summary Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-2xl bg-white/80 backdrop-blur-sm shadow-xl border-0"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {trip?.name || 'My Dream Trip'}
              </h2>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{tripStops.length} Days</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{new Set(tripStops.map(s => s.country)).size} Countries</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>${tripStops.reduce((sum, stop) => sum + stop.estimatedBudget, 0)}</span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={() => {
                if (!trip) return;
                alert('Itinerary saved successfully!');
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Trip
            </Button>
          </div>
        </motion.div>

        {/* Split View Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Draggable Timeline */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-32"
            >
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Reorder.Group
                    axis="y"
                    values={tripStops}
                    onReorder={setTripStops}
                    className="space-y-3"
                  >
                    {tripStops.map((stop, index) => (
                      <Reorder.Item
                        key={stop.id}
                        value={stop}
                        as="div"
                        whileHover={{ scale: 1.02 }}
                        whileDrag={{ scale: 1.05 }}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <motion.div
                          className={cn(
                            "p-4 rounded-xl border-2 transition-all duration-200",
                            selectedStop === stop.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 bg-white hover:border-blue-300"
                          )}
                          onClick={() => setSelectedStop(stop.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                                {index + 1}
                              </div>
                              <span className="font-semibold">{stop.city}</span>
                              <span className="text-xs">{stop.weather?.icon}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              ${stop.estimatedBudget}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-gray-500 mb-2">
                            {stop.startDate} - {stop.endDate}
                          </div>
                          
                          <div className="text-xs text-gray-600">
                            {stop.activities.length} activities planned
                          </div>
                        </motion.div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Panel - Interactive Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Add Stop Form */}
              {isAddingStop && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Add New Stop
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="relative">
                          <Input
                            placeholder="Search for a city..."
                            value={citySearch}
                            onChange={(e) => {
                              setCitySearch(e.target.value);
                              setShowCitySuggestions(true);
                            }}
                            className="pl-10"
                          />
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        
                        {showCitySuggestions && citySearch && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2 max-h-60 overflow-y-auto"
                          >
                            {filteredCities.map((city) => (
                              <motion.div
                                key={`${city.name}-${city.country}`}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => handleCitySelect(city)}
                                className="p-3 rounded-lg border cursor-pointer hover:bg-blue-50 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Flag className="h-4 w-4" />
                                    <div>
                                      <div className="font-medium">{city.name}</div>
                                      <div className="text-xs text-gray-500">{city.country}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1">
                                      <CloudSun className="h-3 w-3" />
                                      <span>{city.weather.temperature}°C</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" />
                                      <span>${city.costOfLiving}/day</span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsAddingStop(false);
                              setCitySearch('');
                              setShowCitySuggestions(false);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Selected Stop Details */}
              {selectedStop && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {tripStops
                    .filter(stop => stop.id === selectedStop)
                    .map(stop => (
                      <Card key={stop.id} className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <img
                                src={`https://flagcdn.com/24x18/${stop.countryCode.toLowerCase()}.png`}
                                alt={stop.country}
                                className="rounded"
                              />
                              {stop.city}, {stop.country}
                            </CardTitle>
                            <Badge variant="secondary">
                              ${stop.estimatedBudget} estimated
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Hero Image */}
                          {stop.heroImage && (
                            <div className="relative h-48 rounded-xl overflow-hidden">
                              <img
                                src={stop.heroImage}
                                alt={stop.city}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                              <div className="absolute bottom-4 left-4 text-white">
                                <h3 className="text-xl font-bold">{stop.city}</h3>
                                <p className="text-sm opacity-90">{stop.country}</p>
                              </div>
                            </div>
                          )}

                          {/* Weather & Cost Info */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-blue-50">
                              <div className="flex items-center gap-2 mb-1">
                                <CloudSun className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium">Weather</span>
                              </div>
                              <div className="text-lg font-bold text-blue-600">
                                {stop.weather?.temperature}°C
                              </div>
                              <div className="text-xs text-blue-600/70">
                                {stop.weather?.condition}
                              </div>
                            </div>
                            
                            <div className="p-3 rounded-lg bg-green-50">
                              <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">Daily Cost</span>
                              </div>
                              <div className="text-lg font-bold text-green-600">
                                ${stop.costOfLiving}
                              </div>
                              <div className="text-xs text-green-600/70">
                                Average per day
                              </div>
                            </div>
                          </div>

                          {/* Activities Section */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold">Activities</h4>
                              <Button size="sm" variant="outline">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI Suggest
                              </Button>
                            </div>
                            
                            <div className="space-y-3">
                              {stop.activities.map((activity) => (
                                <motion.div
                                  key={activity.id}
                                  whileHover={{ scale: 1.01 }}
                                  className="p-3 rounded-lg border bg-white/50"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className={cn(
                                        "w-3 h-3 rounded-full",
                                        activity.type === 'food' && "bg-yellow-500",
                                        activity.type === 'sightseeing' && "bg-blue-500",
                                        activity.type === 'adventure' && "bg-green-500",
                                        activity.type === 'culture' && "bg-purple-500",
                                        activity.type === 'shopping' && "bg-pink-500",
                                        activity.type === 'nightlife' && "bg-orange-500"
                                      )} />
                                      <span className="font-medium">{activity.title}</span>
                                      {activity.isAISuggested && (
                                        <Badge variant="secondary" className="text-xs">
                                          <Sparkles className="h-2 w-2 mr-1" />
                                          AI
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <Clock className="h-3 w-3" />
                                      {activity.time}
                                      <Badge variant="outline" className="text-xs">
                                        ${activity.cost}
                                      </Badge>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600">{activity.description}</p>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      {/* Floating Add Stop Button */}
      <motion.div
        className="fixed bottom-8 right-8 z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={addNewStop}
          className={cn(
            "w-16 h-16 rounded-full shadow-2xl",
            "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
            "text-white border-0 relative overflow-hidden"
          )}
        >
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <Plus className="h-6 w-6 relative z-10" />
        </Button>
      </motion.div>

      {/* Confetti Effect */}
      {confettiTrigger > 0 && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 3 }}
        >
          {/* Simplified confetti effect */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={{
                scale: [0, 1, 0],
                rotate: [0, 360]
              }}
              transition={{ duration: 2 }}
              className="text-6xl"
            >
              🎉
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Itinerary;
