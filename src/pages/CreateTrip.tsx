import { useState, useCallback, useRef } from 'react';
import { useForm, FormProvider, SubmitHandler, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { generateId } from '@/lib/id';
import { upsertTrip } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import type { Trip } from '@/types/trip.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, MapPin, Upload, Camera, Sparkles, Sun, Mountain, Palette, Crown, Wallet, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';

// Trip Mood Types
type TripMood = 'Adventure' | 'Relaxation' | 'Cultural' | 'Luxury' | 'Budget';

const TRIP_MOODS: { value: TripMood; label: string; icon: any; color: string; description: string }[] = [
  { value: 'Adventure', label: 'Adventure', icon: Mountain, color: 'text-orange-500', description: 'Thrilling experiences and outdoor activities' },
  { value: 'Relaxation', label: 'Relaxation', icon: Sun, color: 'text-blue-500', description: 'Peaceful moments and rejuvenation' },
  { value: 'Cultural', label: 'Cultural', icon: Palette, color: 'text-purple-500', description: 'Museums, history, and local traditions' },
  { value: 'Luxury', label: 'Luxury', icon: Crown, color: 'text-yellow-500', description: 'Premium experiences and comfort' },
  { value: 'Budget', label: 'Budget', icon: Wallet, color: 'text-green-500', description: 'Smart spending and great value' },
];

// Form Schema
const tripFormSchema = z.object({
  name: z.string().min(3, 'Trip name must be at least 3 characters'),
  description: z.string().optional(),
  destination: z.string().min(3, 'Please enter a destination'),
  startDate: z.date({
    required_error: 'Please select a start date',
  }),
  endDate: z.date({
    required_error: 'Please select an end date',
  }),
  coverPhoto: z.instanceof(File).optional(),
  mood: z.enum(['Adventure', 'Relaxation', 'Cultural', 'Luxury', 'Budget']).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
});

type TripFormValues = z.infer<typeof tripFormSchema>;

// Visual Inspiration Panel Component
const VisualInspirationPanel = ({ destination, startDate, endDate }: { destination?: string; startDate?: Date; endDate?: Date }) => {
  const inspirationImages = [
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Travel Inspiration
        </h3>
        <p className="text-sm text-muted-foreground">
          {destination ? `Discover ${destination}` : 'Enter a destination to see inspiration'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {inspirationImages.map((image, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative overflow-hidden rounded-lg aspect-video"
          >
            <img
              src={image}
              alt={`Inspiration ${index + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </motion.div>
        ))}
      </div>

      {destination && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border"
        >
          <h4 className="font-medium text-sm mb-2">Weather & Highlights</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sun className="h-3 w-3" />
              <span>Perfect weather for exploring</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-3 w-3" />
              <span>Peak season for local festivals</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Trip Mood Selector Component
const TripMoodSelector = ({ value, onChange }: { value?: TripMood; onChange: (mood: TripMood) => void }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Trip Mood</label>
        <p className="text-xs text-muted-foreground mb-4">Choose the vibe that matches your travel style</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {TRIP_MOODS.map((mood) => {
          const Icon = mood.icon;
          const isSelected = value === mood.value;
          
          return (
            <motion.button
              key={mood.value}
              type="button"
              onClick={() => onChange(mood.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon className={cn("h-5 w-5", mood.color)} />
                <span className="font-medium text-sm">{mood.label}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {mood.description}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// Enhanced Cover Photo Upload Component
const CoverPhotoUpload = ({ value, onChange }: { value?: File; onChange: (file?: File) => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onChange(file);
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    }
  }, [onChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onChange(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium mb-2">Cover Photo</label>
      
      <motion.div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
          dragActive 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => {
                onChange(undefined);
                setPreview(null);
              }}
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">Drop your photo here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              Choose Photo
            </Button>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </motion.div>

      <div className="grid grid-cols-3 gap-2">
        {['mountain', 'beach', 'city'].map((type, index) => (
          <motion.button
            key={type}
            type="button"
            whileHover={{ scale: 1.02 }}
            className="relative h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary/50"
          >
            <img
              src={`https://images.unsplash.com/photo-${index === 0 ? '1506905925346-21bda4d32df4' : index === 1 ? '1507525428034-b723cf961d3e' : '1449824913935-59a10b8d2000'}?w=200&h=100&fit=crop`}
              alt={`${type} suggestion`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <span className="text-white text-xs font-medium capitalize">{type}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Enhanced Date Picker Component
const AnimatedDatePicker = ({ value, onChange, label, placeholder, disabled = false }: {
  value?: Date;
  onChange: (date?: Date) => void;
  label: string;
  placeholder: string;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                'w-full justify-start text-left font-normal h-12 border-2 transition-all duration-200',
                !value && 'text-muted-foreground',
                isOpen && 'border-primary shadow-md',
                !disabled && 'hover:border-primary/50'
              )}
            >
              <CalendarIcon className="mr-3 h-5 w-5" />
              {value ? format(value, 'PPP') : <span>{placeholder}</span>}
            </Button>
          </motion.div>
        </PopoverTrigger>
        <AnimatePresence>
          {isOpen && (
            <PopoverContent className="w-auto p-0" asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Calendar
                  mode="single"
                  selected={value}
                  onSelect={(date) => {
                    onChange(date);
                    setIsOpen(false);
                  }}
                  initialFocus
                  fromDate={new Date()}
                />
              </motion.div>
            </PopoverContent>
          )}
        </AnimatePresence>
      </Popover>
    </div>
  );
};

// AI-Assisted Trip Title Suggestions
const TripTitleSuggestions = ({ destination, onSelect }: { destination?: string; onSelect: (title: string) => void }) => {
  const suggestions = destination ? [
    `${destination} Adventure 2024`,
    `Discovering ${destination}`,
    `${destination} Memories`,
    `Journey to ${destination}`
  ] : [];

  if (!destination || suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2"
    >
      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
        <Sparkles className="h-3 w-3" />
        AI suggestions
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            type="button"
            onClick={() => onSelect(suggestion)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-3 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-full border border-primary/20 transition-colors"
          >
            {suggestion}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

const CreateTrip = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      name: '',
      description: '',
      destination: '',
      isPublic: false,
    },
  });
  
  const onSubmit: SubmitHandler<TripFormValues> = async (data) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }
    
    try {
      const id = generateId('trip');
      const now = new Date().toISOString();
      
      // Handle file upload if cover photo exists
      let coverPhotoUrl = '';
      if (data.coverPhoto) {
        // In a real app, upload the file to a storage service
        // For now, we'll just store the file name
        coverPhotoUrl = `uploads/${id}-${data.coverPhoto.name}`;
      }

      const trip: Trip = {
        id,
        name: data.name,
        description: data.description || '',
        destination: data.destination,
        startDate: data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate,
        endDate: data.endDate instanceof Date ? data.endDate.toISOString() : data.endDate,
        coverPhotoUrl,
        activities: {},
        itinerary: [],
        budget: [],
        createdAt: now,
        updatedAt: now,
        userId: user.id,
        isPublic: data.isPublic || false,
        tags: data.tags || [],
        collaborators: [],
        settings: {
          currency: 'USD',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          notifications: true,
        },
      };
      
      await upsertTrip(trip);
      
      // Store the last viewed trip ID for navigation
      localStorage.setItem('lastViewedTripId', id);
      
      // Navigate to the new trip's itinerary
      navigate(`/itinerary/${id}`);
    } catch (error) {
      console.error('Failed to create trip:', error);
      // In a real app, show a toast notification to the user
      alert('Failed to create trip. Please try again.');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <FormProvider {...form}>
        <main className="container py-8 max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Create Your Dream Trip
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Let your adventure begin! Design an immersive travel experience that captures every moment of your journey.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Form Section */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                      {/* Trip Name Section */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-lg font-semibold mb-2">Trip Name *</label>
                          <Input
                            placeholder="My Amazing Adventure..."
                            className="h-12 text-lg border-2 focus:border-primary"
                            {...form.register('name')}
                          />
                          {form.formState.errors.name && (
                            <p className="text-sm text-destructive mt-1">
                              {form.formState.errors.name.message}
                            </p>
                          )}
                          <TripTitleSuggestions
                            destination={form.watch('destination')}
                            onSelect={(title) => form.setValue('name', title)}
                          />
                        </div>
                      </div>

                      {/* Destination Section */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-lg font-semibold mb-2">Destination *</label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Where will your story unfold?"
                              className="h-12 text-lg pl-12 border-2 focus:border-primary"
                              {...form.register('destination')}
                            />
                          </div>
                          {form.formState.errors.destination && (
                            <p className="text-sm text-destructive mt-1">
                              {form.formState.errors.destination.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Travel Dates Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Travel Dates *</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <AnimatedDatePicker
                            value={form.watch('startDate')}
                            onChange={(date) => form.setValue('startDate', date as Date)}
                            label="Start Date"
                            placeholder="When does the adventure begin?"
                          />
                          <AnimatedDatePicker
                            value={form.watch('endDate')}
                            onChange={(date) => form.setValue('endDate', date as Date)}
                            label="End Date"
                            placeholder="When do you return?"
                            disabled={!form.watch('startDate')}
                          />
                        </div>
                      </div>

                      {/* Trip Description */}
                      <div className="space-y-4">
                        <label className="block text-lg font-semibold">Trip Description</label>
                        <Textarea
                          placeholder="Share the story of your upcoming adventure..."
                          rows={4}
                          className="border-2 focus:border-primary resize-none"
                          {...form.register('description')}
                        />
                      </div>

                      {/* Trip Mood Selector */}
                      <TripMoodSelector
                        value={form.watch('mood')}
                        onChange={(mood) => form.setValue('mood', mood)}
                      />

                      {/* Cover Photo Upload */}
                      <CoverPhotoUpload
                        value={form.watch('coverPhoto')}
                        onChange={(file) => form.setValue('coverPhoto', file)}
                      />

                      {/* Save & Continue Button */}
                      <motion.div
                        className="pt-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Button
                          type="submit"
                          size="lg"
                          className={cn(
                            "w-full h-14 text-lg font-semibold transition-all duration-300",
                            "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                            "shadow-lg hover:shadow-xl transform hover:scale-[1.02]",
                            form.formState.isValid && "animate-pulse"
                          )}
                          disabled={!form.formState.isValid}
                        >
                          <Sparkles className="mr-2 h-5 w-5" />
                          Save & Continue Your Journey
                        </Button>
                      </motion.div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Visual Inspiration Panel */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky top-8"
              >
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <VisualInspirationPanel
                      destination={form.watch('destination')}
                      startDate={form.watch('startDate')}
                      endDate={form.watch('endDate')}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </main>
      </FormProvider>
    </div>
  );
};

export default CreateTrip;
