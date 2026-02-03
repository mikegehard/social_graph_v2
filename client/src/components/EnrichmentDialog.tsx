import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { researchContact } from "@/lib/edgeFunctions";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Globe, Search } from "lucide-react";

interface EnrichmentDialogProps {
  contactId: string;
  contactName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: 'hunter' | 'pdl' | 'auto';
}

export default function EnrichmentDialog({
  contactId,
  contactName,
  open,
  onOpenChange,
  provider: _provider = 'auto',
}: EnrichmentDialogProps) {
  console.log('[EnrichmentDialog] Rendering - open:', open, 'contactName:', contactName);
  
  const [result, setResult] = useState<{
    updated: boolean;
    fields: string[];
    bioFound?: boolean;
    thesisFound?: boolean;
  } | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Trigger enrichment when dialog opens
  useEffect(() => {
    if (open && !result && !isEnriching) {
      console.log('[EnrichmentDialog] Dialog opened via useEffect, triggering enrichment...');
      handleEnrich();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleEnrich = async () => {
    console.log('[EnrichmentDialog] Starting enrichment for contact:', contactId, contactName);
    setIsEnriching(true);
    setError(null);
    try {
      console.log('[EnrichmentDialog] Calling researchContact...');
      const data = await researchContact(contactId);
      console.log('[EnrichmentDialog] Research complete:', data);
      setResult(data);
      
      // Invalidate contact cache to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      
      // Show success toast
      if (data.updated && data.fields.length > 0) {
        toast({
          title: "Contact enriched! ✨",
          description: `Updated: ${data.fields.join(', ')}`,
        });
      } else {
        toast({
          title: "Contact already up to date",
          description: "No new information found",
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enrich contact';
      setError(errorMessage);
      console.error('Enrichment error:', err);
      toast({
        title: "Enrichment failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    console.log('[EnrichmentDialog] Dialog state change requested:', newOpen, 'for contact:', contactName);
    onOpenChange(newOpen);
    if (!newOpen) {
      console.log('[EnrichmentDialog] Clearing results...');
      setResult(null);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-enrichment">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Enrich Contact: {contactName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Searching the web with AI-powered research (Google + ChatGPT)
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isEnriching && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <Search className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <div className="text-center space-y-3">
                <p className="text-sm font-medium">Researching {contactName}...</p>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                    Searching Google for LinkedIn, Crunchbase, company websites
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-200"></span>
                    Extracting bio, education, career history
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-400"></span>
                    Finding personal interests and expertise areas
                  </p>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  This may take 10-15 seconds...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Research Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          )}

          {result && !isEnriching && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">
                    {result.updated ? 'Contact updated!' : 'Contact already up to date'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Web Search
                  </Badge>
                  {result.bioFound && (
                    <Badge variant="secondary" className="text-xs">
                      Bio found
                    </Badge>
                  )}
                  {result.thesisFound && (
                    <Badge variant="secondary" className="text-xs">
                      Thesis found
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {result.updated && result.fields.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Updated Fields</p>
                  <div className="space-y-2">
                    {result.fields.map((field: string) => (
                      <div key={field} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="capitalize">{field.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <p className="text-xs font-medium">What was updated?</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {result.bioFound && (
                        <li>• Professional bio from web sources</li>
                      )}
                      {result.thesisFound && (
                        <li>• Investment thesis and preferences</li>
                      )}
                      {result.fields.includes('linkedin_url') && (
                        <li>• LinkedIn profile URL</li>
                      )}
                      {result.fields.includes('location') && (
                        <li>• Location/geographic information</li>
                      )}
                      {(result.fields.some((f: string) => f.includes('education') || f.includes('career') || f.includes('portfolio'))) && (
                        <li>• Enhanced profile data (education, career, portfolio)</li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No new information found.</p>
                  <p className="text-xs mt-2">
                    The contact profile is already complete or public data is limited.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => handleOpenChange(false)}
            data-testid="button-close-enrichment"
          >
            {result?.updated ? 'Done' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
