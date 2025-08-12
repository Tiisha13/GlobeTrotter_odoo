import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { X, MapPin, Clock, Calendar, Tag, BookOpen, DollarSign, Link as LinkIcon } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { useToast } from '@/components/ui/use-toast';
import { Activity } from '@/types/trip';

const activityCategories = [
  { value: 'activity', label: 'Activity' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'transport', label: 'Transport' },
  { value: 'food', label: 'Food & Drink' },
  { value: 'other', label: 'Other' },
];

const activityFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  date: z.date({
    required_error: 'Date is required',
  }),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  cost: z.number().optional(),
  bookingReference: z.string().optional(),
  website: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

interface ActivityFormProps {
  activity?: Activity | null;
  defaultDate?: Date;
  onSave: (activity: Omit<Activity, 'id'>) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function ActivityForm({ 
  activity, 
  defaultDate,
  onSave, 
  onCancel,
  isSaving = false 
}: ActivityFormProps) {
  const { toast } = useToast();
  const isEditing = !!activity;
  
  const defaultValues: Partial<ActivityFormValues> = {
    name: activity?.name || '',
    category: activity?.category || '',
    date: activity?.startTime 
      ? typeof activity.startTime === 'string' 
        ? parseISO(activity.startTime) 
        : activity.startTime
      : defaultDate || new Date(),
    startTime: activity?.startTime 
      ? typeof activity.startTime === 'string' 
        ? parseISO(activity.startTime)
        : activity.startTime
      : undefined,
    endTime: activity?.endTime
      ? typeof activity.endTime === 'string'
        ? parseISO(activity.endTime)
        : activity.endTime
      : undefined,
    location: activity?.location || '',
    notes: activity?.notes || '',
    cost: activity?.cost,
    bookingReference: activity?.bookingReference || '',
    website: activity?.website || '',
  };

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues,
  });

  const { register, handleSubmit, control, watch, formState: { errors }, setValue } = form;
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isAllDay, setIsAllDay] = useState(!activity?.startTime);
  
  const selectedDate = watch('date');
  const startTime = watch('startTime');
  
  // Set default times when date changes and all-day is not selected
  useEffect(() => {
    if (!isAllDay && selectedDate && !startTime) {
      const defaultTime = new Date(selectedDate);
      defaultTime.setHours(9, 0, 0, 0); // Default to 9:00 AM
      setValue('startTime', defaultTime);
      
      const endTime = new Date(defaultTime);
      endTime.setHours(10, 0, 0, 0); // Default to 10:00 AM
      setValue('endTime', endTime);
    }
  }, [selectedDate, isAllDay, startTime, setValue]);

  const onSubmit = (data: ActivityFormValues) => {
    // Combine date with time for start and end times
    const startDateTime = data.startTime
      ? new Date(
          data.date.getFullYear(),
          data.date.getMonth(),
          data.date.getDate(),
          data.startTime.getHours(),
          data.startTime.getMinutes()
        )
      : new Date(
          data.date.getFullYear(),
          data.date.getMonth(),
          data.date.getDate()
        );
    
    let endDateTime = null;
    if (data.endTime) {
      endDateTime = new Date(
        data.date.getFullYear(),
        data.date.getMonth(),
        data.date.getDate(),
        data.endTime.getHours(),
        data.endTime.getMinutes()
      );
    }
    
    const activityData: Omit<Activity, 'id'> = {
      name: data.name,
      category: data.category as any,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime?.toISOString(),
      location: data.location,
      notes: data.notes,
      cost: data.cost,
      bookingReference: data.bookingReference,
      website: data.website,
    };
    
    onSave(activityData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Activity Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Visit Eiffel Tower"
            {...register('name')}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category *</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category && (
              <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
            )}
          </div>
          
          <div>
            <Label>Date *</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        errors.date ? 'border-destructive' : ''
                      }`}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.date && (
              <p className="text-sm text-destructive mt-1">{errors.date.message}</p>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allDay"
              checked={isAllDay}
              onChange={(e) => {
                setIsAllDay(e.target.checked);
                if (e.target.checked) {
                  setValue('startTime', undefined);
                  setValue('endTime', undefined);
                } else {
                  const defaultTime = new Date(selectedDate);
                  defaultTime.setHours(9, 0, 0, 0);
                  setValue('startTime', defaultTime);
                  
                  const endTime = new Date(defaultTime);
                  endTime.setHours(10, 0, 0, 0);
                  setValue('endTime', endTime);
                }
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="allDay" className="text-sm font-medium leading-none">
              All-day activity
            </Label>
          </div>
          
          {!isAllDay && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Controller
                  name="startTime"
                  control={control}
                  render={({ field }) => (
                    <Popover open={showTimePicker} onOpenChange={setShowTimePicker}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'h:mm a') : 'Select time'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <TimePicker
                          date={field.value || new Date()}
                          setDate={(date) => {
                            field.onChange(date);
                            setShowTimePicker(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
              
              <div>
                <Label>End Time (optional)</Label>
                <Controller
                  name="endTime"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'h:mm a') : 'Select time'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <TimePicker
                          date={field.value || new Date()}
                          setDate={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
            </div>
          )}
        </div>
        
        <div>
          <Label htmlFor="location">Location</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="location"
              placeholder="e.g., 123 Main St, City, Country"
              className="pl-10"
              {...register('location')}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Add any additional details about this activity..."
            className="min-h-[100px]"
            {...register('notes')}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cost">Estimated Cost</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-10"
                {...register('cost', { valueAsNumber: true })}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="bookingReference">Booking Reference</Label>
            <Input
              id="bookingReference"
              placeholder="e.g., ABC123"
              {...register('bookingReference')}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="website">Website</Label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="website"
              type="url"
              placeholder="https://example.com"
              className="pl-10"
              {...register('website')}
            />
          </div>
          {errors.website && (
            <p className="text-sm text-destructive mt-1">{errors.website.message}</p>
          )}
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <span className="mr-2">Saving...</span>
            </>
          ) : isEditing ? (
            'Update Activity'
          ) : (
            'Add Activity'
          )}
        </Button>
      </div>
    </form>
  );
}
