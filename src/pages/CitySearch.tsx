import Header from "@/components/layout/Header";
import Seo from "@/components/Seo";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState, useEffect } from "react";
import { Search, X, MapPin, Plus, Check, Plane, Sun, Cloud, Star, TrendingUp, Eye, DollarSign, Calendar, Users, Filter, ChevronDown, Loader2 } from "lucide-react";
import { cityService } from "@/services/cityService";
import type { City } from "@/types/city";
import { useToast } from "@/components/ui/use-toast";
import { useTrips } from "@/hooks/useTrips";

// Define the weather type
type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'clear' | 'rain' | 'snow' | 'thunderstorm' | 'drizzle' | 'mist' | 'smoke' | 'haze' | 'dust' | 'fog' | 'sand' | 'ash' | 'squall' | 'tornado';

// Weather icon mapping
const WEATHER_ICONS: Record<WeatherType, any> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: Cloud,
  clear: Sun,
  rain: Cloud,
  snow: Cloud,
  thunderstorm: Cloud,
  drizzle: Cloud,
  mist: Cloud,
  smoke: Cloud,
  haze: Cloud,
  dust: Cloud,
  fog: Cloud,
  sand: Cloud,
  ash: Cloud,
  squall: Cloud,
  tornado: Cloud,
};

// Weather icon component
const WeatherIcon = ({ type, className = '' }: { type: WeatherType, className?: string }) => {
  const Icon = WEATHER_ICONS[type] || Sun;
  return <Icon className={className} />;
};

// Extend the City type to include our frontend-specific properties
interface CityCard extends City {
  countryCode?: string;
  temperature?: number;
  weather?: WeatherType;
  rating?: number;
}

export default function CitySearch() {
  const { toast } = useToast();
  const { trips, addCityToTrip, loadTrips } = useTrips();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityCard | null>(null);
  const [showQuickInfo, setShowQuickInfo] = useState(false);
  const [cities, setCities] = useState<CityCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedCities, setAddedCities] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    region: "",
    minBudget: 0,
    maxBudget: 1000,
    weather: "",
    bestTime: "",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"popularity" | "price-asc" | "price-desc" | "name">("popularity");

  // Fetch cities from the API
  useEffect(() => {
    const fetchCities = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Call the city service to search for cities
        const { items } = await cityService.searchCities(
          searchQuery,
          {
            country: filters.region || undefined,
            minRating: 0,
            maxCost: filters.maxBudget || undefined,
          },
          20, // limit
          0   // skip
        );
        
        // Transform the API response to match our frontend needs
        const transformedCities = items.map((city) => ({
          ...city,
          image: city.image || (city as any).image_url,
          countryCode: getCountryCode(city.country),
          temperature: Math.floor(Math.random() * 30) + 10,
          weather: getRandomWeather(),
          rating: Math.floor(Math.random() * 20) + 80,
        }));
        
        setCities(transformedCities);
      } catch (err) {
        console.error('Error fetching cities:', err);
        setError('Failed to load cities. Please try again later.');
        toast({
          title: 'Error',
          description: 'Failed to load cities. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Add debounce to prevent too many API calls
    const debounceTimer = setTimeout(() => {
      if (searchQuery.length >= 0) { // Allow empty query to fetch all cities
        fetchCities();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, filters.region, filters.maxBudget, toast]);

  // Load trips on component mount
  useEffect(() => {
    loadTrips();
  }, [loadTrips]);
  
  // Helper function to get a random weather type
  const getRandomWeather = (): WeatherType => {
    const weatherTypes: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'clear'];
    return weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
  };
  
  // Helper function to get country code from country name (simplified)
  const getCountryCode = (countryName: string): string => {
    const countryMap: Record<string, string> = {
      'france': '🇫🇷',
      'japan': '🇯🇵',
      'united states': '🇺🇸',
      'united kingdom': '🇬🇧',
      'germany': '🇩🇪',
      'spain': '🇪🇸',
      'italy': '🇮🇹',
      'australia': '🇦🇺',
      'canada': '🇨🇦',
      'brazil': '🇧🇷',
      'china': '🇨🇳',
      'india': '🇮🇳',
    };
    
    return countryMap[countryName.toLowerCase()] || '🌍';
  };

  // Filter and sort cities
  const filteredCities = useMemo(() => {
    if (isLoading || error) return [];

    return [...cities]
      .filter(city => {
        // Search by name or country
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          city.name.toLowerCase().includes(searchLower) ||
          (city.country?.toLowerCase() || '').includes(searchLower);

        // Apply filters
        const matchesRegion = !filters.region || 
          city.country?.toLowerCase() === filters.region.toLowerCase();
          
        const matchesBudget = 
          (city.averageDailyCost || 0) >= filters.minBudget && 
          (city.averageDailyCost || 0) <= filters.maxBudget;

        // TODO: Implement these filters when the data is available
        const matchesWeather = !filters.weather;
        const matchesBestTime = !filters.bestTime;

        return matchesSearch && matchesRegion && matchesBudget && matchesWeather && matchesBestTime;
      })
      .sort((a, b) => {
        // Apply sorting
        switch (sortBy) {
          case 'popularity': 
            return (b.rating || 0) - (a.rating || 0);
          case 'price-asc': 
            return (a.averageDailyCost || 0) - (b.averageDailyCost || 0);
          case 'price-desc': 
            return (b.averageDailyCost || 0) - (a.averageDailyCost || 0);
          case 'name': 
            return a.name.localeCompare(b.name);
          default: 
            return 0;
        }
      });
  }, [cities, searchQuery, filters, sortBy, isLoading, error]);
  
  // Handle city selection for quick info
  const handleCityClick = async (city: CityCard) => {
    try {
      // If we already have the city details, use them
      if (city.description) {
        setSelectedCity(city);
        setShowQuickInfo(true);
        return;
      }
      
      // Otherwise, fetch the full city details
      const cityDetails = await cityService.getCityById(city.id);
      setSelectedCity({
        ...cityDetails,
        countryCode: city.countryCode,
        temperature: city.temperature,
        weather: city.weather,
        rating: city.rating,
      });
      setShowQuickInfo(true);
    } catch (err) {
      console.error('Error fetching city details:', err);
      toast({
        title: 'Error',
        description: 'Failed to load city details. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    
    // Get autocomplete suggestions
    if (value.length >= 2) {
      try {
        const suggestions = await cityService.getCitySuggestions(value, 5);
        setSuggestions(suggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Failed to get suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
  };

  // Handle adding city to trip
  const handleAddCityToTrip = async (city: CityCard) => {
    if (!trips || trips.length === 0) {
      toast({
        title: 'No trips found',
        description: 'Please create a trip first to add cities.',
        variant: 'destructive',
      });
      return;
    }

    // Use the most recent trip or let user select
    const targetTrip = trips[0]; // Most recent trip
    
    try {
      await addCityToTrip(targetTrip.id, {
        city_id: city.id,
        name: city.name,
        country: city.country || '',
        notes: `Added from city search on ${new Date().toLocaleDateString()}`,
      });
      
      // Mark city as added
      setAddedCities(prev => new Set([...prev, city.id]));
      
    } catch (error) {
      console.error('Failed to add city to trip:', error);
      // Toast is already handled in useTrips hook
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Seo title="City Search – GlobeTrotter" description="Discover amazing cities for your next adventure." />
      <Header />

      <div className="fixed inset-0 opacity-5 dark:opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000\' fill-opacity=\'0.1\'%3E%3Ccircle cx=\'20\' cy=\'30\' r=\'2\'/%3E%3Ccircle cx=\'80\' cy=\'20\' r=\'1.5\'/%3E%3Ccircle cx=\'60\' cy=\'70\' r=\'2.5\'/%3E%3Ccircle cx=\'30\' cy=\'80\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E')] bg-repeat"></div>
      </div>

      <main className="container relative py-8">
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-600 mb-4"
          >
            Discover Cities
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            Find your next adventure in our curated selection of amazing destinations around the world.
          </motion.p>
        </div>

        <div className="relative max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for a city or country..."
            className="pl-10 pr-4 py-6 text-lg rounded-full shadow-lg border-0 focus-visible:ring-2 focus-visible:ring-primary"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            disabled={isLoading}
          />
          {isLoading ? (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-gray-400" />
          ) : searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
          
          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{suggestion.name}</div>
                    <div className="text-sm text-gray-500">{suggestion.country}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading cities...</span>
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && filteredCities.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No cities found</h3>
          <p className="mt-1 text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {filteredCities.map((city) => (
          <motion.div 
            key={city.id} 
            className="group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] hover:rotate-1 bg-white dark:bg-gray-800 border-0">
              <div className="relative">
                <div className="relative h-48 overflow-hidden">
                  <motion.img
                    src={city.image || '/placeholder-city.jpg'}
                    alt={city.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    whileHover={{ scale: 1.1 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <Badge className={`absolute top-4 right-4 ${
                    (city.averageDailyCost || 0) <= 50 ? 'bg-green-500' : 
                    (city.averageDailyCost || 0) <= 100 ? 'bg-yellow-500' : 'bg-red-500'
                  } text-white`}>
                    {(city.averageDailyCost || 0) <= 50 ? 'Affordable' : 
                     (city.averageDailyCost || 0) <= 100 ? 'Moderate' : 'Expensive'}
                  </Badge>
                  <Badge className="absolute top-4 left-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Trending
                  </Badge>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-2xl font-bold text-white mb-1">
                      {city.name}
                    </h3>
                    <div className="flex items-center text-white/90">
                      <span className="mr-2 text-lg">{city.countryCode}</span>
                      <span>{city.country}</span>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <WeatherIcon 
                        type={city.weather || 'sunny'} 
                        className="w-4 h-4 text-yellow-500" 
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {city.temperature}°C
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{city.rating}%</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => handleCityClick(city)}
                    className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Quick Info
                  </Button>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </main>

    {/* Quick Info Modal */}
    <AnimatePresence>
      {showQuickInfo && selectedCity && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQuickInfo(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQuickInfo(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>

            <div className="relative h-64 md:h-80">
              <img
                src={selectedCity.image || '/placeholder-city.jpg'}
                alt={selectedCity.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold">{selectedCity.name}</h2>
                    <div className="flex items-center mt-1">
                      <span className="text-xl mr-2">{selectedCity.countryCode}</span>
                      <span className="text-gray-300">{selectedCity.country}</span>
                    </div>
                  </div>
                  <Badge className="text-sm px-3 py-1 bg-white/20 backdrop-blur-sm border-0">
                    ${selectedCity.averageDailyCost || 'N/A'} / day
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center">
                  <span className="w-5 h-5 mr-2">☀️</span>
                  <span>{selectedCity.temperature ?? '-'}°C</span>
                </div>
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-500 fill-current mr-2" />
                  <span>{selectedCity.rating ?? '-'}% Rating</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 text-green-500 mr-2" />
                  <span>${selectedCity.averageDailyCost || 'N/A'} / day</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-500 mr-2" />
                  <span>Popular Destination</span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">About {selectedCity.name}</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {selectedCity.description || 'No description available.'}
                </p>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                onClick={async () => {
                  await handleAddCityToTrip(selectedCity);
                  setShowQuickInfo(false);
                }}
                disabled={addedCities.has(selectedCity.id)}
              >
                {addedCities.has(selectedCity.id) ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Added to Trip
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Trip
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </div>
  );
}
