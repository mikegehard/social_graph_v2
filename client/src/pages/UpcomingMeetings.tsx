import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calendarEventFromDb } from '@/lib/supabaseHelpers';
import { CalendarEvent } from '@shared/schema';
import { MeetingCard } from '@/components/MeetingCard';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw } from 'lucide-react';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { isToday, isTomorrow, isThisWeek } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function UpcomingMeetings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isConnected, sync, isSyncing } = useGoogleCalendarSync();

  // Fetch upcoming meetings (next 7 days)
  const { data: events, isLoading, refetch } = useQuery<CalendarEvent[]>({
    queryKey: ['/calendar-events/upcoming-week', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('owned_by_profile', user.id)
        .gte('start_time', now.toISOString())
        .lte('start_time', weekFromNow.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      return (data || []).map(calendarEventFromDb);
    },
    enabled: !!user,
  });

  const handleSync = async () => {
    sync();
    toast({
      title: 'Syncing calendar',
      description: 'Fetching your latest events from Google Calendar...',
    });

    // Refetch after a short delay
    setTimeout(() => {
      refetch();
    }, 2000);
  };

  // Group events by time period
  const groupedEvents = {
    today: [] as CalendarEvent[],
    tomorrow: [] as CalendarEvent[],
    thisWeek: [] as CalendarEvent[],
    later: [] as CalendarEvent[],
  };

  events?.forEach(event => {
    const eventDate = new Date(event.startTime);
    if (isToday(eventDate)) {
      groupedEvents.today.push(event);
    } else if (isTomorrow(eventDate)) {
      groupedEvents.tomorrow.push(event);
    } else if (isThisWeek(eventDate)) {
      groupedEvents.thisWeek.push(event);
    } else {
      groupedEvents.later.push(event);
    }
  });

  if (!isConnected) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Connect Your Calendar</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Connect your Google Calendar to see upcoming meetings and get notified before they start.
          </p>
          <Button onClick={() => window.location.href = '/settings'}>
            Go to Settings
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading your meetings...</p>
        </div>
      </div>
    );
  }

  const hasEvents = events && events.length > 0;

  return (
    <div className="container max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Notes</h1>
          <p className="text-muted-foreground">Upcoming meetings and conversations</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>

      {!hasEvents ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Upcoming Meetings</h3>
          <p className="text-muted-foreground mb-4">
            Your calendar is clear for the next week.
          </p>
          <Button variant="outline" onClick={handleSync}>
            Refresh Calendar
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Coming up / Today */}
          {groupedEvents.today.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                Coming up
              </h2>
              <div className="space-y-3">
                {groupedEvents.today.map(event => (
                  <MeetingCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* Tomorrow */}
          {groupedEvents.tomorrow.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                Tomorrow
              </h2>
              <div className="space-y-3">
                {groupedEvents.tomorrow.map(event => (
                  <MeetingCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* This Week */}
          {groupedEvents.thisWeek.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                This Week
              </h2>
              <div className="space-y-3">
                {groupedEvents.thisWeek.map(event => (
                  <MeetingCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* Later */}
          {groupedEvents.later.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                Later
              </h2>
              <div className="space-y-3">
                {groupedEvents.later.map(event => (
                  <MeetingCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
