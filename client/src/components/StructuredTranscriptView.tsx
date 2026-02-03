import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface TranscriptEntry {
  t: string;
  speaker: string | null;
  text: string;
}

interface StructuredTranscriptViewProps {
  transcript: TranscriptEntry[];
  conversationTitle: string;
  conversationDate: Date;
  userName?: string;
}

export default function StructuredTranscriptView({ 
  transcript, 
  conversationTitle,
  conversationDate,
  userName
}: StructuredTranscriptViewProps) {
  if (transcript.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No transcript available yet
      </div>
    );
  }

  const speakers = Array.from(new Set(transcript.map(e => e.speaker).filter(Boolean)));
  
  // Group by speaker turns - consecutive segments by the same speaker
  const groupedBySpeaker = transcript.reduce((acc, entry, idx) => {
    if (idx === 0 || entry.speaker !== transcript[idx - 1].speaker) {
      // New speaker turn
      acc.push([entry]);
    } else {
      // Continue current speaker's turn
      acc[acc.length - 1].push(entry);
    }
    return acc;
  }, [] as TranscriptEntry[][]);

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold mb-6">{conversationTitle}</h1>
        
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {format(conversationDate, 'EEEE')}, {format(conversationDate, 'h:mm a')}
            </span>
          </Badge>
          
          {speakers.map((speaker, idx) => {
            const displayName = speaker === 'Unknown' && userName ? userName : (speaker || 'Unknown');
            return (
              <Badge 
                key={idx}
                variant="secondary" 
                className="flex items-center gap-2 px-3 py-1.5"
              >
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span>{displayName}</span>
              </Badge>
            );
          })}
        </div>

        <div className="space-y-6">
          {groupedBySpeaker.map((turn, turnIdx) => {
            const speaker = turn[0]?.speaker;
            const speakerDisplayName = speaker === 'Unknown' && userName ? userName : (speaker || 'Unknown');
            const isUser = speakerDisplayName === userName;
            
            return (
              <div key={turnIdx} className="group">
                {/* Speaker label with avatar-style indicator */}
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isUser 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {speakerDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">
                    {speakerDisplayName}
                  </span>
                </div>
                
                {/* Speaker's statements */}
                <div className="ml-11 space-y-2">
                  {turn.map((entry, entryIdx) => (
                    <p key={entryIdx} className="text-base leading-relaxed text-foreground">
                      {entry.text}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
