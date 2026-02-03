import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { calendarEventFromDb } from '@/lib/supabaseHelpers';
import { CalendarEvent } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, Users, MapPin, Video, Mic, ArrowLeft } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Attendee {
  displayName?: string;
  email: string;
}

export default function MeetingPrep() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [_isRecording, _setIsRecording] = useState(false);

  // Fetch meeting details
  const { data: event, isLoading } = useQuery<CalendarEvent | null>({
    queryKey: ['/calendar-event', id],
    queryFn: async () => {
      if (!user || !id) return null;

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', id)
        .eq('owned_by_profile', user.id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return calendarEventFromDb(data);
    },
    enabled: !!user && !!id,
  });

  const handleStartRecording = async () => {
    if (!event) return;

    try {
      // Create a new conversation linked to this calendar event
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          owned_by_profile: user!.id,
          event_id: event.id,
          title: event.title,
          status: 'recording',
          recorded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convError) throw convError;

      toast({
        title: 'Recording started',
        description: 'Your conversation is now being recorded.',
      });

      // Navigate to the conversation detail page or recording interface
      setLocation(`/conversation/${conversation.id}`);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to start recording. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading meeting details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container max-w-3xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Meeting Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This meeting could not be found or you don't have access to it.
          </p>
          <Button onClick={() => setLocation('/meetings')}>
            Back to Meetings
          </Button>
        </div>
      </div>
    );
  }

  const startTime = new Date(event.startTime);
  const now = new Date();
  const attendees = (event.attendees as Attendee[]) || [];
  const timeUntil = formatDistance(startTime, now, { addSuffix: true });
  const timeString = format(startTime, 'h:mm a');
  const dateString = format(startTime, 'EEEE, MMMM d, yyyy');

  return (
    <div className="container max-w-3xl mx-auto p-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/meetings')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-sm text-muted-foreground">
            {dateString} at {timeString}
          </p>
        </div>
      </div>

      {/* Meeting Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Meeting Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{timeString}</p>
              <p className="text-sm text-muted-foreground">{timeUntil}</p>
            </div>
          </div>

          {/* Attendees */}
          {attendees.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium mb-2">
                  {attendees.length} {attendees.length === 1 ? 'Attendee' : 'Attendees'}
                </p>
                <div className="space-y-1">
                  {attendees.map((attendee, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{attendee.displayName || attendee.email}</span>
                      {attendee.displayName && (
                        <span className="text-muted-foreground ml-2">{attendee.email}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <p>{event.location}</p>
            </div>
          )}

          {/* Meeting URL */}
          {event.meetingUrl && (
            <div className="flex items-start gap-3">
              <Video className="w-5 h-5 text-muted-foreground mt-0.5" />
              <a
                href={event.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Join video call
              </a>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Pre-Meeting Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Feel free to write notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[150px] resize-none"
          />
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6">
        <div className="w-full max-w-3xl">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold shadow-lg"
            onClick={handleStartRecording}
          >
            <Mic className="w-5 h-5 mr-2" />
            Start now
          </Button>
        </div>
      </div>
    </div>
  );
}
