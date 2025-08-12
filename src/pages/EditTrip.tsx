import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TripForm from '@/components/trips/TripForm';
import { Trip, TripFormValues } from '@/types/trip';
import { useAuth } from '@/context/AuthContext';

// Mock function to fetch a trip by ID
const fetchTrip = async (tripId: string): Promise<Trip> => {
  // In a real app, this would be an API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const trips = JSON.parse(localStorage.getItem('trips') || '[]');
      const trip = trips.find((t: Trip) => t.id === tripId);
      resolve(trip);
    }, 500);
  });
};

// Mock function to save a trip
const saveTrip = async (tripData: TripFormValues, tripId?: string): Promise<Trip> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const trips = JSON.parse(localStorage.getItem('trips') || '[]');
      const now = new Date().toISOString();
      
      if (tripId) {
        // Update existing trip
        const index = trips.findIndex((t: Trip) => t.id === tripId);
        if (index !== -1) {
          const updatedTrip = {
            ...trips[index],
            ...tripData,
            updatedAt: now,
          };
          trips[index] = updatedTrip;
          localStorage.setItem('trips', JSON.stringify(trips));
          resolve(updatedTrip);
        }
      } else {
        // Create new trip
        const newTrip: Trip = {
          id: `trip_${Date.now()}`,
          ...tripData,
          activities: {},
          itinerary: [],
          budget: [],
          collaborators: [],
          createdAt: now,
          updatedAt: now,
          userId: 'current-user-id', // This would come from auth context in a real app
        };
        trips.push(newTrip);
        localStorage.setItem('trips', JSON.stringify(trips));
        resolve(newTrip);
      }
    }, 1000);
  });
};

export default function EditTrip() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(!!id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!id;

  // Fetch trip data if in edit mode
  useEffect(() => {
    if (!id) return;

    const loadTrip = async () => {
      try {
        const data = await fetchTrip(id);
        if (!data) {
          toast({
            title: 'Error',
            description: 'Trip not found',
            variant: 'destructive',
          });
          navigate('/trips');
          return;
        }
        
        // Check if user has permission to edit
        if (data.userId !== user?.id) {
          toast({
            title: 'Permission Denied',
            description: 'You do not have permission to edit this trip',
            variant: 'destructive',
          });
          navigate(`/trips/${id}`);
          return;
        }
        
        setTrip(data);
      } catch (error) {
        console.error('Failed to load trip:', error);
        toast({
          title: 'Error',
          description: 'Failed to load trip. Please try again.',
          variant: 'destructive',
        });
        navigate('/trips');
      } finally {
        setIsLoading(false);
      }
    };

    loadTrip();
  }, [id, navigate, toast, user?.id]);

  const handleSubmit = async (data: TripFormValues) => {
    try {
      setIsSubmitting(true);
      const savedTrip = await saveTrip(data, id);
      
      toast({
        title: isEditing ? 'Trip updated' : 'Trip created',
        description: isEditing 
          ? 'Your trip has been successfully updated.'
          : 'Your new trip has been created successfully!',
      });
      
      navigate(`/trips/${savedTrip.id}`);
    } catch (error) {
      console.error('Error saving trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to save trip. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <Button
        variant="ghost"
        className="mb-6 -ml-2"
        onClick={() => navigate(isEditing && trip ? `/trips/${trip.id}` : '/trips')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to {isEditing ? 'Trip' : 'Trips'}
      </Button>
      
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? 'Edit Trip' : 'Create New Trip'}
        </h1>
        <p className="text-muted-foreground">
          {isEditing 
            ? 'Update your trip details below.'
            : 'Fill out the form below to create a new trip.'}
        </p>
      </div>
      
      <TripForm
        defaultValues={trip || undefined}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
