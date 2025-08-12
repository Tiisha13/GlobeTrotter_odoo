import { format, isSameDay, addDays, parseISO, isAfter, isBefore, isEqual, parseISO as parseDate } from 'date-fns';
import { Plus, Clock, MapPin, Trash2, Pencil, MoreHorizontal, Search } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Trip, Activity } from '@/types/trip';
import { DragAndDropContextWrapper, DroppableContainer, DraggableItem, move } from './DragAndDropContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import ActivitySearch from './ActivitySearch';  // Changed to default import
import { v4 as uuidv4 } from 'uuid';

// Local cn utility to avoid import conflict
const mergeClasses = (...classes: (string | undefined)[]): string => {
  return classes.filter(Boolean).join(' ');
};

interface ItineraryViewProps {
  trip: Trip;
  onActivityUpdate?: (activities: Record<string, Activity>) => void;
  onItineraryUpdate?: (itinerary: { date: string; activities: Activity[] }[]) => void;
  isEditable?: boolean;
  onAddActivity?: (date: Date) => void;
  onEditActivity?: (activity: Activity) => void;
  onActivityAdded?: (activity: Activity) => void;
}

// Helper function to ensure proper type checking with clsx/tailwind-merge
function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ItineraryView({ 
  trip, 
  onActivityUpdate, 
  onItineraryUpdate, 
  isEditable = false,
  onAddActivity,
  onEditActivity,
  onActivityAdded
}: ItineraryViewProps) {
  const [activeTab, setActiveTab] = useState('itinerary');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState<Date | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  
  // Generate an array of dates for the trip
  const tripDates = (() => {
    if (!trip.startDate || !trip.endDate) return [];
    
    const start = typeof trip.startDate === 'string' ? new Date(trip.startDate) : trip.startDate;
    const end = typeof trip.endDate === 'string' ? new Date(trip.endDate) : trip.endDate;
    
    const dates = [];
    let currentDate = start;
    
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    return dates;
  })();
  
  // Group activities by date
  const activitiesByDate = trip.itinerary.reduce<Record<string, Activity[]>>((acc, day) => {
    acc[day.date] = day.activities;
    return acc;
  }, {});

  // Handle adding a new activity from search
  const handleAddActivityFromSearch = useCallback((activity: Activity) => {
    if (!searchDate) return;
    
    const activityWithId = {
      ...activity,
      id: activity.id || `act-${uuidv4()}`,
      startTime: new Date(
        searchDate.getFullYear(),
        searchDate.getMonth(),
        searchDate.getDate(),
        new Date(activity.startTime).getHours(),
        new Date(activity.startTime).getMinutes()
      ).toISOString(),
      endTime: activity.endTime ? new Date(
        searchDate.getFullYear(),
        searchDate.getMonth(),
        searchDate.getDate(),
        new Date(activity.endTime).getHours(),
        new Date(activity.endTime).getMinutes()
      ).toISOString() : undefined
    };
    
    // Update the activities in the trip
    const dateKey = searchDate.toISOString().split('T')[0];
    const updatedActivities = {
      ...trip.activities,
      [activityWithId.id]: activityWithId
    };
    
    // Update the itinerary to include the new activity
    const updatedItinerary = trip.itinerary.map(day => {
      if (day.date === dateKey) {
        return {
          ...day,
          activities: [...day.activities, activityWithId].sort((a, b) => 
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          )
        };
      }
      return day;
    });
    
    // Call the update handlers
    onActivityUpdate?.(updatedActivities);
    onItineraryUpdate?.(updatedItinerary);
    onActivityAdded?.(activityWithId);
    
    // Reset search
    setSearchTerm('');
    setSearchDate(null);
    setActiveTab('itinerary');
  }, [searchDate, trip.activities, trip.itinerary, onActivityUpdate, onItineraryUpdate, onActivityAdded]);
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    // In a real app, you would make an API call here
    setTimeout(() => {
      setIsSearching(false);
    }, 1000);
  };
  
  // Handle selecting a date for activity search
  const handleSelectDateForSearch = (date: Date) => {
    setSearchDate(date);
    setActiveTab('search');
  };

  // Handle drag and drop
  const onDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;
    
    // Dropped outside any droppable area
    if (!destination) return;
    
    // No change in position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    
    // Find the activity being dragged
    const activity = Object.values(trip.activities || {}).find(a => a.id === draggableId);
    if (!activity || !onActivityUpdate) return;
    
    // Moving within the same day (reordering)
    if (source.droppableId === destination.droppableId) {
      const activities = [...activitiesByDate[source.droppableId]];
      const [removed] = activities.splice(source.index, 1);
      activities.splice(destination.index, 0, removed);
      
      // Update the activities with new order
      const updatedActivities = { ...trip.activities };
      activities.forEach((act, index) => {
        updatedActivities[act.id] = { ...act, order: index };
      });
      
      onActivityUpdate(updatedActivities);
      return;
    }
    
    // Moving between days
    const sourceActivities = [...activitiesByDate[source.droppableId]];
    const destActivities = [...(activitiesByDate[destination.droppableId] || [])];
    
    const [movedActivity] = sourceActivities.splice(source.index, 1);
    
    // Update the activity's date
    const newDate = parseISO(destination.droppableId);
    const updatedActivity = {
      ...movedActivity,
      startTime: newDate.toISOString(),
      // If there's an end time, maintain the same duration
      endTime: movedActivity.endTime
        ? new Date(
            newDate.getTime() + 
            (new Date(movedActivity.endTime).getTime() - new Date(movedActivity.startTime).getTime())
          ).toISOString()
        : undefined
    };
    
    // Insert at the new position
    destActivities.splice(destination.index, 0, updatedActivity);
    
    // Update all activities
    const updatedActivities = { ...trip.activities };
    
    // Remove from source day
    sourceActivities.forEach((act, index) => {
      updatedActivities[act.id] = { ...act, order: index };
    });
    
    // Add to destination day
    destActivities.forEach((act, index) => {
      updatedActivities[act.id] = { ...act, order: index };
    });
    
    // If the activity was moved to a new day, ensure it's in the activities object
    if (!updatedActivities[movedActivity.id]) {
      updatedActivities[movedActivity.id] = updatedActivity;
    }
    
    onActivityUpdate(updatedActivities);
  };
  
  const handleDeleteActivity = (activityId: string) => {
    if (!onActivityUpdate) return;
    
    const updatedActivities = { ...trip.activities };
    delete updatedActivities[activityId];
    onActivityUpdate(updatedActivities);
    
    toast({
      title: 'Activity deleted',
      description: 'The activity has been removed from your itinerary.',
    });
  };
  
  const getActivityTimeString = (activity: Activity) => {
    if (!activity.startTime) return 'All day';
    
    const start = typeof activity.startTime === 'string' 
      ? new Date(activity.startTime) 
      : activity.startTime;
    
    if (!activity.endTime) {
      return format(start, 'h:mm a');
    }
    
    const end = typeof activity.endTime === 'string' 
      ? new Date(activity.endTime) 
      : activity.endTime;
    
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };
  
  const getActivityCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      accommodation: 'bg-blue-100 text-blue-800',
      transport: 'bg-green-100 text-green-800',
      food: 'bg-yellow-100 text-yellow-800',
      activity: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800',
    };
    
    return colors[category] || colors.other;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Itinerary</h2>
        {isEditable && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveTab(prev => prev === 'search' ? 'itinerary' : 'search')}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {activeTab === 'search' ? 'Hide Search' : 'Find Activities'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const today = new Date();
                onAddActivity?.(today);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Activity
            </Button>
          </div>
        )}
      </div>
      
      {activeTab === 'search' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Find Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivitySearch 
              onSelectActivity={handleAddActivityFromSearch}
              selectedDate={searchDate || new Date()}
              className="mb-4"
            />
            {!searchDate && (
              <div className="text-center py-4 text-muted-foreground">
                <p>Select a date below to add activities to your itinerary</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <DragAndDropContextWrapper activities={trip.activities || {}} onDragEnd={onDragEnd}>
        <div className="space-y-8">
          {trip.itinerary.map((day, index) => {
            const dateStr = day.date;
            const activities = activitiesByDate[dateStr] || [];
            const formattedDate = format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
            const isPastDate = isBefore(parseISO(dateStr), new Date()) && !isSameDay(parseISO(dateStr), new Date());
            
            return (
              <Card key={dateStr} id={dateStr} className={cn(
                "overflow-hidden",
                isPastDate && 'opacity-70 hover:opacity-100 transition-opacity'
              )}>
                <CardHeader className={cn(
                  "py-3 px-4",
                  isPastDate ? 'bg-muted/30' : 'bg-muted/50'
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium">
                      {format(parseISO(day.date), 'EEEE, MMMM d')}
                    </h3>
                    {isEditable && (
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground h-8"
                          onClick={() => handleSelectDateForSearch(new Date(day.date))}
                        >
                          <Search className="h-4 w-4 mr-1" />
                          Find Activities
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground h-8"
                          onClick={() => onAddActivity?.(new Date(day.date))}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Custom
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  <DroppableContainer droppableId={dateStr}>
                    {activities.length > 0 ? (
                      <div className="divide-y">
                        {activities.map((activity, idx) => (
                          <DraggableItem 
                            key={activity.id} 
                            draggableId={activity.id} 
                            index={idx}
                            isDragDisabled={!isEditable}
                          >
                            <div className="group relative p-4 hover:bg-muted/30 transition-colors">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                </div>
                                
                                <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{getActivityTimeString(activity)}</span>
                                  </div>
                                  
                                  {activity.location && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                      <span>{activity.location}</span>
                                    </div>
                                  )}
                                  
                                  {activity.notes && (
                                    <p className="mt-2 text-foreground">{activity.notes}</p>
                                  )}
                                  
                                  {(activity.cost || activity.website) && (
                                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-muted">
                                      {activity.cost !== undefined && activity.cost > 0 && (
                                        <span className="text-sm font-medium">
                                          ${activity.cost.toFixed(2)}
                                        </span>
                                      )}
                                      {activity.website && (
                                        <a 
                                          href={activity.website} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-sm text-primary hover:underline flex items-center gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                            <polyline points="15 3 21 3 21 9"></polyline>
                                            <line x1="10" y1="14" x2="21" y2="3"></line>
                                          </svg>
                                          Website
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {isEditable && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">More options</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onEditActivity) onEditActivity(activity);
                                      }}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteActivity(activity.id);
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>Delete</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                          </div>
                        </DraggableItem>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-muted-foreground">
                        No activities planned for this day.
                      </p>
                      {isEditable && onAddActivity && (
                        Button && (
                          <Button 
                            variant="ghost" 
                            className="mt-2 text-primary"
                            onClick={() => onAddActivity(date)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add your first activity
                          </Button>
                        )
                      )}
                    </div>
                  )}
                </DroppableContainer>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DragAndDropContextWrapper>
  );
}

// Helper function to ensure proper type checking with clsx/tailwind-merge
function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
