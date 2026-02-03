import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StructuredTranscriptView from "@/components/StructuredTranscriptView";
import SuggestionCard from "@/components/SuggestionCard";
import IntroEmailDrawer from "@/components/IntroEmailDrawer";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { useConversation, useConversationSegments } from "@/hooks/useConversations";
import { useMatchSuggestions, useUpdateMatchStatus } from "@/hooks/useMatches";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface PromisedIntro {
  id: string;
  contactName: string;
  promisedDate: string;
  fulfilled: boolean;
}

export default function ConversationDetail() {
  const [, params] = useRoute("/conversation/:id");
  const conversationId = params?.id || '';
  
  // Call ALL hooks unconditionally at the top
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [promisedIntros, setPromisedIntros] = useState<Record<string, PromisedIntro[]>>({});
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState<string>("");
  
  const { data: conversation, isLoading: conversationLoading } = useConversation(conversationId);
  const { data: segments = [], isLoading: segmentsLoading } = useConversationSegments(conversationId);
  const { data: matches = [], isLoading: matchesLoading } = useMatchSuggestions(conversationId);
  const { data: profile } = useProfile();
  const updateStatus = useUpdateMatchStatus(conversationId);

  // Define regenerateMatches mutation at the top with all other hooks
  const regenerateMatches = useMutation({
    mutationFn: async (convId: string) => {
      // Get the user's auth token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      if (!authToken) {
        throw new Error('Not authenticated');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      };

      const response = await fetch(`/api/supabase/functions/v1/extract-entities`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ conversationId: convId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extract entities');
      }

      const embedResponse = await fetch(`/api/supabase/functions/v1/embed-conversation`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ conversationId: convId }),
      });

      if (!embedResponse.ok) {
        console.warn('Embedding generation failed, but continuing...');
      }

      const matchResponse = await fetch(`/api/supabase/functions/v1/generate-matches`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ conversationId: convId }),
      });

      if (!matchResponse.ok) {
        const errorData = await matchResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate matches');
      }

      return await matchResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['matches', conversationId] });
      toast({
        title: "Matches regenerated!",
        description: "The conversation has been reprocessed with the latest matching algorithm.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to regenerate matches",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const transcript = useMemo(() => {
    return segments
      .filter(segment => segment.timestampMs != null)
      .map(segment => ({
        t: new Date(segment.timestampMs).toISOString(),
        speaker: segment.speaker || 'Unknown',
        text: segment.text,
      }));
  }, [segments]);

  const conversationTitle = conversation?.title || 'Conversation';
  const displayTitle = conversationTitle.replace(/^Conversation\s*-\s*/, '');
  const conversationDate = conversation?.recordedAt 
    ? format(conversation.recordedAt, 'MMMM dd, yyyy')
    : '';
  
  const duration = conversation?.durationSeconds || 0;
  const durationMinutes = Math.round(duration / 60);

  const _handlePromiseIntro = (_participant: string, contactName: string) => {
    const newPromise: PromisedIntro = {
      id: `${Date.now()}-${Math.random()}`,
      contactName,
      promisedDate: new Date().toISOString(),
      fulfilled: false,
    };
    setPromisedIntros(prev => ({
      ...prev,
      [_participant]: [...(prev[_participant] || []), newPromise]
    }));
    toast({
      title: "Intro promised!",
      description: `You promised to introduce ${_participant} to ${contactName}`,
    });
  };

  const _handleMarkFulfilled = (participant: string, promiseId: string) => {
    setPromisedIntros(prev => {
      const updated = { ...prev };
      updated[participant] = (updated[participant] || []).map(promise =>
        promise.id === promiseId ? { ...promise, fulfilled: true } : promise
      );
      return updated;
    });
    toast({
      title: "Intro completed!",
      description: "Marked intro as complete",
    });
  };

  const _getPersonPromises = (personName: string) => {
    const promised = promisedIntros[personName] || [];
    return promised.map(promise => ({
      ...promise,
      onMarkFulfilled: () => _handleMarkFulfilled(personName, promise.id),
    }));
  };

  const handleMakeIntro = (matchId: string, contactName: string) => {
    setSelectedMatchId(matchId);
    setSelectedContactName(contactName);
    setEmailDrawerOpen(true);
    handleUpdateStatus(matchId, 'promised');
  };

  const handleUpdateStatus = async (matchId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ matchId, status });
      // Only show toast for 'promised' status, skip 'intro_made' to avoid redundant notification
      if (status === 'promised') {
        toast({
          title: 'Intro promised!',
          description: 'Email ready to copy and send',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again';
      toast({
        title: "Error updating match",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const isLoading = conversationLoading || segmentsLoading || matchesLoading;

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <Link href="/history">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
            </Button>
          </Link>
        </div>
        <div className="bg-card rounded-lg border border-card-border p-4 md:p-8 text-center text-muted-foreground">
          Loading conversation...
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <Link href="/history">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
            </Button>
          </Link>
        </div>
        <div className="bg-card rounded-lg border border-card-border p-4 md:p-8 text-center text-muted-foreground">
          Conversation not found
        </div>
      </div>
    );
  }

  const _handleSendEmail = (to: string, message: string) => {
    console.log('Sending email to:', to);
    console.log('Message:', message);
    toast({
      title: "Email sent!",
      description: `Introduction email sent to ${to}`,
    });
  };

  const handleRegenerateMatches = () => {
    if (!conversationId) return;
    regenerateMatches.mutate(conversationId);
  };

  return (
    <div className="p-4 md:p-8 overflow-auto">
      <div className="mb-6">
        <Link href="/history">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to History
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-start gap-4 md:justify-between md:mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold mb-2">{displayTitle}</h1>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-muted-foreground">
              <span>{conversationDate}</span>
              {durationMinutes > 0 && (
                <>
                  <span className="hidden md:inline">•</span>
                  <span>{durationMinutes} {durationMinutes === 1 ? 'minute' : 'minutes'}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full md:w-auto" 
              onClick={handleRegenerateMatches}
              disabled={regenerateMatches.isPending}
              data-testid="button-regenerate"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${regenerateMatches.isPending ? 'animate-spin' : ''}`} />
              {regenerateMatches.isPending ? 'Processing...' : 'Regenerate Matches'}
            </Button>
            <Button variant="outline" size="sm" className="w-full md:w-auto" data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="suggestions" className="w-full overflow-hidden">
        <TabsList className="mb-6">
          <TabsTrigger value="suggestions" data-testid="tab-suggestions">Suggested Intros</TabsTrigger>
          <TabsTrigger value="overview" data-testid="tab-overview">Transcript</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {transcript.length > 0 ? (
            <div className="bg-card border border-card-border rounded-lg min-h-[600px]">
              <StructuredTranscriptView 
                transcript={transcript}
                conversationTitle={conversationTitle}
                conversationDate={conversation.recordedAt}
                userName={profile?.fullName || undefined}
              />
            </div>
          ) : (
            <div className="bg-card border border-card-border rounded-lg p-8 text-center text-muted-foreground">
              No transcript available. This conversation may not have been transcribed yet.
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggestions">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Suggested Matches</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Based on the conversation, here are potential introductions you could make.
            </p>
            {matches.filter(match => match.status === 'pending').length > 0 ? (
              <div className="space-y-4">
                {matches.filter(match => match.status === 'pending').map((match) => (
                  <div key={match.id}>
                    <SuggestionCard
                      contact={{
                        name: match.contact?.name || 'Unknown',
                        email: match.contact?.email || null,
                        company: match.contact?.company || null,
                        title: match.contact?.title || null,
                        location: match.contact?.location || null,
                        bio: match.contact?.bio || null,
                        checkSizeMin: match.contact?.checkSizeMin || null,
                        checkSizeMax: match.contact?.checkSizeMax || null,
                        investorNotes: match.contact?.investorNotes || null,
                        contactType: match.contact?.contactType || null,
                      }}
                      score={match.score as (1 | 2 | 3)}
                      reasons={(match.reasons as string[]) || []}
                      status={match.status}
                      matchId={match.id}
                      onMakeIntro={() => handleMakeIntro(match.id, match.contact?.name || 'Unknown')}
                      onMaybe={() => handleUpdateStatus(match.id, 'dismissed')}
                      onDismiss={() => handleUpdateStatus(match.id, 'dismissed')}
                      isPending={updateStatus.isPending}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-card-border rounded-lg p-8 text-center text-muted-foreground">
                No match suggestions yet. Matches will appear after the conversation is processed.
              </div>
            )}
          </div>
        </TabsContent>

      </Tabs>

      {selectedMatchId && (
        <IntroEmailDrawer
          open={emailDrawerOpen}
          onOpenChange={setEmailDrawerOpen}
          matchId={selectedMatchId}
          conversationId={conversationId}
          contactName={selectedContactName}
          onIntroMade={() => handleUpdateStatus(selectedMatchId, 'intro_made')}
        />
      )}
    </div>
  );
}
