import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Filter, ArrowUpDown, Calendar, MapPin, Tag, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Trip, TripFilterOptions } from '@/types/trip';
import { Link } from 'react-router-dom';

interface TripListProps {
  trips: Trip[];
  onDeleteTrip: (tripId: string) => void;
  loading?: boolean;
}

export default function TripList({ trips, onDeleteTrip, loading = false }: TripListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Omit<TripFilterOptions, 'sortBy' | 'sortOrder'>>({});
  const [sortConfig, setSortConfig] = useState<{ key: keyof Trip; direction: 'asc' | 'desc' }>({
    key: 'startDate',
    direction: 'desc',
  });

  const filteredAndSortedTrips = useMemo(() => {
    let result = [...trips];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (trip) =>
          trip.name.toLowerCase().includes(term) ||
          trip.destination.toLowerCase().includes(term) ||
          trip.description?.toLowerCase().includes(term) ||
          trip.tags?.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    // Apply filters
    if (filters.destination) {
      result = result.filter((trip) =>
        trip.destination.toLowerCase().includes(filters.destination!.toLowerCase())
      );
    }
    if (filters.startDate) {
      result = result.filter((trip) => new Date(trip.startDate) >= new Date(filters.startDate!));
    }
    if (filters.endDate) {
      result = result.filter((trip) => new Date(trip.endDate) <= new Date(filters.endDate!));
    }
    if (filters.tags?.length) {
      result = result.filter((trip) =>
        filters.tags?.every((tag) => trip.tags?.includes(tag))
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return result;
  }, [trips, searchTerm, filters, sortConfig]);

  const handleSort = (key: keyof Trip) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!loading && trips.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">No trips found</h3>
        <p className="text-muted-foreground mt-2">Create your first trip to get started!</p>
        <Button className="mt-4" asChild>
          <Link to="/create-trip">Create Trip</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search trips..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                <span>Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSort('name')}>
                Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('startDate')}>
                Date {sortConfig.key === 'startDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('destination')}>
                Destination {sortConfig.key === 'destination' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild>
            <Link to="/create-trip">New Trip</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedTrips.map((trip) => (
          <Card key={trip.id} className="overflow-hidden hover:shadow-md transition-shadow">
            {trip.coverPhotoUrl && (
              <div className="h-40 bg-muted">
                <img
                  src={trip.coverPhotoUrl}
                  alt={trip.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    <Link to={`/trips/${trip.id}`} className="hover:underline">
                      {trip.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {trip.destination}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/trips/${trip.id}/edit`}>Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDeleteTrip(trip.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Calendar className="mr-1 h-4 w-4" />
                <span>
                  {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              {trip.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {trip.description}
                </p>
              )}
              {trip.tags?.length ? (
                <div className="flex flex-wrap gap-1 mt-2">
                  {trip.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {trip.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{trip.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="border-t pt-3">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to={`/trips/${trip.id}`}>View Details</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
