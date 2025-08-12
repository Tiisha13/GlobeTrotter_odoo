import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import type { 
  Trip, 
  TripFormData, 
  Activity, 
  BudgetItem,
  TripDay 
} from '@/types/trip.types';
import tripService from '@/services/tripService';

export const useTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load all trips for the current user
  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userTrips = await tripService.getTrips();
      setTrips(userTrips);
      return userTrips;
    } catch (err) {
      console.error('Error loading trips:', err);
      setError('Failed to load trips. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load trips. Please try again.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load a single trip by ID
  const loadTrip = useCallback(async (tripId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const trip = await tripService.getTripById(tripId);
      setCurrentTrip(trip);
      return trip;
    } catch (err) {
      console.error(`Error loading trip ${tripId}:`, err);
      setError('Failed to load trip. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load trip. It may have been deleted or you may not have permission to view it.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Create a new trip
  const createTrip = async (tripData: TripFormData): Promise<Trip | null> => {
    setIsSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const newTrip = await tripService.createTrip({
        ...tripData,
        startDate: tripData.startDate instanceof Date ? tripData.startDate.toISOString() : tripData.startDate,
        endDate: tripData.endDate instanceof Date ? tripData.endDate.toISOString() : tripData.endDate,
        coverPhotoUrl: tripData.coverPhotoUrl || '',
        activities: {},
        itinerary: [],
        budget: [],
        createdAt: now,
        updatedAt: now,
        isPublic: tripData.isPublic || false,
        tags: tripData.tags || [],
        collaborators: [],
        settings: {
          currency: 'USD',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          notifications: true,
        },
      });
      
      setTrips(prev => [...prev, newTrip]);
      setCurrentTrip(newTrip);
      
      toast({
        title: 'Trip created!',
        description: 'Your trip has been created successfully.',
      });
      
      return newTrip;
    } catch (err) {
      console.error('Error creating trip:', err);
      setError('Failed to create trip. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to create trip. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Update an existing trip
  const updateTrip = async (tripId: string, tripData: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'settings'>>): Promise<Trip | null> => {
    setIsSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const updates: Partial<Trip> = {
        ...tripData,
        updatedAt: now,
      };

      // Handle date conversions if needed
      if (tripData.startDate) {
        updates.startDate = tripData.startDate instanceof Date ? tripData.startDate.toISOString() : tripData.startDate;
      }
      if (tripData.endDate) {
        updates.endDate = tripData.endDate instanceof Date ? tripData.endDate.toISOString() : tripData.endDate;
      }

      const updatedTrip = await tripService.updateTrip(tripId, updates);
      
      setTrips(prev => prev.map(trip => trip.id === tripId ? updatedTrip : trip));
      setCurrentTrip(prev => prev?.id === tripId ? updatedTrip : prev);
      
      toast({
        title: 'Trip updated!',
        description: 'Your trip has been updated successfully.',
      });
      
      return updatedTrip;
    } catch (err) {
      console.error('Error updating trip:', err);
      setError('Failed to update trip. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to update trip. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a trip
  const deleteTrip = async (tripId: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      await tripService.deleteTrip(tripId);
      
      setTrips(prev => prev.filter(trip => trip.id !== tripId));
      if (currentTrip?.id === tripId) {
        setCurrentTrip(null);
      }
      
      toast({
        title: 'Trip deleted',
        description: 'Your trip has been successfully deleted.',
      });
      
      navigate('/trips');
      return true;
    } catch (err) {
      console.error(`Error deleting trip ${tripId}:`, err);
      setError('Failed to delete trip. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to delete trip. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle trip deletion confirmation
  const handleDeleteTrip = (tripId: string) => {
    setCurrentTrip(trips.find(trip => trip.id === tripId) || null);
    // You might want to show a confirmation dialog here
    // For now, we'll proceed with deletion directly
    return deleteTrip(tripId);
  };

  // Activity management
  const addActivity = async (tripId: string, dayDate: string, activity: Omit<Activity, 'id'>) => {
    try {
      const updatedTrip = await tripService.addActivity(tripId, dayDate, activity);
      setCurrentTrip(updatedTrip);
      return updatedTrip;
    } catch (err) {
      console.error('Error adding activity:', err);
      throw err;
    }
  };

  const updateActivity = async (
    tripId: string, 
    dayDate: string, 
    activityId: string, 
    updates: Partial<Activity>
  ) => {
    try {
      const updatedTrip = await tripService.updateActivity(tripId, dayDate, activityId, updates);
      setCurrentTrip(updatedTrip);
      return updatedTrip;
    } catch (err) {
      console.error('Error updating activity:', err);
      throw err;
    }
  };

  const removeActivity = async (tripId: string, dayDate: string, activityId: string) => {
    try {
      await tripService.deleteActivity(tripId, dayDate, activityId);
      // Reload the trip to get the updated data
      return loadTrip(tripId);
    } catch (err) {
      console.error('Error removing activity:', err);
      throw err;
    }
  };

  // Budget management
  const addBudgetItem = async (tripId: string, item: Omit<BudgetItem, 'id' | 'paid'>) => {
    try {
      const updatedTrip = await tripService.addBudgetItem(tripId, item);
      setCurrentTrip(updatedTrip);
      return updatedTrip;
    } catch (err) {
      console.error('Error adding budget item:', err);
      throw err;
    }
  };

  const updateBudgetItem = async (tripId: string, itemId: string, updates: Partial<Omit<BudgetItem, 'id'>>) => {
    try {
      const updatedTrip = await tripService.updateBudgetItem(tripId, itemId, updates);
      setCurrentTrip(updatedTrip);
      return updatedTrip;
    } catch (err) {
      console.error('Error updating budget item:', err);
      throw err;
    }
  };

  const removeBudgetItem = async (tripId: string, itemId: string) => {
    try {
      await tripService.deleteBudgetItem(tripId, itemId);
      // Reload the trip to get the updated data
      return loadTrip(tripId);
    } catch (err) {
      console.error('Error removing budget item:', err);
      throw err;
    }
  };

  // City management
  const addCityToTrip = async (
    tripId: string,
    cityData: {
      city_id: string;
      name: string;
      country: string;
      start_date?: string;
      end_date?: string;
      notes?: string;
    }
  ) => {
    try {
      const updatedTrip = await tripService.addCityToTrip(tripId, cityData);
      setCurrentTrip(updatedTrip);
      setTrips(prev => prev.map(trip => trip.id === tripId ? updatedTrip : trip));
      
      toast({
        title: 'City added!',
        description: `${cityData.name} has been added to your trip.`,
      });
      
      return updatedTrip;
    } catch (err) {
      console.error('Error adding city to trip:', err);
      toast({
        title: 'Error',
        description: 'Failed to add city to trip. Please try again.',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const removeCityFromTrip = async (tripId: string, cityId: string) => {
    try {
      await tripService.removeCityFromTrip(tripId, cityId);
      // Reload the trip to get updated data
      return loadTrip(tripId);
    } catch (err) {
      console.error('Error removing city from trip:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove city from trip. Please try again.',
        variant: 'destructive',
      });
      throw err;
    }
  };

  return {
    trips,
    currentTrip,
    isLoading,
    isSaving,
    isDeleting,
    error,
    loadTrips,
    loadTrip,
    createTrip,
    updateTrip,
    deleteTrip,
    handleDeleteTrip,
    addActivity,
    updateActivity,
    removeActivity,
    addBudgetItem,
    updateBudgetItem,
    removeBudgetItem,
    addCityToTrip,
    removeCityFromTrip,
  };
};
