import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateIntroEmail } from "@/lib/edgeFunctions";

interface IntroEmailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  conversationId: string;
  contactName: string;
  onIntroMade?: () => void;
}

interface GeneratedEmail {
  subject: string;
  body: string;
}

function stripHtmlTags(html: string): string {
  // Remove HTML tags and decode entities
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&quot;/g, '"') // Replace quotes
    .replace(/&apos;/g, "'") // Replace apostrophes
    .replace(/&amp;/g, '&') // Replace ampersands (do last)
    .trim();
}

export default function IntroEmailDrawer({
  open,
  onOpenChange,
  matchId,
  conversationId,
  contactName,
  onIntroMade,
}: IntroEmailDrawerProps) {
  const [email, setEmail] = useState<GeneratedEmail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const loadEmail = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await generateIntroEmail(matchId, conversationId);
      setEmail(data.email);
    } catch {
      toast({
        title: "Error generating email",
        description: "Failed to generate introduction email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [matchId, conversationId, toast]);

  useEffect(() => {
    if (open && !email && matchId) {
      loadEmail();
    }
  }, [open, matchId, email, loadEmail]);

  const handleCopy = () => {
    if (!email) return;
    const plainTextBody = stripHtmlTags(email.body);
    const fullEmail = `Subject: ${email.subject}\n\n${plainTextBody}`;
    navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    if (onIntroMade) {
      onIntroMade();
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh] md:h-3/4 flex flex-col max-h-[90vh]">
        <DrawerHeader className="flex-shrink-0">
          <DrawerTitle>Introduction Email</DrawerTitle>
          <DrawerDescription>
            Pre-crafted double opt-in email for {contactName}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4 flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : email ? (
            <div className="space-y-4 bg-muted/50 p-3 md:p-4 rounded-lg select-text">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Subject
                </p>
                <p className="text-sm font-semibold select-text cursor-text break-words">{email.subject}</p>
              </div>
              <div className="min-h-0 overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Email Body
                </p>
                <pre className="text-xs md:text-sm leading-relaxed text-foreground select-text cursor-text font-sans whitespace-pre-wrap break-words">
                  {stripHtmlTags(email.body)}
                </pre>
              </div>
            </div>
          ) : null}
        </div>

        <DrawerFooter className="flex-shrink-0 gap-2">
          <Button
            onClick={handleCopy}
            disabled={isLoading || !email}
            className="w-full"
            data-testid="button-copy-email"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Email
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
            data-testid="button-close-email"
          >
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
