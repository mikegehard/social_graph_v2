import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import TranscriptView from "@/components/TranscriptView";
import SuggestionCard from "@/components/SuggestionCard";
import { Mic, Square, Users } from "lucide-react";
import AudioWaveform from "@/components/AudioWaveform";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import {
  useCreateConversation,
  useUpdateConversation,
} from "@/hooks/useConversations";
import {
  transcribeAudio,
  extractEntities,
  generateMatches,
  processParticipants,
} from "@/lib/edgeFunctions";
import { supabase, getSession } from "@/lib/supabase";
import type { InsertConversation } from "@shared/schema";

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
    relationshipStrength?: number | null;
  };
  score: 1 | 2 | 3;
  reasons: string[];
  matchId?: string;
  aiExplanation?: string | null;
}

interface RecordingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string | null;
}

export default function RecordingDrawer({ open, onOpenChange, eventId }: RecordingDrawerProps) {
  const [title, setTitle] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("matches");
  const conversationIdRef = useRef<string | null>(null);
  const audioQueueRef = useRef<Blob[]>([]);
  const isUploadingRef = useRef(false);

  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const createConversation = useCreateConversation();
  const updateConversation = useUpdateConversation();

  // Store toast in a ref to avoid dependency issues
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const processAudioQueue = useCallback(async () => {
    const currentConversationId = conversationIdRef.current;
    if (audioQueueRef.current.length === 0 || !currentConversationId) return;

    isUploadingRef.current = true;
    setIsTranscribing(true);

    try {
      const blob = audioQueueRef.current.shift();
      if (!blob) return;

      const result = await transcribeAudio(blob, currentConversationId);
      console.log('✅ Transcription result:', result);

      if (audioQueueRef.current.length > 0) {
        // Use setTimeout to avoid recursion issues
        setTimeout(() => processAudioQueue(), 0);
      }
    } catch (error) {
      console.error('❌ Transcription error:', error);
      toastRef.current({
        title: "Transcription error",
        description: error instanceof Error ? error.message : "Failed to transcribe audio",
        variant: "destructive",
      });
    } finally {
      isUploadingRef.current = false;
      setIsTranscribing(false);
    }
  }, []);

  const handleAudioData = useCallback(async (audioBlob: Blob) => {
    if (!conversationIdRef.current) return;

    console.log('✅ Audio chunk received:', audioBlob.size, 'bytes');
    audioQueueRef.current.push(audioBlob);

    if (!isUploadingRef.current) {
      await processAudioQueue();
    }
  }, [processAudioQueue]);

  const { state: audioState, controls: audioControls } = useAudioRecorder(handleAudioData);

  const totalMinutes = Math.floor(audioState.duration / 60);
  const seconds = audioState.duration % 60;
  const formattedDuration = `${totalMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const handleStartRecording = async () => {
    if (!consentChecked) {
      toast({
        title: "Consent required",
        description: "Please confirm you have consent to record",
        variant: "destructive",
      });
      return;
    }

    console.log('🎬 Starting recording...');
    console.log('📝 Creating conversation...');

    const result = await createConversation.mutateAsync({
      title: title || `Conversation - ${new Date().toLocaleString()}`,
      recordedAt: new Date(),
      status: 'recording',
      eventId: eventId || null,
      ownedByProfile: '', // Will be replaced with user.id in mutation
    } as InsertConversation);

    if (!result || !result.id) {
      toast({
        title: "Failed to create conversation",
        description: "Please try again",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Conversation created:', result.id);
    setConversationId(result.id);
    conversationIdRef.current = result.id;

    console.log('🎤 Starting audio recorder...');
    await audioControls.startRecording();
  };

  const handleStop = async () => {
    if (!conversationIdRef.current) return;
    
    console.log('⏹ Stopping recording...');
    setIsProcessing(true);
    
    try {
      const finalBlob = await audioControls.stopRecording();
      
      if (finalBlob && finalBlob.size > 0) {
        await transcribeAudio(finalBlob, conversationIdRef.current);
      }
      
      await updateConversation.mutateAsync({
        id: conversationIdRef.current,
        status: 'processing',
      });
      
      await processParticipants(conversationIdRef.current);
      
      // Extract entities one final time to ensure all are captured
      console.log('🔍 Extracting entities from complete transcript...');
      await extractEntities(conversationIdRef.current);
      
      // Generate final matches based on all conversation data (non-blocking)
      console.log('🎯 Generating final matches...');
      try {
        await generateMatches(conversationIdRef.current);
      } catch (matchError) {
        console.log('⚠️ Match generation skipped:', matchError);
        // Non-blocking - matches will be available via real-time subscription
      }
      
      await updateConversation.mutateAsync({
        id: conversationIdRef.current,
        status: 'completed',
      });

      toast({
        title: "Recording completed!",
        description: "Your conversation has been saved successfully",
      });

      setLocation(`/conversation/${conversationIdRef.current}`);
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to stop recording",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }

    onOpenChange(false);
    resetState();
  };

  const handlePause = () => {
    if (audioState.isPaused) {
      audioControls.resumeRecording();
    } else {
      audioControls.pauseRecording();
    }
  };

  const resetState = () => {
    setTitle("");
    setConsentChecked(false);
    setConversationId(null);
    setTranscript([]);
    setSuggestions([]);
    setActiveTab("matches");
    conversationIdRef.current = null;
    audioQueueRef.current = [];
  };

  useEffect(() => {
    if (!open && audioState.isRecording) {
      handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);


  useEffect(() => {
    if (!conversationId) return;

    console.log('🔌 Setting up real-time subscription for conversation:', conversationId);

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
          console.log('📝 Received transcript segment:', payload.new);
          const segment = payload.new;
          setTranscript((prev) => [
            ...prev,
            {
              t: segment.timestamp_ms ? new Date(parseInt(segment.timestamp_ms)).toLocaleTimeString() : '',
              speaker: segment.speaker || null,
              text: segment.text || '',
            },
          ]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_suggestions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('🎯 Received match suggestion event:', payload.eventType, payload.new);
          const match = payload.new as {
            id?: string;
            contact_id?: string;
            score?: number;
            reasons?: string[];
            ai_explanation?: string | null;
          } | null;
          if (!match || !match.contact_id) return;
          
          // Fetch the contact details for this match including relationship_strength
          const { data: contactData, error } = await supabase
            .from('contacts')
            .select('name, email, company, title, relationship_strength')
            .eq('id', match.contact_id)
            .single();
          
          // Guard against missing or failed contact fetch
          if (error || !contactData) {
            console.error('Failed to fetch contact for match:', error);
            return;
          }
          
          // Type-safe contact data
          const contact = contactData as {
            name: string;
            email: string | null;
            company: string | null;
            title: string | null;
            relationship_strength: number | null;
          };
          
          const newSuggestion = {
            contact: {
              name: contact.name,
              email: contact.email,
              company: contact.company,
              title: contact.title,
              relationshipStrength: contact.relationship_strength,
            },
            score: (match.score || 1) as 1 | 2 | 3,
            reasons: match.reasons || [],
            matchId: match.id,
            aiExplanation: match.ai_explanation || null,
          };
          
          setSuggestions((prev) => {
            // Check if contact already exists, update if so
            const existingIndex = prev.findIndex(s => s.contact.name === contact.name);
            
            if (existingIndex >= 0) {
              // Update existing match with new score/reasons
              const updated = [...prev];
              updated[existingIndex] = newSuggestion;
              return updated.sort((a, b) => b.score - a.score);
            }
            
            // Add new match
            const updated = [...prev, newSuggestion];
            return updated.sort((a, b) => b.score - a.score);
          });
          
          // Show toast only for new matches (INSERT events)
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Connection found!",
              description: `${contact.name} matches this conversation`,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from conversation:', conversationId);
      supabase.removeChannel(channel);
    };
  }, [conversationId, toast]);

  // Real-time entity extraction and match generation every 5 seconds
  useEffect(() => {
    if (!conversationId || !audioState.isRecording || audioState.isPaused) {
      return;
    }

    // Run immediately on start, then every 5 seconds
    const runMatchGeneration = async () => {
      try {
        console.log('🔍 [5s interval] Extracting entities...');
        await extractEntities(conversationId);
        
        console.log('🎯 [5s interval] Generating matches...');
        const matchData = await generateMatches(conversationId);
        
        if (matchData.matches && matchData.matches.length > 0) {
          console.log(`🎉 [5s interval] Found ${matchData.matches.length} matches!`);
        }
      } catch (error) {
        console.error('❌ [5s interval] Match generation error:', error);
      }
    };

    // Initial delay of 5 seconds before first run
    const initialTimeout = setTimeout(() => {
      runMatchGeneration();
    }, 5000);

    // Then run every 5 seconds
    const interval = setInterval(runMatchGeneration, 5000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [conversationId, audioState.isRecording, audioState.isPaused]);

  const isRecording = audioState.isRecording;

  const handleFeedback = async (matchId: string | undefined, contactName: string, action: 'thumbs_up' | 'thumbs_down' | 'saved' | 'intro_sent') => {
    if (!matchId || !conversationId) return;
    
    try {
      const session = await getSession();
      if (!session?.user?.id) return;
      
      // Log feedback to match_feedback table
      const { error } = await supabase
        .from('match_feedback')
        .insert({
          suggestion_id: matchId,
          profile_id: session.user.id,
          feedback: action,
        });
      
      if (error) {
        console.error('Failed to log feedback:', error);
        return;
      }
      
      toast({
        title: action === 'thumbs_up' ? 'Thanks for the feedback!' : 'Match dismissed',
        description: action === 'thumbs_up' 
          ? `We'll show more matches like ${contactName}` 
          : `We'll adjust future suggestions accordingly`,
      });
      
      // Remove from suggestions if thumbs down
      if (action === 'thumbs_down') {
        setSuggestions(prev => prev.filter(s => s.matchId !== matchId));
      }
    } catch (error) {
      console.error('Error logging feedback:', error);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={isRecording ? "h-screen" : "h-[60vh] md:h-[50vh]"}>
        <DrawerHeader className="pb-2">
          <DrawerTitle>{isRecording ? 'Recording in Progress' : 'New Meeting'}</DrawerTitle>
        </DrawerHeader>

        {isProcessing ? (
          <div className="px-4 flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-full max-w-md space-y-3">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                </div>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Processing conversation and generating matches...
              </p>
              <p className="text-xs text-center text-muted-foreground">
                This may take a few moments
              </p>
            </div>
          </div>
        ) : !isRecording ? (
          <div className="px-4 space-y-3 overflow-auto flex-1">
            <div className="space-y-1.5">
              <Label htmlFor="title">Meeting Title</Label>
              <Input
                id="title"
                placeholder="Enter title or we will auto fill once the meeting begins"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-meeting-title"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                <Checkbox
                  id="consent-drawer"
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                  data-testid="checkbox-consent"
                />
                <label htmlFor="consent-drawer" className="text-sm cursor-pointer select-none leading-snug">
                  I have consent from all parties to record this conversation
                </label>
              </div>
              <p className="text-xs text-muted-foreground text-center px-2">
                If you are matching from your phone you must be on speaker
              </p>
            </div>
          </div>
        ) : (
          <div className="px-4 flex-1 overflow-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="matches">
                  Matches {suggestions.length > 0 && `(${suggestions.length})`}
                </TabsTrigger>
                <TabsTrigger value="transcript">
                  Transcript {transcript.length > 0 && `(${transcript.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="matches">
                <div className="space-y-2 overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                  {suggestions.length > 0 ? (
                    suggestions.map((suggestion, idx) => (
                      <SuggestionCard 
                        key={suggestion.matchId || idx} 
                        contact={suggestion.contact}
                        score={suggestion.score}
                        reasons={suggestion.reasons}
                        matchId={suggestion.matchId}
                        aiExplanation={suggestion.aiExplanation}
                        onMakeIntro={() => console.log('Make Intro', suggestion.contact.name)}
                        onMaybe={() => handleFeedback(suggestion.matchId, suggestion.contact.name, 'thumbs_down')}
                        onDismiss={() => handleFeedback(suggestion.matchId, suggestion.contact.name, 'thumbs_down')}
                        onThumbsUp={() => handleFeedback(suggestion.matchId, suggestion.contact.name, 'thumbs_up')}
                        onThumbsDown={() => handleFeedback(suggestion.matchId, suggestion.contact.name, 'thumbs_down')}
                      />
                    ))
                  ) : (
                    <Card className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 border-dashed">
                      <Users className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm text-center">No matches yet</p>
                      <p className="text-xs text-center mt-1">Continue talking to discover connections</p>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="transcript">
                <Card className="p-0 overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                  {transcript.length > 0 ? (
                    <TranscriptView transcript={transcript} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                      <Mic className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm text-center">Waiting for audio transcription...</p>
                      <p className="text-xs text-center mt-1">Speak to see the transcript</p>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DrawerFooter className="pt-3 pb-4">
          <div className="flex items-center justify-between w-full gap-3">
            {isProcessing ? null : isRecording ? (
              <>
                <Button
                  variant="outline"
                  onClick={handlePause}
                  data-testid="button-pause-resume"
                >
                  {audioState.isPaused ? 'Resume' : 'Pause'}
                </Button>
                <div className="flex items-center justify-center gap-2" data-testid="text-duration">
                  <AudioWaveform isActive={isTranscribing && !audioState.isPaused} />
                  <span className="text-lg font-mono font-semibold">{formattedDuration}</span>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleStop}
                  data-testid="button-stop"
                >
                  <Square className="w-4 h-4 mr-2" />
                  End
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!consentChecked || createConversation.isPending}
                  onClick={handleStartRecording}
                  data-testid="button-start"
                  className="px-8"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  {createConversation.isPending ? 'Starting...' : 'Start Recording'}
                </Button>
              </>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
