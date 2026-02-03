import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, DollarSign, Users, Sparkles, Mail, Linkedin, MapPin, Phone, Tag, Twitter as TwitterIcon, BrainCircuit, Loader2, Target, TrendingUp, Globe } from "lucide-react";

const ExpandIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 -960 960 960" 
    fill="currentColor"
    className={className}
  >
    <path d="M200-200v-240h80v160h160v80H200Zm480-320v-160H520v-80h240v240h-80Z"/>
  </svg>
);
import { Separator } from "@/components/ui/separator";
import RoleTag from "@/components/RoleTag";
import { formatCheckSizeRange } from "@/lib/currencyFormat";
import { useContactThesis, useExtractThesis } from "@/hooks/useContacts";
import { useToast } from "@/hooks/use-toast";

interface ContactCardProps {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  role: string;
  org?: string;
  email?: string;
  linkedinUrl?: string;
  location?: string;
  phone?: string;
  category?: string;
  twitter?: string;
  angellist?: string;
  bio?: string;
  
  // Company Information (shown in More Information)
  companyAddress?: string;
  companyEmployees?: string;
  companyFounded?: string;
  companyUrl?: string;
  companyLinkedin?: string;
  companyTwitter?: string;
  companyFacebook?: string;
  companyAngellist?: string;
  companyCrunchbase?: string;
  companyOwler?: string;
  youtubeVimeo?: string;
  
  // Legacy fields
  geo?: string;
  relationshipStrength: number;
  tags: string[];
  lastInteractionAt?: string;
  onEdit: () => void;
  onEnrich: () => void;
  
  // Investor Profile fields
  contactType?: ('LP' | 'GP' | 'Angel' | 'FamilyOffice' | 'Startup' | 'PE' | 'Other')[];
  isInvestor?: boolean;
  checkSizeMin?: number;
  checkSizeMax?: number;
  investorNotes?: string;
}

// Helper function to auto-detect contact types from title
const detectContactTypesFromTitle = (title: string | undefined): ('LP' | 'GP' | 'Angel' | 'FamilyOffice' | 'Startup' | 'PE' | 'Other')[] => {
  if (!title) return [];
  
  const titleLower = title.toLowerCase();
  const detectedTypes: ('LP' | 'GP' | 'Angel' | 'FamilyOffice' | 'Startup' | 'PE' | 'Other')[] = [];
  
  const typeKeywords: Array<{ keywords: string[], type: 'LP' | 'GP' | 'Angel' | 'FamilyOffice' | 'Startup' | 'PE' | 'Other' }> = [
    { keywords: ['general partner', ' gp', 'gp '], type: 'GP' },
    { keywords: ['limited partner', ' lp', 'lp '], type: 'LP' },
    { keywords: ['angel investor', 'angel'], type: 'Angel' },
    { keywords: ['family office'], type: 'FamilyOffice' },
    { keywords: ['startup', 'founder', ' ceo', 'ceo ', ' cto', 'cto ', 'cofounder', 'co-founder'], type: 'Startup' },
    { keywords: ['private equity', ' pe', 'pe '], type: 'PE' },
  ];
  
  for (const { keywords, type } of typeKeywords) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        detectedTypes.push(type);
        break;
      }
    }
  }
  
  return detectedTypes;
};

export default function ContactCard({
  id,
  fullName,
  firstName: _firstName,
  lastName: _lastName,
  role,
  org,
  email,
  linkedinUrl,
  location,
  phone,
  category: _category,
  twitter,
  angellist,
  bio,
  companyAddress: _companyAddress,
  companyEmployees: _companyEmployees,
  companyFounded: _companyFounded,
  companyUrl,
  companyLinkedin: _companyLinkedin,
  companyTwitter: _companyTwitter,
  companyFacebook: _companyFacebook,
  companyAngellist: _companyAngellist,
  companyCrunchbase: _companyCrunchbase,
  companyOwler: _companyOwler,
  youtubeVimeo: _youtubeVimeo,
  geo: _geo,
  relationshipStrength: _relationshipStrength,
  tags: _tags,
  lastInteractionAt,
  onEdit,
  onEnrich,
  contactType,
  isInvestor: _isInvestor = false,
  checkSizeMin,
  checkSizeMax,
  investorNotes,
}: ContactCardProps) {
  const { toast } = useToast();
  
  const { data: thesis, isLoading: thesisLoading } = useContactThesis(id);
  const extractThesisMutation = useExtractThesis();
  
  const handleExtractThesis = async () => {
    try {
      await extractThesisMutation.mutateAsync(id);
      toast({
        title: "Thesis extracted",
        description: "Investment keywords have been extracted from the profile.",
      });
    } catch (error: unknown) {
      toast({
        title: "Extraction failed",
        description: error instanceof Error ? error.message : "Could not extract thesis keywords.",
        variant: "destructive",
      });
    }
  };
  
  const hasThesisData = thesis && (
    thesis.sectors.length > 0 || 
    thesis.stages.length > 0 || 
    thesis.geos.length > 0 ||
    thesis.checkSizes.length > 0 ||
    thesis.personas.length > 0
  );
  
  // Use provided contactType or auto-detect from title if not set
  const displayContactTypes = contactType && contactType.length > 0 
    ? contactType 
    : detectContactTypesFromTitle(role);

  return (
    <Card className="p-5 hover-elevate" data-testid={`contact-card-${id}`}>
      <div className="space-y-3">
        {/* Icons at the top, right-aligned */}
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              console.log('[ContactCard] Enrichment button clicked for:', fullName, id);
              onEnrich();
            }}
            data-testid="button-enrich-contact"
            title="Enrich contact data"
          >
            <Sparkles className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            data-testid="button-edit-contact"
            title="Expand contact details"
          >
            <ExpandIcon className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Name and role tags below icons */}
        <div>
          {displayContactTypes.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mb-1">
              {displayContactTypes.map((type) => (
                <RoleTag key={type} type={type} />
              ))}
            </div>
          )}
          <h3 className="text-base font-semibold" data-testid="text-contact-name">
            {fullName}
          </h3>
        </div>

        {/* Main Contact Information */}
        <div className="space-y-2">
          {/* 1. Name - already displayed in header */}
          
          {/* 2. Email */}
          {email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <a
                href={`mailto:${email}`}
                className="truncate text-primary hover:underline"
                data-testid="link-email"
                onClick={(e) => e.stopPropagation()}
              >
                {email}
              </a>
            </div>
          )}
          
          {/* 3. Title */}
          {role && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{role}</span>
            </div>
          )}
          
          {/* 4. Company */}
          {org && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{org}</span>
            </div>
          )}
          
          {/* 4b. Company Website */}
          {companyUrl && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <a
                href={companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-primary hover:underline"
                data-testid="link-company-url"
                onClick={(e) => e.stopPropagation()}
              >
                {companyUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            </div>
          )}
          
          {/* 5. LinkedIn */}
          {linkedinUrl && (
            <div className="flex items-center gap-2 text-sm">
              <Linkedin className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-primary hover:underline"
                data-testid="link-linkedin-full"
                onClick={(e) => e.stopPropagation()}
              >
                LinkedIn Profile
              </a>
            </div>
          )}
          
          {/* 6. Location */}
          {location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}
          
          {/* 7. Phone */}
          {phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <a
                href={`tel:${phone}`}
                className="truncate text-primary hover:underline"
                data-testid="link-phone"
                onClick={(e) => e.stopPropagation()}
              >
                {phone}
              </a>
            </div>
          )}
          
          {/* 8. Category - HIDDEN: Contact type tags next to name replace this */}
          
          {/* 9. Twitter */}
          {twitter && (
            <div className="flex items-center gap-2 text-sm">
              <TwitterIcon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <a
                href={twitter.startsWith('http') ? twitter : `https://twitter.com/${twitter.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-primary hover:underline"
                data-testid="link-twitter"
                onClick={(e) => e.stopPropagation()}
              >
                {twitter}
              </a>
            </div>
          )}
          
          {/* 10. AngelList */}
          {angellist && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <a
                href={angellist.startsWith('http') ? angellist : `https://angel.co/${angellist.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-primary hover:underline"
                data-testid="link-angellist"
                onClick={(e) => e.stopPropagation()}
              >
                AngelList Profile
              </a>
            </div>
          )}
          
          {/* 11. Bio (full text, no heading) */}
          {bio && bio.trim() && (
            <div className="text-sm text-muted-foreground pt-1" data-testid="text-bio">
              {bio}
            </div>
          )}
          
          {/* Thesis Keywords Section */}
          {hasThesisData ? (
            <div className="pt-2 space-y-2" data-testid="thesis-section">
              {thesis.sectors.length > 0 && (
                <div className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {thesis.sectors.map((sector, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {sector}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {thesis.stages.length > 0 && (
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {thesis.stages.map((stage, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {stage}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {thesis.geos.length > 0 && (
                <div className="flex items-start gap-2">
                  <Globe className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {thesis.geos.map((geo, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {geo}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {thesis.personas.length > 0 && (
                <div className="flex items-start gap-2">
                  <Tag className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {thesis.personas.map((keyword, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-primary/5">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (bio || investorNotes) && !thesisLoading ? (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-xs"
              onClick={handleExtractThesis}
              disabled={extractThesisMutation.isPending}
              data-testid="button-extract-thesis"
            >
              {extractThesisMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <BrainCircuit className="w-3 h-3 mr-1" />
                  Extract thesis keywords
                </>
              )}
            </Button>
          ) : null}
        </div>

        {/* Investor info - check size */}
        {(checkSizeMin || checkSizeMax) && (
          <>
            <Separator />
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground" data-testid="text-check-size">
                {formatCheckSizeRange(checkSizeMin, checkSizeMax)}
              </span>
            </div>
          </>
        )}

        {lastInteractionAt && (
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            Last: {new Date(lastInteractionAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </Card>
  );
}
