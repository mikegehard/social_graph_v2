import { useState } from "react";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Check } from "lucide-react";

const contactValidationSchema = z.object({
  sector: z.string().optional(),
  checkSize: z.string().optional(),
  geo: z.string().optional(),
});

type ContactValidationFormData = z.infer<typeof contactValidationSchema>;

interface ContactValidationPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  speakersDetected: string[];
  userName: string;
  onValidate: (data: {
    speakers: Record<string, 'new' | 'existing'>;
    keywords: {
      sector?: string;
      checkSize?: string;
      geo?: string;
    };
  }) => void;
  isProcessing?: boolean;
}

export default function ContactValidationPopover({
  open,
  onOpenChange,
  speakersDetected,
  userName,
  onValidate,
  isProcessing = false,
}: ContactValidationPopoverProps) {
  const [speakerChoices, setSpeakerChoices] = useState<Record<string, 'new' | 'existing'>>({});
  const [step, setStep] = useState<'speakers' | 'keywords'>('speakers');

  const form = useForm<ContactValidationFormData>({
    resolver: zodResolver(contactValidationSchema),
    defaultValues: {
      sector: '',
      checkSize: '',
      geo: '',
    },
  });

  const otherSpeakers = speakersDetected.filter(s => s !== 'Unknown' && s !== userName);

  const handleSpeakerChoice = (speaker: string, choice: 'new' | 'existing') => {
    setSpeakerChoices(prev => ({
      ...prev,
      [speaker]: choice,
    }));
  };

  const handleNextStep = () => {
    if (otherSpeakers.length === 0 || Object.keys(speakerChoices).length === otherSpeakers.length) {
      setStep('keywords');
    }
  };

  const onSubmit = (data: ContactValidationFormData) => {
    onValidate({
      speakers: speakerChoices,
      keywords: {
        sector: data.sector || undefined,
        checkSize: data.checkSize || undefined,
        geo: data.geo || undefined,
      },
    });
    onOpenChange(false);
    setStep('speakers');
    setSpeakerChoices({});
    form.reset();
  };

  const allSpeakersChosen = otherSpeakers.length === 0 || Object.keys(speakerChoices).length === otherSpeakers.length;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent className="w-full max-w-md" side="top" align="center">
        {step === 'speakers' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Who participated in this conversation?
              </h3>
              <p className="text-sm text-muted-foreground">
                We detected {otherSpeakers.length} other {otherSpeakers.length === 1 ? 'participant' : 'participants'}.
              </p>
            </div>

            {otherSpeakers.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {otherSpeakers.map(speaker => (
                  <Card key={speaker} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{speaker}</p>
                      <p className="text-xs text-muted-foreground">Detected during conversation</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={speakerChoices[speaker] === 'new' ? 'default' : 'outline'}
                        onClick={() => handleSpeakerChoice(speaker, 'new')}
                        data-testid={`button-speaker-new-${speaker}`}
                      >
                        New
                      </Button>
                      <Button
                        size="sm"
                        variant={speakerChoices[speaker] === 'existing' ? 'default' : 'outline'}
                        onClick={() => handleSpeakerChoice(speaker, 'existing')}
                        data-testid={`button-speaker-existing-${speaker}`}
                      >
                        Existing
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4 text-center text-sm text-muted-foreground">
                Only you spoke in this conversation
              </Card>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
                data-testid="button-skip-validation"
              >
                Skip
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={!allSpeakersChosen || isProcessing}
                data-testid="button-next-validation"
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Capture conversation keywords
                </h3>
                <p className="text-sm text-muted-foreground">
                  Help us understand the context of this conversation
                </p>
              </div>

              <FormField
                control={form.control}
                name="sector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sector (e.g., B2B SaaS, FinTech)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter sector or industry focus"
                        {...field}
                        data-testid="input-sector"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check Size (e.g., $100K - $500K)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter investment check size range"
                        {...field}
                        data-testid="input-check-size"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="geo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Geographic Focus (e.g., SF, NYC, EU)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter geographic focus"
                        {...field}
                        data-testid="input-geo"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('speakers')}
                  disabled={isProcessing}
                  data-testid="button-back-validation"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing}
                  data-testid="button-save-validation"
                >
                  {isProcessing ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </PopoverContent>
    </Popover>
  );
}
