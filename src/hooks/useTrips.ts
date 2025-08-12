import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Trip, TripFormValues } from '@/types/trip';

// Mock function to delete a trip
const deleteTrip = async (tripId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const trips = JSON.parse(localStorage.getItem('trips') || '[]');
        const updatedTrips = trips.filter((trip: Trip) => trip.id !== tripId);
        localStorage.setItem('trips', JSON.stringify(updatedTrips));
        resolve(true);
      } catch (error) {
        console.error('Error deleting trip:', error);
        resolve(false);
      }
    }, 500);
  });
};

export const useTrips = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDeleteTrip = async (tripId: string) => {
    try {
      setIsDeleting(true);
      const success = await deleteTrip(tripId);
      
      if (success) {
        toast({
          title: 'Trip deleted',
          description: 'Your trip has been successfully deleted.',
        });
        navigate('/trips');
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

  const confirmDelete = (tripId: string) => {
    setTripToDelete(tripId);
  };

  const cancelDelete = () => {
    setTripToDelete(null);
  };

  return {
    isDeleting,
    tripToDelete,
    handleDeleteTrip,
    confirmDelete,
    cancelDelete,
  };
};
