import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import RecordingIndicator from "@/components/RecordingIndicator";
import TranscriptView from "@/components/TranscriptView";
import SuggestionCard from "@/components/SuggestionCard";
import ContactValidationPopover from "@/components/ContactValidationPopover";
import { Mic, Calendar, Clock, MapPin, Users, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useProfile } from "@/hooks/useProfile";
import {
  useCreateConversation,
  useUpdateConversation,
} from "@/hooks/useConversations";
import type { InsertConversation } from "@shared/schema";
import { 
  transcribeAudio,
  extractParticipants,
  extractEntities,
  generateMatches,
  processParticipants 
} from "@/lib/edgeFunctions";
import { supabase } from "@/lib/supabase";
import { calendarEventFromDb } from "@/lib/supabaseHelpers";
import { requestNotificationPermission, notifyProcessingComplete } from "@/lib/notifications";
import type { CalendarEvent } from "@shared/schema";
import { format } from "date-fns";

interface TranscriptEntry {
  t: string;
  speaker: string | null;
  text: string;
}

interface Suggestion {
  contact: {
    name: string;
    email: string | null;
    company: string | null;
    title: string | null;
  };
  score: 1 | 2 | 3;
  reasons: string[];
}

interface MatchPayload {
  contact_id: string;
  score?: number;
  reasons?: string[];
}

interface Attendee {
  displayName?: string;
  email: string;
}

export default function Record() {
  const searchParams = useSearch();
  const eventId = new URLSearchParams(searchParams).get('eventId');
  
  const [consentChecked, setConsentChecked] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [_isProcessing, setIsProcessing] = useState(false);
  const [calendarEvent, setCalendarEvent] = useState<CalendarEvent | null>(null);
  const [validationPopoverOpen, setValidationPopoverOpen] = useState(false);
  const [speakersDetected, setSpeakersDetected] = useState<string[]>([]);
  const [connectionsDrawerOpen, setConnectionsDrawerOpen] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  const lastExtractTimeRef = useRef<number>(0);
  const lastMatchTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<Blob[]>([]);
  const isUploadingRef = useRef(false);
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: profile } = useProfile();
  const createConversation = useCreateConversation();
  const updateConversation = useUpdateConversation();

  // Load calendar event if eventId is provided
  useEffect(() => {
    if (eventId) {
      supabase
        .from('calendar_events')
        .select('*')
        .eq('id', eventId)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            setCalendarEvent(calendarEventFromDb(data));
          }
        });
    }
  }, [eventId]);

  // Store toast in a ref to avoid circular dependency
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Process audio queue sequentially
  const processAudioQueue = useCallback(async () => {
    const currentConversationId = conversationIdRef.current;
    if (audioQueueRef.current.length === 0 || !currentConversationId) return;

    isUploadingRef.current = true;
    setIsTranscribing(true);

    try {
      const blob = audioQueueRef.current.shift();
      if (!blob) return;

      console.log('🎤 Sending audio to transcription:', blob.size, 'bytes, conversationId:', currentConversationId);

      // Send to transcription Edge Function
      const result = await transcribeAudio(blob, currentConversationId);
      console.log('✅ Transcription result:', result);

      // Continue processing queue (recursive call via ref)
      if (audioQueueRef.current.length > 0) {
        // Use setTimeout to avoid deep recursion
        setTimeout(() => {
          processAudioQueueRef.current?.();
        }, 0);
      }
    } catch (error) {
      console.error('❌ Transcription error DETAILS:', error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      toastRef.current({
        title: "Transcription error",
        description: error instanceof Error ? error.message : "Failed to transcribe audio chunk",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
      isUploadingRef.current = false;
    }
  }, []);

  // Store processAudioQueue in a ref for recursive calls
  const processAudioQueueRef = useRef(processAudioQueue);
  processAudioQueueRef.current = processAudioQueue;

  // Audio chunk handler
  const handleAudioData = useCallback(async (audioBlob: Blob) => {
    if (!conversationIdRef.current) {
      console.log('❌ No conversationId, skipping audio');
      return;
    }

    console.log('✅ Audio chunk received:', audioBlob.size, 'bytes', 'conversationId:', conversationIdRef.current);
    audioQueueRef.current.push(audioBlob);

    // Process queue if not already uploading
    if (!isUploadingRef.current) {
      await processAudioQueue();
    }
  }, [processAudioQueue]);

  // Audio recorder
  const { state: audioState, controls: audioControls } = useAudioRecorder(handleAudioData);

  // Format duration for display (HH:MM:SS)
  const hours = Math.floor(audioState.duration / 3600);
  const minutes = Math.floor((audioState.duration % 3600) / 60);
  const seconds = audioState.duration % 60;
  const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Subscribe to realtime conversation segments
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_segments',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const segment = payload.new;
          setTranscript(prev => [...prev, {
            t: new Date().toISOString(),
            speaker: segment.speaker,
            text: segment.text,
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Real-time subscription for match suggestions
  useEffect(() => {
    if (!conversationId) return;

    const matchChannel = supabase
      .channel(`matches:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_suggestions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('🎯 Real-time match event:', payload.eventType, payload.new);
          const match = payload.new as MatchPayload;
          if (!match || !match.contact_id) return;
          
          // Fetch contact details for this match
          const { data: contactData, error } = await supabase
            .from('contacts')
            .select('name, email, company, title')
            .eq('id', match.contact_id)
            .single();
          
          if (error || !contactData) {
            console.error('Failed to fetch contact for match:', error);
            return;
          }
          
          // Type the contact data
          const contact = contactData as {
            name: string;
            email: string | null;
            company: string | null;
            title: string | null;
          };
          
          const newSuggestion: Suggestion = {
            contact: {
              name: contact.name,
              email: contact.email,
              company: contact.company,
              title: contact.title,
            },
            score: (match.score || 1) as 1 | 2 | 3,
            reasons: match.reasons || [],
          };
          
          setSuggestions(prev => {
            // Check if contact already exists, update if so
            const existingIndex = prev.findIndex(s => s.contact.name === contact.name);
            
            if (existingIndex >= 0) {
              // Update existing match with new score/reasons
              const updated = [...prev];
              updated[existingIndex] = newSuggestion;
              return updated.sort((a, b) => b.score - a.score);
            }
            
            // Add new match
            const updated = [...prev, newSuggestion].sort((a, b) => b.score - a.score);
            return updated;
          });
          
          // Open drawer and show toast only for new INSERT events
          if (payload.eventType === 'INSERT') {
            setConnectionsDrawerOpen(true);
            toast({
              title: "Connection found!",
              description: `${contact.name} matches this conversation`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
    };
  }, [conversationId, toast]);

  // Periodic AI processing (every 5 seconds for real-time connections)
  useEffect(() => {
    if (!conversationId || !audioState.isRecording || audioState.isPaused) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      
      // Extract participants every 5s
      if (now - lastExtractTimeRef.current >= 5000 && transcript.length > 0) {
        try {
          console.log('👥 Extracting participants...');
          await extractParticipants(conversationId);
          lastExtractTimeRef.current = now;
        } catch (error) {
          console.error('Participant extraction error:', error);
        }
      }
      
      // Generate matches every 5s for real-time connections
      if (now - lastMatchTimeRef.current >= 5000 && transcript.length > 0) {
        try {
          // First extract entities from the conversation
          console.log('🔍 Extracting entities from conversation...');
          const entityData = await extractEntities(conversationId);
          console.log('✅ Entities extracted:', entityData);
          
          // Then generate matches based on extracted entities
          console.log('🎯 Generating matches...');
          const matchData = await generateMatches(conversationId);
          console.log('✅ Match generation response:', matchData);
          
          if (matchData.matches && matchData.matches.length > 0) {
            console.log(`🎉 Found ${matchData.matches.length} matches!`);
            // Matches will be updated via real-time subscription
          } else {
            console.log('⚠️ No matches found');
          }
          lastMatchTimeRef.current = now;
        } catch (error) {
          console.error('❌ Match generation error:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [conversationId, audioState.isRecording, audioState.isPaused, transcript.length]);

  const handleStartRecording = async () => {
    if (!consentChecked) return;
    
    try {
      console.log('🎬 Starting recording...');
      
      // Request notification permission upfront
      await requestNotificationPermission();
      
      // Create conversation in database
      console.log('📝 Creating conversation...');
      const conversationData: InsertConversation = {
        title: calendarEvent ? calendarEvent.title : `Conversation - ${new Date().toLocaleString()}`,
        recordedAt: new Date(),
        status: 'recording',
        eventId: eventId || null,
        ownedByProfile: '', // Added by the hook automatically
      };
      const conversation = await createConversation.mutateAsync(conversationData);
      
      console.log('✅ Conversation created:', conversation.id);
      setConversationId(conversation.id);
      conversationIdRef.current = conversation.id; // Update ref immediately
      setTranscript([]);
      setSuggestions([]);
      lastExtractTimeRef.current = 0;
      lastMatchTimeRef.current = 0;
      audioQueueRef.current = [];
      
      // Start audio recording
      console.log('🎤 Starting audio recorder...');
      await audioControls.startRecording();
      
      toast({
        title: "Recording started",
        description: "Your conversation is being recorded and transcribed in real-time.",
      });
    } catch (error) {
      console.error('❌ Failed to start recording - FULL ERROR:', error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start recording",
        variant: "destructive",
      });
    }
  };

  const handlePause = () => {
    if (audioState.isPaused) {
      audioControls.resumeRecording();
    } else {
      audioControls.pauseRecording();
    }
  };

  const handleStop = async () => {
    if (!conversationId) return;
    
    setIsProcessing(true);
    
    try {
      // Stop recording and get final audio blob
      const finalBlob = await audioControls.stopRecording();
      
      // Flush final audio chunk
      if (finalBlob && finalBlob.size > 0) {
        await transcribeAudio(finalBlob, conversationId);
      }
      
      // Mark conversation as processing
      await updateConversation.mutateAsync({
        id: conversationId,
        status: 'processing',
      });
      
      // Process participants (duplicate detection, auto-fill, pending contacts)
      const processResult = await processParticipants(conversationId);
      
      // Mark conversation as completed
      await updateConversation.mutateAsync({
        id: conversationId,
        status: 'completed',
      });
      
      // Extract speakers from transcript for validation
      const detectedSpeakers = Array.from(new Set(
        transcript
          .map(entry => entry.speaker)
          .filter(Boolean) as string[]
      ));
      setSpeakersDetected(detectedSpeakers);
      setValidationPopoverOpen(true);
      
      // Show results
      const { newContacts, updatedContacts, duplicatesFound } = processResult.results || {};
      
      let description = '';
      if (newContacts && newContacts.length > 0) {
        description += `${newContacts.length} new contact(s) added for review. `;
      }
      if (updatedContacts && updatedContacts.length > 0) {
        description += `${updatedContacts.length} contact(s) updated with new information. `;
      }
      if (duplicatesFound && duplicatesFound.length > 0) {
        description += `${duplicatesFound.length} duplicate(s) found.`;
      }
      
      toast({
        title: "Recording saved!",
        description: description || "Conversation processed successfully.",
      });
      
      // Send push notification with match count
      const matchCount = suggestions.length;
      if (matchCount > 0) {
        const conversationTitle = calendarEvent ? calendarEvent.title : 'Your conversation';
        notifyProcessingComplete(conversationTitle, matchCount);
      }
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast({
        title: "Error",
        description: "Failed to process recording. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleValidationComplete = (data: {
    speakers: Record<string, 'new' | 'existing'>;
    keywords: {
      sector?: string;
      checkSize?: string;
      geo?: string;
    };
  }) => {
    console.log('Validation complete:', data);
    // TODO: Save the speaker choices and keywords to the conversation
    
    // Redirect to history after a short delay
    setTimeout(() => {
      setLocation('/history');
    }, 800);
  };

  if (!audioState.isRecording) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-2xl w-full">
          {calendarEvent && (
            <Card className="mb-8 p-6 text-left" data-testid="card-event-details">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-2" data-testid="text-event-title">
                    {calendarEvent.title}
                  </h2>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span data-testid="text-event-time">
                        {format(calendarEvent.startTime, 'EEEE, MMMM d, yyyy • h:mm a')} - {format(calendarEvent.endTime, 'h:mm a')}
                      </span>
                    </div>
                    {calendarEvent.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span data-testid="text-event-location">{calendarEvent.location}</span>
                      </div>
                    )}
                    {calendarEvent.attendees && Array.isArray(calendarEvent.attendees) && calendarEvent.attendees.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span data-testid="text-event-attendees">
                          {(calendarEvent.attendees as Attendee[]).length} attendee{(calendarEvent.attendees as Attendee[]).length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="mb-12">
            <h1 className="text-2xl font-semibold mb-3">
              {calendarEvent ? 'Ready to Record' : 'Start a New Recording'}
            </h1>
            <p className="text-muted-foreground">
              Record conversations to get AI-powered intro suggestions in real-time
            </p>
          </div>

          <div className="mb-8 flex items-center justify-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
            <Checkbox
              id="consent"
              checked={consentChecked}
              onCheckedChange={(checked) => {
                const isChecked = checked as boolean;
                setConsentChecked(isChecked);
                if (isChecked) {
                  setTimeout(() => handleStartRecording(), 300);
                }
              }}
              data-testid="checkbox-consent"
            />
            <label
              htmlFor="consent"
              className="text-sm cursor-pointer select-none"
            >
              I have consent from all parties to record this conversation
            </label>
          </div>

          {audioState.error && (
            <Card className="p-4 mb-4 border-destructive">
              <p className="text-sm text-destructive">{audioState.error}</p>
            </Card>
          )}

          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              disabled={!consentChecked || createConversation.isPending}
              onClick={handleStartRecording}
              data-testid="button-start-recording"
              className="w-32 h-32 rounded-3xl bg-primary hover:bg-primary shadow-xl hover:shadow-2xl transition-all duration-200"
            >
              <Mic className="w-12 h-12 text-primary-foreground" />
            </Button>
            <p className="text-sm text-muted-foreground">
              {createConversation.isPending ? 'Starting...' : 'Tap to start recording'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <RecordingIndicator
        isRecording={true}
        isPaused={audioState.isPaused}
        duration={formattedDuration}
        onPause={handlePause}
        onStop={handleStop}
      />

      <div className="mt-20 px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Recording in Progress</h1>
            <div className="flex items-center gap-3 mt-2">
              {isTranscribing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span>Transcribing audio...</span>
                </div>
              )}
              {!isTranscribing && transcript.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {transcript.length} transcript segment{transcript.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          
          <Sheet open={connectionsDrawerOpen} onOpenChange={setConnectionsDrawerOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                className="relative"
                data-testid="button-open-connections"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Connections
                {suggestions.length > 0 && (
                  <Badge 
                    variant="default" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {suggestions.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Live Connections
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {suggestions.length > 0 ? (
                  suggestions.map((suggestion, idx) => (
                    <SuggestionCard
                      key={idx}
                      contact={suggestion.contact}
                      score={suggestion.score}
                      reasons={suggestion.reasons}
                      onMakeIntro={() => console.log('Make intro', suggestion.contact.name)}
                      onMaybe={() => console.log('Maybe', suggestion.contact.name)}
                      onDismiss={() => console.log('Dismissed', suggestion.contact.name)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-base font-medium">Searching for connections...</p>
                    <p className="text-sm mt-2 text-center">
                      Matches will appear here every 5 seconds as we analyze your conversation
                    </p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Tabs defaultValue="transcript" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="transcript" data-testid="tab-transcript">
              Transcript {transcript.length > 0 && `(${transcript.length})`}
            </TabsTrigger>
            <TabsTrigger value="matches" data-testid="tab-matches">
              Matches {suggestions.length > 0 && `(${suggestions.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcript">
            <Card className="p-0 h-96 overflow-auto">
              {transcript.length > 0 ? (
                <TranscriptView transcript={transcript} userName={profile?.fullName || undefined} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                  <Mic className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-base font-medium">Waiting for audio transcription</p>
                  <p className="text-sm mt-2">Speak to see the transcript appear here</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="matches">
            <div className="space-y-4">
              {suggestions.length > 0 ? (
                suggestions.map((suggestion, idx) => (
                  <SuggestionCard
                    key={idx}
                    contact={suggestion.contact}
                    score={suggestion.score}
                    reasons={suggestion.reasons}
                    onMakeIntro={() => console.log('Make intro', suggestion.contact.name)}
                    onMaybe={() => console.log('Maybe', suggestion.contact.name)}
                    onDismiss={() => console.log('Dismissed', suggestion.contact.name)}
                  />
                ))
              ) : (
                <Card className="p-12 border-dashed flex flex-col items-center justify-center text-muted-foreground">
                  <Users className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-base font-medium">No matches found yet</p>
                  <p className="text-sm mt-2 text-center max-w-md">
                    Continue the conversation to discover relevant contacts from your network
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ContactValidationPopover
        open={validationPopoverOpen}
        onOpenChange={setValidationPopoverOpen}
        speakersDetected={speakersDetected}
        userName={profile?.fullName || 'You'}
        onValidate={handleValidationComplete}
        isProcessing={false}
      />
    </div>
  );
}
