import { useState } from 'react';
import { useForm, FormProvider, useFormContext, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, MapPin, Plus, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Trip, TripFormData } from '@/types/trip';

// Form Schema
const tripFormSchema = z.object({
  name: z.string().min(2, 'Trip name is required').max(100),
  description: z.string().optional(),
  destination: z.string().min(2, 'Destination is required'),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date({
    required_error: 'End date is required',
  }),
  coverPhotoUrl: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

type TripFormValues = z.infer<typeof tripFormSchema>;

// Step 1: Basic Info
function BasicInfoStep() {
  const { register, formState: { errors }, watch, setValue } = useFormContext<TripFormValues>();
  const [tagInput, setTagInput] = useState('');
  const tags = watch('tags') || [];

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setValue('tags', [...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('tags', tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Basic Information</h2>
        <p className="text-sm text-muted-foreground">
          Provide some basic details about your trip.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Trip Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Summer Vacation 2023"
            {...register('name')}
            className={cn(errors.name && 'border-destructive')}
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="destination">Destination *</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="destination"
              placeholder="Where are you going?"
              className={cn('pl-10', errors.destination && 'border-destructive')}
              {...register('destination')}
            />
          </div>
          {errors.destination && (
            <p className="text-sm text-destructive mt-1">{errors.destination.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Start Date *</Label>
            <Controller
              name="startDate"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground',
                        errors.startDate && 'border-destructive'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.startDate && (
              <p className="text-sm text-destructive mt-1">{errors.startDate.message}</p>
            )}
          </div>

          <div>
            <Label>End Date *</Label>
            <Controller
              name="endDate"
              render={({ field, fieldState }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground',
                        fieldState.error && 'border-destructive'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.endDate && (
              <p className="text-sm text-destructive mt-1">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Tell us about your trip..."
            className="min-h-[100px]"
            {...register('description')}
          />
        </div>

        <div>
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Add a tag and press Enter"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <Label htmlFor="isPublic" className="flex flex-col space-y-1">
              <span>Make this trip public</span>
              <span className="text-xs font-normal text-muted-foreground">
                {watch('isPublic')
                  ? 'Anyone with the link can view this trip'
                  : 'Only you can view this trip'}
              </span>
            </Label>
          </div>
          <Controller
            name="isPublic"
            render={({ field }) => (
              <Switch
                id="isPublic"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}

// Step 2: Cover Photo
function CoverPhotoStep() {
  const { register, watch, setValue } = useFormContext<TripFormValues>();
  const coverPhotoUrl = watch('coverPhotoUrl');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('coverPhotoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Cover Photo</h2>
        <p className="text-sm text-muted-foreground">
          Add a beautiful cover photo for your trip. (Optional)
        </p>
      </div>

      <div className="space-y-4">
        {coverPhotoUrl ? (
          <div className="relative group">
            <img
              src={coverPhotoUrl}
              alt="Trip cover"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => setValue('coverPhotoUrl', '')}
              className="absolute top-2 right-2 p-2 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-2">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop an image, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Recommended size: 1200x400px (max 5MB)
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => document.getElementById('cover-photo')?.click()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Upload Photo
              </Button>
              <input
                id="cover-photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 3: Review
function ReviewStep() {
  const { getValues } = useFormContext<TripFormValues>();
  const values = getValues();
  
  const tripDuration = Math.ceil(
    (new Date(values.endDate).getTime() - new Date(values.startDate).getTime()) / (1000 * 60 * 60 * 24) + 1
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Review Your Trip</h2>
        <p className="text-sm text-muted-foreground">
          Make sure everything looks good before creating your trip.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="font-medium">Trip Details</h3>
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="grid gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Trip Name</p>
                <p className="font-medium">{values.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Destination</p>
                <p className="font-medium">{values.destination}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {format(new Date(values.startDate), 'PPP')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {format(new Date(values.endDate), 'PPP')}
                    <span className="text-muted-foreground text-sm ml-2">
                      ({tripDuration} {tripDuration === 1 ? 'day' : 'days'})
                    </span>
                  </p>
                </div>
              </div>
              {values.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="whitespace-pre-line">{values.description}</p>
                </div>
              )}
              {values.tags?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {values.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Visibility</p>
                <p className="font-medium">
                  {values.isPublic ? 'Public' : 'Private'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {values.coverPhotoUrl && (
          <div className="space-y-2">
            <h3 className="font-medium">Cover Photo</h3>
            <div className="border rounded-lg overflow-hidden">
              <img
                src={values.coverPhotoUrl}
                alt="Trip cover preview"
                className="w-full h-48 object-cover"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Form Component
interface TripFormProps {
  defaultValues?: Partial<TripFormValues>;
  onSubmit: (data: TripFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function TripForm({ defaultValues, onSubmit, isSubmitting = false }: TripFormProps) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      name: '',
      description: '',
      destination: '',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isPublic: false,
      tags: [],
      ...defaultValues,
    },
  });

  const steps = [
    { title: 'Basic Info', component: <BasicInfoStep /> },
    { title: 'Cover Photo', component: <CoverPhotoStep /> },
    { title: 'Review', component: <ReviewStep /> },
  ];

  const handleNext = async () => {
    const fields = Object.keys(tripFormSchema.shape);
    const output = await form.trigger(fields as (keyof TripFormValues)[]);
    
    if (!output) return;
    
    if (step === steps.length - 1) {
      await form.handleSubmit(onSubmit)();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      navigate(-1);
    } else {
      setStep(step - 1);
    }
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {defaultValues?.name ? 'Edit Trip' : 'Create New Trip'}
            </h1>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                {step === 0 ? 'Cancel' : 'Back'}
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2">Saving...</span>
                  </>
                ) : step === steps.length - 1 ? (
                  'Create Trip'
                ) : (
                  'Next'
                )}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              {steps.map((s, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full',
                      i === step
                        ? 'bg-primary text-primary-foreground'
                        : i < step
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                      'transition-colors'
                    )}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={cn(
                      'mt-1 text-xs',
                      i === step ? 'font-medium' : 'text-muted-foreground'
                    )}
                  >
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
            <Progress
              value={((step + 1) / steps.length) * 100}
              className="h-1"
            />
          </div>
        </div>

        <div className="space-y-6">
          {steps[step].component}
        </div>
      </form>
    </FormProvider>
  );
}
