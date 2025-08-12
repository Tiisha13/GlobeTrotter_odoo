import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, SortAsc, Edit3, Eye, Trash2, MapPin, Calendar, Clock, Plane, Mountain, Camera, Users, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/context/AuthContext';
import { getTrips as getTripsStorage, removeTrip as removeTripStorage } from '@/lib/storage';
import Header from '@/components/layout/Header';
import Seo from '@/components/Seo';

// Mock trip data for demonstration
const MOCK_TRIPS = [
  {
    id: 'trip-1',
    name: 'European Adventure',
    destination: 'Paris, Rome, Barcelona',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    coverPhotoUrl: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop',
    destinationCount: 3,
    budget: 2500,
    lastUpdated: Date.now() - 2 * 24 * 60 * 60 * 1000,
    description: 'A magical journey through Europe\'s most romantic cities',
    userId: 'user-1',
    isPublic: false,
    tags: ['culture', 'food', 'history']
  },
  {
    id: 'trip-2',
    name: 'Tropical Paradise',
    destination: 'Maldives, Bali',
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
    coverPhotoUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    destinationCount: 2,
    budget: 3200,
    lastUpdated: Date.now() - 5 * 24 * 60 * 60 * 1000,
    description: 'Relaxing beach getaway with crystal clear waters',
    userId: 'user-1',
    isPublic: true,
    tags: ['beach', 'relaxation', 'luxury']
  },
  {
    id: 'trip-3',
    name: 'Mountain Expedition',
    destination: 'Swiss Alps, Austrian Mountains',
    startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000).toISOString(),
    coverPhotoUrl: 'https://images.unsplash.com/photo-1520637836862-4d197d17c50a?w=800&h=600&fit=crop',
    destinationCount: 4,
    budget: 1800,
    lastUpdated: Date.now() - 1 * 24 * 60 * 60 * 1000,
    description: 'Adventure hiking through breathtaking mountain ranges',
    userId: 'user-1',
    isPublic: false,
    tags: ['adventure', 'hiking', 'nature']
  }
];

// Travel themed icons for different trip types
const getTripIcon = (destination: string) => {
  const dest = destination.toLowerCase();
  if (dest.includes('mountain') || dest.includes('alps') || dest.includes('himalaya')) return Mountain;
  if (dest.includes('beach') || dest.includes('island') || dest.includes('maldives') || dest.includes('bali')) return Camera;
  if (dest.includes('city') || dest.includes('urban') || dest.includes('paris') || dest.includes('rome')) return Users;
  return Plane;
};

// Calculate days until trip starts
const getDaysUntilTrip = (startDate: string): number => {
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = start.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Get trip duration in days
const getTripDuration = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const TripsNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [trips, setTrips] = useState(MOCK_TRIPS);
  const [isLoading, setIsLoading] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'recent'>('recent');
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);

  // Filter and sort trips
  const filteredAndSortedTrips = useMemo(() => {
    let filtered = trips.filter(trip =>
      trip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'date':
        filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        break;
      case 'recent':
        filtered.sort((a, b) => b.lastUpdated - a.lastUpdated);
        break;
    }

    return filtered;
  }, [trips, searchQuery, sortBy]);

  const handleDeleteTrip = async () => {
    if (!tripToDelete) return;
    
    try {
      setIsDeleting(true);
      // In real app, call API to delete trip
      setTrips(trips.filter(trip => trip.id !== tripToDelete));
      toast({
        title: 'Trip deleted',
        description: 'Your trip has been successfully deleted.',
      });
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete trip. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setTripToDelete(null);
    }
  };

  const handleEditTrip = (tripId: string) => {
    navigate(`/trips/${tripId}/edit`);
  };

  const handleViewTrip = (tripId: string) => {
    localStorage.setItem('lastViewedTripId', tripId);
    navigate(`/itinerary/${tripId}`);
  };

  const handleQuickView = (tripId: string) => {
    setExpandedTrip(expandedTrip === tripId ? null : tripId);
  };

  // Empty state component
  const EmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      <div className="mb-8">
        <div className="mx-auto w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6">
          <Plane className="w-16 h-16 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No trips yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Start planning your next adventure! Create your first trip and begin exploring the world.
        </p>
        <Button 
          onClick={() => navigate('/create-trip')}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Plan Your First Trip
        </Button>
      </div>
    </motion.div>
  );

  // Trip card component
  const TripCard = ({ trip, index }: { trip: any; index: number }) => {
    const TripIcon = getTripIcon(trip.destination);
    const daysUntil = getDaysUntilTrip(trip.startDate);
    const duration = getTripDuration(trip.startDate, trip.endDate);
    const isUpcoming = daysUntil > 0 && daysUntil <= 30;
    const isExpanded = expandedTrip === trip.id;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ delay: index * 0.1 }}
        className="group"
      >
        <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] bg-white dark:bg-gray-800 border-0">
          <div className="relative">
            {/* Cover Image */}
            <div className="relative h-48 overflow-hidden">
              <motion.img
                src={trip.coverPhotoUrl}
                alt={trip.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                whileHover={{ scale: 1.1 }}
              />
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              {/* Destination Count Badge */}
              <Badge className="absolute top-4 right-4 bg-white/90 text-gray-900 hover:bg-white">
                <MapPin className="w-3 h-3 mr-1" />
                {trip.destinationCount} stops
              </Badge>

              {/* Upcoming Badge */}
              {isUpcoming && (
                <Badge className="absolute top-4 left-4 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  <Clock className="w-3 h-3 mr-1" />
                  Starts in {daysUntil} days
                </Badge>
              )}

              {/* Trip Title and Date */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center mb-2">
                  <TripIcon className="w-5 h-5 text-white mr-2" />
                  <h3 className="text-xl font-bold text-white truncate">
                    {trip.name}
                  </h3>
                </div>
                <p className="text-white/90 text-sm">
                  {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button
                size="sm"
                variant="secondary"
                className="bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg"
                onClick={() => handleEditTrip(trip.id)}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-lg"
                onClick={() => handleViewTrip(trip.id)}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg"
                onClick={() => setTripToDelete(trip.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Card Content */}
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 dark:text-gray-400 text-sm truncate flex-1">
                {trip.destination}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickView(trip.id)}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Quick View
              </Button>
            </div>

            {/* Quick View Expansion */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t pt-4 mt-4 space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span className="font-medium">{duration} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Budget:</span>
                    <span className="font-medium">${trip.budget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                    <span className="font-medium">
                      {Math.ceil((Date.now() - trip.lastUpdated) / (1000 * 60 * 60 * 24))} days ago
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {trip.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {trip.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Seo title="My Trips – GlobeTrotter" description="View and manage your trips." />
      <Header />
      
      <main className="container py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              My Trips
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Discover, plan, and manage your travel adventures
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
              onClick={() => navigate('/create-trip')}
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Trip
            </Button>
          </motion.div>
        </div>

        {/* Search and Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search trips by name or destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'recent' ? 'default' : 'outline'}
              onClick={() => setSortBy('recent')}
              size="sm"
            >
              <SortAsc className="w-4 h-4 mr-2" />
              Recent
            </Button>
            <Button
              variant={sortBy === 'date' ? 'default' : 'outline'}
              onClick={() => setSortBy('date')}
              size="sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Date
            </Button>
            <Button
              variant={sortBy === 'name' ? 'default' : 'outline'}
              onClick={() => setSortBy('name')}
              size="sm"
            >
              Name
            </Button>
          </div>
        </div>

        {/* Trip Grid */}
        {filteredAndSortedTrips.length === 0 ? (
          searchQuery ? (
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No trips found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search terms or create a new trip.
              </p>
            </div>
          ) : (
            <EmptyState />
          )
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {filteredAndSortedTrips.map((trip, index) => (
                <TripCard key={trip.id} trip={trip} index={index} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!tripToDelete} onOpenChange={() => setTripToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trip? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TripsNew;
