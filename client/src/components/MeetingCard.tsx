import { CalendarEvent } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Users, MapPin, Video } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { useLocation } from 'wouter';

interface MeetingCardProps {
  event: CalendarEvent;
}

export function MeetingCard({ event }: MeetingCardProps) {
  const [, setLocation] = useLocation();
  const startTime = new Date(event.startTime);
  const now = new Date();
  
  // Parse attendees from JSONB
  const attendees = (event.attendees as unknown[]) || [];
  const attendeeCount = attendees.length;
  
  // Calculate time until meeting
  const timeUntil = formatDistance(startTime, now, { addSuffix: true });
  
  // Format time
  const timeString = format(startTime, 'h:mm a');
  
  const handleClick = () => {
    setLocation(`/meetings/${event.id}`);
  };
  
  return (
    <Card 
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Calendar Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          
          {/* Meeting Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1 truncate">
              {event.title}
            </h3>
            
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              {/* Time */}
              <div className="flex items-center gap-2">
                <span className="font-medium">{timeString}</span>
                <span className="text-xs">• {timeUntil}</span>
              </div>
              
              {/* Attendees */}
              {attendeeCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{attendeeCount} {attendeeCount === 1 ? 'person' : 'people'}</span>
                </div>
              )}
              
              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
              
              {/* Meeting URL */}
              {event.meetingUrl && (
                <div className="flex items-center gap-1.5">
                  <Video className="w-4 h-4" />
                  <span className="truncate">Video call</span>
                </div>
              )}
            </div>
          </div>
          
          {/* External indicator */}
          {event.isExternalMeeting && (
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                External
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
