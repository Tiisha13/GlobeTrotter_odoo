import { format, formatDistance, isBefore, isAfter, isToday } from 'date-fns';
import { MapPin, Calendar, Users, Tag, Pencil, Trash2, Share2, Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trip } from '@/types/trip';
import { Link } from 'react-router-dom';

interface TripDetailProps {
  trip: Trip;
  onDelete: (tripId: string) => void;
  onShare: (tripId: string) => void;
  isOwner: boolean;
}

export default function TripDetail({ trip, onDelete, onShare, isOwner }: TripDetailProps) {
  const tripStartDate = new Date(trip.startDate);
  const tripEndDate = new Date(trip.endDate);
  const today = new Date();
  
  const tripDuration = Math.ceil((tripEndDate.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysPassed = Math.ceil((today.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const progress = Math.min(100, Math.max(0, (daysPassed / tripDuration) * 100));
  
  const tripStatus = () => {
    if (isBefore(today, tripStartDate)) return 'upcoming';
    if (isAfter(today, tripEndDate)) return 'completed';
    return 'in-progress';
  };

  const statusVariant = {
    upcoming: { label: 'Upcoming', variant: 'secondary' as const },
    'in-progress': { label: 'In Progress', variant: 'default' as const },
    completed: { label: 'Completed', variant: 'outline' as const },
  }[tripStatus()];

  return (
    <div className="space-y-6">
      {/* Header with trip info and actions */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{trip.name}</h1>
            <Badge variant={statusVariant.variant} className="text-sm">
              {statusVariant.label}
            </Badge>
            {!trip.isPublic && (
              <Badge variant="outline" className="text-sm">
                Private
              </Badge>
            )}
          </div>
          
          <div className="flex items-center text-muted-foreground mt-2">
            <MapPin className="mr-1 h-4 w-4" />
            <span className="mr-4">{trip.destination}</span>
            
            <Calendar className="mr-1 h-4 w-4" />
            <span>
              {format(tripStartDate, 'MMM d, yyyy')} - {format(tripEndDate, 'MMM d, yyyy')}
              {' '}({tripDuration} {tripDuration === 1 ? 'day' : 'days'})
            </span>
          </div>
          
          {trip.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {trip.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="mr-1 h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2
         ">
          {isOwner && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/trips/${trip.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => onShare(trip.id)}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => onDelete(trip.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Trip
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      {(tripStatus() === 'in-progress' || tripStatus() === 'completed') && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {format(tripStartDate, 'MMM d')} - {format(tripEndDate, 'MMM d, yyyy')}
            </span>
            <span className="font-medium">
              {tripStatus() === 'completed' ? 'Trip completed' : `${Math.round(progress)}% complete`}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
      
      {/* Trip description */}
      {trip.description && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2">About this trip</h3>
            <p className="text-muted-foreground whitespace-pre-line">{trip.description}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tripDuration} {tripDuration === 1 ? 'day' : 'days'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(tripStartDate, 'MMM d')} - {format(tripEndDate, 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusVariant.label}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {tripStatus() === 'upcoming' && (
                `Starts in ${formatDistance(tripStartDate, today, { addSuffix: true })}`
              )}
              {tripStatus() === 'in-progress' && (
                `Ends ${formatDistance(tripEndDate, today, { addSuffix: true })}`
              )}
              {tripStatus() === 'completed' && (
                `Completed ${formatDistance(tripEndDate, today, { addSuffix: true })}`
              )}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(trip.activities || {}).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Planned for this trip
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Upcoming activities */}
      {trip.itinerary?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Upcoming Activities</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary" asChild>
                <Link to={`/trips/${trip.id}/itinerary`}>View Full Itinerary</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {trip.itinerary
                .filter((day) => isToday(new Date(day.date)) || isAfter(new Date(day.date), today))
                .slice(0, 3)
                .map((day) => (
                  <div key={day.date} className="space-y-3">
                    <div className="flex items-center">
                      <h3 className="font-medium">
                        {isToday(new Date(day.date)) 
                          ? 'Today' 
                          : format(new Date(day.date), 'EEEE, MMMM d')}
                      </h3>
                      <Separator className="mx-3 flex-1" />
                      <span className="text-sm text-muted-foreground">
                        {day.activities.length} {day.activities.length === 1 ? 'activity' : 'activities'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 pl-4 border-l-2 border-muted">
                      {day.activities.slice(0, 3).map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium">{activity.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(activity.startTime), 'h:mm a')} - {format(new Date(activity.endTime), 'h:mm a')}
                              {activity.location && ` • ${activity.location}`}
                            </div>
                          </div>
                        </div>
                      ))}
                      {day.activities.length > 3 && (
                        <Button variant="ghost" size="sm" className="text-primary mt-1" asChild>
                          <Link to={`/trips/${trip.id}/itinerary#${day.date}`}>
                            +{day.activities.length - 3} more
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Budget summary */}
      {trip.budget && trip.budget.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Budget Summary</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary" asChild>
                <Link to={`/trips/${trip.id}/budget`}>View Full Budget</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(
                trip.budget.reduce<Record<string, { total: number; paid: number }>>(
                  (acc, item) => {
                    if (!acc[item.category]) {
                      acc[item.category] = { total: 0, paid: 0 };
                    }
                    acc[item.category].total += item.amount;
                    if (item.paid) {
                      acc[item.category].paid += item.amount;
                    }
                    return acc;
                  },
                  {}
                )
              ).map(([category, { total, paid }]) => (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{category}</span>
                    <span>
                      ${paid.toFixed(2)} of ${total.toFixed(2)}
                    </span>
                  </div>
                  <Progress value={(paid / total) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
