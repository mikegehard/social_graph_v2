import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, X, Clock, Building2, Briefcase, Star, Check, ThumbsUp, ThumbsDown, Heart } from "lucide-react";
import MatchScoreBreakdown from "@/components/MatchScoreBreakdown";

interface ContactDetails {
  name: string;
  email: string | null;
  company: string | null;
  title: string | null;
  location?: string | null;
  bio?: string | null;
  checkSizeMin?: number | null;
  checkSizeMax?: number | null;
  investorNotes?: string | null;
  contactType?: string[] | null;
  relationshipStrength?: number | null; // 0-100 scale
}

interface ScoreBreakdown {
  semantic: number;
  tagOverlap: number;
  roleMatch: number;
  geoMatch: number;
  relationship: number;
  nameMatch?: number;
}

interface ConfidenceScores {
  semantic: number;
  tagOverlap: number;
  roleMatch: number;
  geoMatch: number;
  relationship: number;
  overall: number;
}

interface SuggestionCardProps {
  contact: ContactDetails;
  score: 1 | 2 | 3;
  reasons: string[];
  status?: string;
  onMakeIntro: () => void;
  onMaybe: () => void;
  onDismiss: () => void;
  onThumbsUp?: () => void;
  onThumbsDown?: () => void;
  isPending?: boolean;
  matchId?: string;
  aiExplanation?: string | null;
  rawScore?: number;
  scoreBreakdown?: ScoreBreakdown;
  confidenceScores?: ConfidenceScores;
  matchVersion?: string;
}

export default function SuggestionCard({
  contact,
  score,
  reasons,
  status = 'pending',
  onMakeIntro,
  onMaybe,
  onDismiss: _onDismiss,
  onThumbsUp,
  onThumbsDown,
  isPending = false,
  matchId: _matchId,
  aiExplanation,
  rawScore,
  scoreBreakdown,
  confidenceScores,
  matchVersion,
}: SuggestionCardProps) {
  const _scoreColors = {
    1: "bg-muted text-muted-foreground",
    2: "bg-primary/20 text-primary",
    3: "bg-primary text-primary-foreground",
  };

  const _scoreLabels = {
    1: "Okay",
    2: "Good",
    3: "Highly Likely",
  };
  
  const statusColors = {
    pending: "",
    promised: "bg-accent/50",
    accepted: "bg-emerald-400/20",
    intro_made: "bg-emerald-400/20",
    maybe: "bg-muted/50",
    dismissed: "opacity-60",
  };
  
  const statusIcons = {
    promised: <Mail className="w-3.5 h-3.5 text-primary" />,
    accepted: <Check className="w-3.5 h-3.5 text-emerald-600" />,
    intro_made: <Check className="w-3.5 h-3.5 text-emerald-600" />,
    maybe: <Clock className="w-3.5 h-3.5 text-muted-foreground" />,
    dismissed: <X className="w-3.5 h-3.5 text-muted-foreground" />,
  };
  
  const cardClassName = `p-4 space-y-3 ${statusColors[status as keyof typeof statusColors] || ''}`;

  return (
    <Card className={cardClassName} data-testid={`suggestion-card-${contact.name}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-base font-semibold truncate" data-testid="text-contact-name">
              {contact.name}
            </h4>
            {status !== 'pending' && statusIcons[status as keyof typeof statusIcons]}
          </div>
          
          {(contact.company || contact.title) && (
            <div className="space-y-1 text-sm text-muted-foreground">
              {contact.title && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{contact.title}</span>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{contact.company}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className="bg-transparent border-0 p-0" data-testid="badge-score">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: score }).map((_, idx) => (
                <Star key={idx} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              ))}
            </div>
          </Badge>
          {contact.relationshipStrength != null && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="relationship-strength">
              <Heart className={`w-3 h-3 ${contact.relationshipStrength >= 70 ? 'fill-rose-400 text-rose-400' : contact.relationshipStrength >= 40 ? 'fill-rose-200 text-rose-300' : 'text-muted-foreground'}`} />
              <span>{contact.relationshipStrength}%</span>
            </div>
          )}
        </div>
      </div>
      
      {(contact.company || contact.title || contact.location || contact.checkSizeMin) && <Separator />}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Why this match:
        </p>
        <ul className="space-y-1 text-sm">
          {reasons.map((reason, idx) => (
            <li key={idx} className="flex gap-2" data-testid={`reason-${idx}`}>
              <span className="text-primary">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
        
        {(contact.checkSizeMin || contact.checkSizeMax) && (
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
            <p className="font-medium text-foreground">Check Size: ${contact.checkSizeMin?.toLocaleString() || 'N/A'} - ${contact.checkSizeMax?.toLocaleString() || 'N/A'}</p>
          </div>
        )}
        
        {contact.investorNotes && (
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
            <p className="font-medium text-foreground">Notes: <span className="font-normal">{contact.investorNotes}</span></p>
          </div>
        )}
        
        {contact.contactType && contact.contactType.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {contact.contactType.map((type) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}
              </Badge>
            ))}
          </div>
        )}
        
        {aiExplanation && (
          <div className="mt-2 p-2 bg-primary/5 rounded-lg border border-primary/10 text-sm italic text-foreground" data-testid="ai-explanation">
            "{aiExplanation}"
          </div>
        )}
      </div>
      
      {/* Score Breakdown - Transparency Feature */}
      {scoreBreakdown && confidenceScores && rawScore !== undefined && (
        <div className="mt-4">
          <MatchScoreBreakdown
            scoreBreakdown={scoreBreakdown}
            confidenceScores={confidenceScores}
            rawScore={rawScore}
            starScore={score}
            matchVersion={matchVersion}
          />
        </div>
      )}
      
      {status === 'pending' && (
        <div className="flex items-center gap-2 pt-2">
          {onThumbsUp && onThumbsDown && (
            <div className="flex gap-1 mr-auto">
              <Button
                size="icon"
                variant="ghost"
                onClick={onThumbsUp}
                disabled={isPending}
                data-testid="button-thumbs-up"
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onThumbsDown}
                disabled={isPending}
                data-testid="button-thumbs-down"
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>
            </div>
          )}
          <Button
            size="sm"
            onClick={onMakeIntro}
            className="flex-1"
            disabled={isPending}
            data-testid="button-make-intro"
          >
            <Mail className="w-3 h-3 mr-1" />
            Make Intro
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onMaybe}
            disabled={isPending}
            data-testid="button-not-a-fit"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
      {(status === 'intro_made' || status === 'accepted') && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            disabled
            className="flex-1 bg-emerald-400 hover:bg-emerald-400 text-emerald-900"
            data-testid="button-intro-made"
          >
            <Check className="w-3 h-3 mr-1" />
            Intro Made
          </Button>
        </div>
      )}
    </Card>
  );
}
