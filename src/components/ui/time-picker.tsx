import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type TimePickerProps = {
  date: Date;
  setDate: (date: Date) => void;
  className?: string;
  showSeconds?: boolean;
  disabled?: boolean;
};

export function TimePicker({
  date,
  setDate,
  className,
  showSeconds = false,
  disabled = false,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds && { second: '2-digit' }),
      hour12: true,
    });
  };
  
  // Handle hour change
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(date);
    const hours = parseInt(e.target.value, 10);
    if (!isNaN(hours) && hours >= 0 && hours <= 23) {
      newDate.setHours(hours);
      setDate(newDate);
    }
  };
  
  // Handle minute change
  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(date);
    const minutes = parseInt(e.target.value, 10);
    if (!isNaN(minutes) && minutes >= 0 && minutes <= 59) {
      newDate.setMinutes(minutes);
      setDate(newDate);
    }
  };
  
  // Handle second change
  const handleSecondChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(date);
    const seconds = parseInt(e.target.value, 10);
    if (!isNaN(seconds) && seconds >= 0 && seconds <= 59) {
      newDate.setSeconds(seconds);
      setDate(newDate);
    }
  };
  
  // Toggle AM/PM
  const toggleAmPm = () => {
    const newDate = new Date(date);
    const hours = newDate.getHours();
    
    if (hours >= 12) {
      newDate.setHours(hours - 12);
    } else {
      newDate.setHours(hours + 12);
    }
    
    setDate(newDate);
  };
  
  // Format time part to 2 digits
  const formatTimePart = (value: number) => {
    return value.toString().padStart(2, '0');
  };
  
  // Get current time parts
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert to 12-hour format
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {date ? formatTime(date) : <span>Pick a time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex items-center space-x-2">
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground mb-1">Hours</span>
            <input
              type="number"
              min="1"
              max="12"
              value={formatTimePart(displayHours)}
              onChange={handleHourChange}
              className="w-12 text-center border rounded-md p-1"
            />
          </div>
          <div className="text-xl">:</div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground mb-1">Minutes</span>
            <input
              type="number"
              min="0"
              max="59"
              value={formatTimePart(minutes)}
              onChange={handleMinuteChange}
              className="w-12 text-center border rounded-md p-1"
            />
          </div>
          {showSeconds && (
            <>
              <div className="text-xl">:</div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground mb-1">Seconds</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={formatTimePart(seconds)}
                  onChange={handleSecondChange}
                  className="w-12 text-center border rounded-md p-1"
                />
              </div>
            </>
          )}
          <div className="flex flex-col items-center ml-2">
            <span className="text-xs text-muted-foreground mb-1">AM/PM</span>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAmPm}
              className="w-12"
            >
              {ampm}
            </Button>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
