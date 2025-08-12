import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, MapPin, Plus, Loader2 } from 'lucide-react';
import { useDebounce } from 'use-debounce-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity } from '@/types/trip';
import { searchActivities, getActivityCategories } from '@/services/activityService';
import { cn } from '@/lib/utils';

interface ActivitySearchProps {
  onSelectActivity: (activity: Activity) => void;
  selectedDate: Date;
  className?: string;
}

export default function ActivitySearch({ 
  onSelectActivity, 
  selectedDate,
  className = '' 
}: ActivitySearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Activity[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<{id: string; name: string}[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      const cats = getActivityCategories();
      setCategories(cats);
    };
    loadCategories();
  }, []);

  // Search when query or category changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery && selectedCategory === 'all') {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const results = await searchActivities(debouncedQuery, selectedCategory);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching activities:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    
    performSearch();
  }, [debouncedQuery, selectedCategory]);

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const handleAddActivity = (activity: Activity) => {
    // Parse the start time from the activity
    const startTime = typeof activity.startTime === 'string' 
      ? new Date(activity.startTime) 
      : activity.startTime;
      
    // Create a new activity with the selected date and time
    const activityWithDate = {
      ...activity,
      startTime: new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        startTime.getHours(),
        startTime.getMinutes()
      ).toISOString()
    };
    
    onSelectActivity(activityWithDate);
    setSearchQuery('');
    setSearchResults([]);
  };

  const formatTime = (time: string | Date) => {
    const date = typeof time === 'string' ? new Date(time) : time;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn("relative w-full max-w-2xl mx-auto", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search for activities, tours, restaurants..."
          className="pl-10 pr-10 py-6 text-base"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full"
            onClick={handleClearSearch}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>

      <AnimatePresence>
        {(isOpen && (searchQuery || selectedCategory !== 'all' || isSearching)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 mt-2 w-full bg-background rounded-lg shadow-lg border border-border overflow-hidden"
          >
            <div className="p-3 border-b">
              <Tabs 
                value={selectedCategory} 
                onValueChange={setSelectedCategory}
                className="w-full"
              >
                <ScrollArea className="w-full mb-4" style={{ maxWidth: '100%' }}>
                  <TabsList className="flex w-max p-0 bg-transparent">
                    {categories.map((category) => (
                      <TabsTrigger 
                        key={category.id} 
                        value={category.id}
                        className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-3 py-1 text-sm font-medium"
                      >
                        {category.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>
              </Tabs>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p>Searching activities...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  {debouncedQuery || selectedCategory !== 'all' ? (
                    <p>No activities found. Try a different search term or category.</p>
                  ) : (
                    <p>Search for activities or select a category to get started.</p>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {searchResults.map((activity) => (
                    <motion.li 
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleAddActivity(activity)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{activity.name}</h3>
                            {activity.category && (
                              <Badge 
                                variant="outline" 
                                className="text-xs font-normal capitalize"
                              >
                                {activity.category.replace(/-/g, ' ')}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                            {activity.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{activity.location}</span>
                              </div>
                            )}
                            
                            {activity.startTime && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{formatTime(activity.startTime)}</span>
                                {activity.cost && activity.cost > 0 && (
                                  <span className="ml-2 font-medium text-foreground">
                                    ${activity.cost.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {activity.notes && (
                              <p className="mt-1 text-sm line-clamp-2">{activity.notes}</p>
                            )}
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="ml-2 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddActivity(activity);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="p-3 border-t bg-muted/20 text-xs text-muted-foreground text-center">
              {searchResults.length > 0 ? (
                <p>{searchResults.length} {searchResults.length === 1 ? 'activity' : 'activities'} found</p>
              ) : (
                <p>Search for activities to add to your itinerary</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
