import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, SortAsc, Edit3, Eye, Trash2, MapPin, Calendar, Clock, Plane, Mountain, Camera, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/confirm-dialog';
import { Trip } from '@/types/trip';
import { useAuth } from '@/context/AuthContext';
import { getTrips as getTripsStorage, removeTrip as removeTripStorage } from '@/lib/storage';
import Header from '@/components/layout/Header';
import Seo from '@/components/Seo';

// Travel themed icons for different trip types
const getTripIcon = (destination: string) => {
  const dest = destination.toLowerCase();
  if (dest.includes('mountain') || dest.includes('alps') || dest.includes('himalaya')) return Mountain;
  if (dest.includes('beach') || dest.includes('island') || dest.includes('coast')) return Camera;
  if (dest.includes('city') || dest.includes('urban')) return Users;
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

// Mock cover images for trips (in real app, these would be user uploads or API images)
const getCoverImage = (destination: string, tripId: string): string => {
  const images = [
    'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1520637836862-4d197d17c50a?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop',
  ];
  const index = tripId.length % images.length;
  return images[index];
};

const Trips = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'recent'>('recent');
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);

  // Load trips on component mount
  useEffect(() => {
    const loadTrips = async () => {
      try {
        setIsLoading(true);
        if (user?.id) {
          const allTrips = getTripsStorage();
          const userTrips = Object.values(allTrips).filter(trip => trip.userId === user.id);
          setTrips(userTrips);
        }
      } catch (error) {
        console.error('Failed to load trips:', error);
        toast({
          title: 'Error',
          description: 'Failed to load trips. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTrips();
  }, [user?.id, toast]);

  const handleDeleteTrip = async () => {
    if (!tripToDelete) return;
    
    try {
      setIsDeleting(true);
      const success = await removeTrip(tripToDelete);
      
      if (success) {
        setTrips(trips.filter(trip => trip.id !== tripToDelete));
        toast({
          title: 'Trip deleted',
          description: 'Your trip has been successfully deleted.',
        });
      } else {
        throw new Error('Failed to delete trip');
      }
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
    try {
      // Set the last viewed trip ID before navigating
      localStorage.setItem('lastViewedTripId', tripId);
      navigate(`/itinerary/${tripId}`);
    } catch (error) {
      console.error('Error setting last viewed trip:', error);
      // If there's an error, still try to navigate
      navigate(`/itinerary/${tripId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo title="My Trips – GlobeTrotter" description="View and manage your trips." />
      <Header />
      
      <main className="container py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Trips</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all your travel plans in one place
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              className="mt-4 sm:mt-0" 
              onClick={() => navigate('/create-trip')}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Trip
            </Button>
          </motion.div>
        </div>

        <TripList
          trips={trips}
          onDeleteTrip={(tripId) => setTripToDelete(tripId)}
          loading={isLoading}
        />
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!tripToDelete} onOpenChange={(open) => !open && setTripToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the trip and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Trip'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Trips;
