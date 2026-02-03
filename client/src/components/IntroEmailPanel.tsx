import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import IntroEmailTemplate from "./IntroEmailTemplate";
import { Mail, ChevronDown, ChevronUp } from "lucide-react";

interface Contact {
  name: string;
  email: string;
}

interface IntroMatch {
  contactA: Contact;
  contactB: Contact;
  score: number;
  reason: string;
  conversationContext: string;
  introBulletsForA: string[];
  introBulletsForB: string[];
}

interface IntroEmailPanelProps {
  matches: IntroMatch[];
  onSendEmail: (to: string, message: string) => void;
}

export default function IntroEmailPanel({ matches, onSendEmail }: IntroEmailPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [sentEmails, setSentEmails] = useState<Set<string>>(new Set());

  const highlyLikelyMatches = matches.filter(m => m.score === 3);

  const handleSend = (matchIndex: number, recipient: string, message: string) => {
    onSendEmail(recipient, message);
    setSentEmails(prev => new Set(prev).add(`${matchIndex}-${recipient}`));
  };

  const isEmailSent = (matchIndex: number, recipient: string) => {
    return sentEmails.has(`${matchIndex}-${recipient}`);
  };

  if (highlyLikelyMatches.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold mb-2">No High-Priority Intros</h3>
        <p className="text-sm text-muted-foreground">
          No highly likely matches (score 3) found in this conversation.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold">Intro Emails</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {highlyLikelyMatches.length} highly likely {highlyLikelyMatches.length === 1 ? 'match' : 'matches'} ready for introduction
          </p>
        </div>
      </div>

      {highlyLikelyMatches.map((match, idx) => {
        const isExpanded = expandedIndex === idx;
        const emailASent = isEmailSent(idx, match.contactA.email);
        const emailBSent = isEmailSent(idx, match.contactB.email);
        const bothSent = emailASent && emailBSent;

        return (
          <Card key={idx} className="overflow-hidden" data-testid={`intro-match-${idx}`}>
            <div
              className="p-4 cursor-pointer hover-elevate"
              onClick={() => setExpandedIndex(isExpanded ? null : idx)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">
                      {match.contactA.name} ↔ {match.contactB.name}
                    </h3>
                    <Badge className="bg-primary text-primary-foreground">
                      Score: {match.score}
                    </Badge>
                    {bothSent && (
                      <Badge variant="outline" className="bg-chart-2/20 text-chart-2 border-chart-2">
                        Both intros made
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {match.reason}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={`button-toggle-${idx}`}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-6 border-t border-border pt-4">
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    Email to {match.contactA.name}
                    {emailASent && (
                      <Badge variant="outline" className="bg-chart-2/20 text-chart-2 border-chart-2">
                        Intro made
                      </Badge>
                    )}
                  </h4>
                  <IntroEmailTemplate
                    recipientName={match.contactA.name}
                    recipientEmail={match.contactA.email}
                    introducingTo={match.contactB.name}
                    reason={match.reason}
                    conversationContext={match.conversationContext}
                    introBullets={match.introBulletsForA}
                    onSend={(message) => handleSend(idx, match.contactA.email, message)}
                    onCopy={(_message) => console.log('Copied email for', match.contactA.name)}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    Email to {match.contactB.name}
                    {emailBSent && (
                      <Badge variant="outline" className="bg-chart-2/20 text-chart-2 border-chart-2">
                        Intro made
                      </Badge>
                    )}
                  </h4>
                  <IntroEmailTemplate
                    recipientName={match.contactB.name}
                    recipientEmail={match.contactB.email}
                    introducingTo={match.contactA.name}
                    reason={match.reason}
                    conversationContext={match.conversationContext}
                    introBullets={match.introBulletsForB}
                    onSend={(message) => handleSend(idx, match.contactB.email, message)}
                    onCopy={(_message) => console.log('Copied email for', match.contactB.name)}
                  />
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
