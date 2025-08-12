import Header from "@/components/layout/Header";
import Seo from "@/components/Seo";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { Search, X, MapPin, Plus, Check, Plane, Sun, Cloud, Star, TrendingUp, Eye, DollarSign, Calendar, Users, Filter, ChevronDown } from "lucide-react";

type City = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  popularity: number;
  costIndex: number;
  image: string;
  temperature: number;
  weather: 'sunny' | 'cloudy' | 'rainy';
  attractions: string[];
  dailyBudget: number;
  bestMonths: string[];
  region: string;
  trending: boolean;
  hiddenGem: boolean;
};

const MOCK_CITIES: City[] = [
  {
    id: 'paris-fr',
    name: "Paris",
    country: "France",
    countryCode: "🇫🇷",
    popularity: 95,
    costIndex: 78,
    image: "https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop",
    temperature: 22,
    weather: 'sunny',
    attractions: ["Eiffel Tower", "Louvre Museum", "Notre-Dame"],
    dailyBudget: 120,
    bestMonths: ["Apr", "May", "Sep", "Oct"],
    region: "Western Europe",
    trending: true,
    hiddenGem: false
  },
  {
    id: 'tokyo-jp',
    name: "Tokyo",
    country: "Japan",
    countryCode: "🇯🇵",
    popularity: 98,
    costIndex: 82,
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop",
    temperature: 18,
    weather: 'cloudy',
    attractions: ["Senso-ji Temple", "Shibuya Crossing", "Tokyo Skytree"],
    dailyBudget: 95,
    bestMonths: ["Mar", "Apr", "Oct", "Nov"],
    region: "East Asia",
    trending: true,
    hiddenGem: false
  },
  {
    id: 'bali-id',
    name: "Bali",
    country: "Indonesia",
    countryCode: "🇮🇩",
    popularity: 90,
    costIndex: 45,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    temperature: 28,
    weather: 'sunny',
    attractions: ["Uluwatu Temple", "Rice Terraces", "Monkey Forest"],
    dailyBudget: 35,
    bestMonths: ["Apr", "May", "Jun", "Sep"],
    region: "Southeast Asia",
    trending: false,
    hiddenGem: false
  },
  {
    id: 'lisbon-pt',
    name: "Lisbon",
    country: "Portugal",
    countryCode: "🇵🇹",
    popularity: 85,
    costIndex: 62,
    image: "https://images.unsplash.com/photo-1588640203300-803a1f6c6e8e?w=800&h=600&fit=crop",
    temperature: 25,
    weather: 'sunny',
    attractions: ["Belém Tower", "Tram 28", "Jerónimos Monastery"],
    dailyBudget: 65,
    bestMonths: ["May", "Jun", "Sep", "Oct"],
    region: "Southern Europe",
    trending: false,
    hiddenGem: true
  },
  {
    id: 'reykjavik-is',
    name: "Reykjavik",
    country: "Iceland",
    countryCode: "🇮🇸",
    popularity: 75,
    costIndex: 95,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    temperature: 8,
    weather: 'cloudy',
    attractions: ["Blue Lagoon", "Northern Lights", "Hallgrímskirkja"],
    dailyBudget: 150,
    bestMonths: ["Jun", "Jul", "Aug", "Sep"],
    region: "Northern Europe",
    trending: false,
    hiddenGem: true
  },
  {
    id: 'marrakech-ma',
    name: "Marrakech",
    country: "Morocco",
    countryCode: "🇲🇦",
    popularity: 80,
    costIndex: 38,
    image: "https://images.unsplash.com/photo-1489749798305-4fea3ae436d3?w=800&h=600&fit=crop",
    temperature: 32,
    weather: 'sunny',
    attractions: ["Jemaa el-Fnaa", "Majorelle Garden", "Bahia Palace"],
    dailyBudget: 45,
    bestMonths: ["Mar", "Apr", "Oct", "Nov"],
    region: "North Africa",
    trending: true,
    hiddenGem: false
  }
];

const CitySearch = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'popular' | 'cheapest' | 'closest'>('popular');
  const [addedCities, setAddedCities] = useState<Set<string>>(new Set());
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [showQuickInfo, setShowQuickInfo] = useState(false);

  // Get cost badge color
  const getCostBadgeColor = (costIndex: number) => {
    if (costIndex <= 50) return 'bg-green-500 text-white';
    if (costIndex <= 75) return 'bg-yellow-500 text-white';
    return 'bg-red-500 text-white';
  };

  // Get cost badge text
  const getCostBadgeText = (costIndex: number) => {
    if (costIndex <= 50) return 'Affordable';
    if (costIndex <= 75) return 'Moderate';
    return 'Expensive';
  };

  // Get weather icon
  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'sunny': return Sun;
      case 'cloudy': return Cloud;
      default: return Sun;
    }
  };

  // Filter and sort cities
  const filteredCities = useMemo(() => {
    let filtered = MOCK_CITIES.filter(city => {
      const matchesQuery = !query || 
        city.name.toLowerCase().includes(query.toLowerCase()) ||
        city.country.toLowerCase().includes(query.toLowerCase()) ||
        city.region.toLowerCase().includes(query.toLowerCase());
      
      return matchesQuery;
    });

    // Apply sorting
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.popularity - a.popularity);
        break;
      case 'cheapest':
        filtered.sort((a, b) => a.costIndex - b.costIndex);
        break;
      case 'closest':
        // Mock sorting by closest (in real app, would use user location)
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return filtered;
  }, [query, sortBy]);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (value.length > 0) {
      const searchSuggestions = MOCK_CITIES
        .filter(city => 
          city.name.toLowerCase().includes(value.toLowerCase()) ||
          city.country.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5);
      setSuggestions(searchSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle adding city to trip
  const handleAddCity = (cityId: string) => {
    setAddedCities(prev => new Set([...prev, cityId]));
    // In real app, would call API to add city to current trip
  };

  // Handle city click for quick info
  const handleCityClick = (city: City) => {
    setSelectedCity(city);
    setShowQuickInfo(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Seo title="City Search – GlobeTrotter" description="Discover amazing cities for your next adventure." />
      <Header />

      {/* World Map Background */}
      <div className="fixed inset-0 opacity-5 dark:opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23000" fill-opacity="0.1"%3E%3Ccircle cx="20" cy="30" r="2"/%3E%3Ccircle cx="80" cy="20" r="1.5"/%3E%3Ccircle cx="60" cy="70" r="2.5"/%3E%3Ccircle cx="30" cy="80" r="1"/%3E%3C/g%3E%3C/svg%3E')] bg-repeat"></div>
      </div>

      <main className="container relative py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent mb-4"
          >
            Discover Cities
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 dark:text-gray-400 text-lg"
          >
            Find your perfect destination and add it to your trip
          </motion.p>
        </div>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto mb-8 relative"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search for a city or destination..."
              className="pl-12 pr-12 py-4 text-lg rounded-full border-2 border-orange-200 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg focus:border-orange-400 dark:focus:border-orange-500 transition-all"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setShowSuggestions(false);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-orange-200 dark:border-gray-600 overflow-hidden z-50"
              >
                {suggestions.map((city, index) => (
                  <motion.div
                    key={city.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setQuery(city.name);
                      setShowSuggestions(false);
                    }}
                    className="flex items-center gap-3 p-4 hover:bg-orange-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <div>
                      <div className="font-medium">{city.name}</div>
                      <div className="text-sm text-gray-500">{city.countryCode} {city.country}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Filter and Sort Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 mb-8 items-center justify-between"
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/20">
              <Filter className="w-3 h-3 mr-1" />
              All Regions
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/20">
              Cost Index
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/20">
              Travel Season
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'popular' ? 'default' : 'outline'}
              onClick={() => setSortBy('popular')}
              size="sm"
              className="rounded-full"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Most Popular
            </Button>
            <Button
              variant={sortBy === 'cheapest' ? 'default' : 'outline'}
              onClick={() => setSortBy('cheapest')}
              size="sm"
              className="rounded-full"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Cheapest
            </Button>
            <Button
              variant={sortBy === 'closest' ? 'default' : 'outline'}
              onClick={() => setSortBy('closest')}
              size="sm"
              className="rounded-full"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Closest
            </Button>
          </div>
        </motion.div>

        {/* City Results */}
        {filteredCities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="mb-8">
              <div className="mx-auto w-32 h-32 bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 rounded-full flex items-center justify-center mb-6">
                <Plane className="w-16 h-16 text-orange-500 dark:text-orange-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No cities found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Try searching by country or region, or adjust your filters to discover amazing destinations.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredCities.map((city, index) => {
                const WeatherIcon = getWeatherIcon(city.weather);
                const isAdded = addedCities.has(city.id);
                
                return (
                  <motion.div
                    key={city.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.1 }}
                    className="group"
                  >
                    <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] hover:rotate-1 bg-white dark:bg-gray-800 border-0">
                      <div className="relative">
                        {/* Cover Image */}
                        <div className="relative h-48 overflow-hidden">
                          <motion.img
                            src={city.image}
                            alt={city.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            whileHover={{ scale: 1.1 }}
                          />
                          {/* Dark Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          
                          {/* Cost Badge */}
                          <Badge className={`absolute top-4 right-4 ${getCostBadgeColor(city.costIndex)}`}>
                            {getCostBadgeText(city.costIndex)}
                          </Badge>

                          {/* Popularity Tag */}
                          {city.trending && (
                            <Badge className="absolute top-4 left-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Trending
                            </Badge>
                          )}
                          {city.hiddenGem && (
                            <Badge className="absolute top-4 left-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                              <Star className="w-3 h-3 mr-1" />
                              Hidden Gem
                            </Badge>
                          )}

                          {/* City Name and Country */}
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

                        {/* Add to Trip Button */}
                        <motion.div
                          className="absolute bottom-4 right-4"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddCity(city.id);
                            }}
                            size="sm"
                            className={`rounded-full shadow-lg transition-all duration-300 ${
                              isAdded 
                                ? 'bg-green-500 hover:bg-green-600 text-white' 
                                : 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white'
                            }`}
                          >
                            {isAdded ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </Button>
                        </motion.div>
                      </div>

                      {/* Card Content */}
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <WeatherIcon className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {city.temperature}°C
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">{city.popularity}%</span>
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
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )} 
      </main>

      {/* Quick Info Popover */}
      <AnimatePresence>
        {showQuickInfo && selectedCity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowQuickInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">{selectedCity.name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickInfo(false)}
                  className="rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                    Top Attractions
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {selectedCity.attractions.map((attraction, index) => (
                      <li key={index}>• {attraction}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-green-500" />
                    Average Daily Budget
                  </h4>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${selectedCity.dailyBudget}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                    Best Travel Months
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedCity.bestMonths.map((month) => (
                      <Badge key={month} variant="secondary" className="text-xs">
                        {month}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => {
                  handleAddCity(selectedCity.id);
                  setShowQuickInfo(false);
                }}
                className="w-full mt-6 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CitySearch;

