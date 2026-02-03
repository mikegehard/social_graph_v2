import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { enrichContact } from "@/lib/edgeFunctions";
import { queryClient } from "@/lib/queryClient";

interface CsvUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedContact {
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  location?: string;
  phone?: string;
  category?: string;
  twitter?: string;
  angellist?: string;
  bio?: string;
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
  isLp?: boolean;
  errors: string[];
}

type UploadStage = 'upload' | 'parsing' | 'importing' | 'enriching' | 'complete';

// Type for existing contacts fetched from the database
interface ExistingContact {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  title?: string | null;
  linkedin_url?: string | null;
  location?: string | null;
  phone?: string | null;
  bio?: string | null;
  company_url?: string | null;
  company_address?: string | null;
  company_employees?: string | null;
  company_founded?: string | null;
  company_linkedin?: string | null;
  company_twitter?: string | null;
}

// Type for pending contacts to be inserted
interface PendingContact {
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  title?: string | null;
  company?: string | null;
  linkedin_url?: string | null;
  location?: string | null;
  phone?: string | null;
  category?: string | null;
  twitter?: string | null;
  angellist?: string | null;
  bio?: string | null;
  company_address?: string | null;
  company_employees?: string | null;
  company_founded?: string | null;
  company_url?: string | null;
  company_linkedin?: string | null;
  company_twitter?: string | null;
  company_facebook?: string | null;
  company_angellist?: string | null;
  company_crunchbase?: string | null;
  company_owler?: string | null;
  youtube_vimeo?: string | null;
  owned_by_profile?: string;
}

// Type for update data
interface ContactUpdateData {
  email?: string;
  title?: string;
  company?: string;
  linkedin_url?: string;
  location?: string;
  phone?: string;
  bio?: string;
  company_url?: string;
  company_address?: string;
  company_employees?: string;
  company_founded?: string;
  company_linkedin?: string;
  company_twitter?: string;
}

export default function CsvUploadDialog({ open, onOpenChange }: CsvUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage>('upload');
  const [, setContacts] = useState<ParsedContact[]>([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    created: 0,
    merged: 0,
    enriched: 0,
    failed: 0,
    enrichmentFailed: 0,
  });
  const { toast } = useToast();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateLinkedIn = (url: string): boolean => {
    return url.includes('linkedin.com/in/') || url.includes('linkedin.com/company/');
  };

  const isValidUrl = (str: string): boolean => {
    if (!str || str.trim() === '') return false;
    // Check if it looks like a URL (has domain-like structure or starts with http)
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i;
    return urlPattern.test(str.trim());
  };

  const normalizeLinkedInUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://linkedin.com/in/${url}`;
  };

  const parseCSV = (file: File) => {
    setStage('parsing');
    setProgress(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsed: ParsedContact[] = results.data.map((row: Record<string, string | undefined>) => {
          const errors: string[] = [];
          
          // Extract and validate fields (flexible column name matching)
          const firstName = row['First Name'] || row.first_name || row.firstName || '';
          const lastName = row['Last Name'] || row.last_name || row.lastName || '';
          const name = firstName && lastName ? `${firstName} ${lastName}`.trim() : 
                       row.name || row.Name || row.full_name || row['Full Name'] || row.contact_name || firstName || '';
          
          const email = row.email || row.Email || row.email_address || row['Email'] || '';
          const title = row.title || row.Title || row.position || row.Position || '';
          const company = row.company || row.Company || row['Company Name'] || row.organization || row.Organization || '';
          const linkedin = row.linkedin || row.LinkedIn || row.Linkedin || row.linkedin_url || row['LinkedIn URL'] || '';
          const location = row.location || row.Location || '';
          const phone = row.phone || row.Phone || '';
          const category = row.category || row.Category || row.Catagory || row.catagory || '';
          const twitter = row.twitter || row.Twitter || '';
          const angellist = row.angellist || row.Angellist || row['Angel List'] || row.angel_list || '';
          const bio = row.bio || row.Bio || row.about || row.About || row.description || row.Description || row.summary || row.Summary || 
                     row['Company Description'] || row.company_description || row['Company About'] || row.company_about || 
                     row['Person Summary'] || row.person_summary || row['Profile'] || row.profile || '';
          
          // Company information fields
          const companyAddress = row['Company Address'] || row.company_address || row['Address'] || row.address || row['Company Street'] || row.company_street || row['HQ Address'] || row.hq_address || '';
          const companyEmployees = row['Company # of Employees'] || row.company_employees || row['Employees'] || row.employees || row['Company Size'] || row.company_size || '';
          const companyFounded = row['Company Founded'] || row.company_founded || row['Founded'] || row.founded || row['Year Founded'] || row.year_founded || '';
          
          // Get raw company URL candidate and validate it's actually a URL
          const companyUrlRaw = row['Company URL'] || row.company_url || row['Website'] || row.website || row['Company Website'] || row.company_website || row['URL'] || row.url || '';
          const companyUrl = isValidUrl(companyUrlRaw) ? companyUrlRaw : '';
          const companyLinkedin = row['Company Linkedin'] || row['Company LinkedIn'] || row.company_linkedin || '';
          const companyTwitter = row['Company Twitter'] || row.company_twitter || '';
          const companyFacebook = row['Company Facebook'] || row.company_facebook || '';
          const companyAngellist = row['Company Angel list'] || row['Company Angellist'] || row.company_angellist || '';
          const companyCrunchbase = row['Company Crunchbase'] || row.company_crunchbase || '';
          const companyOwler = row['Company Owler'] || row.company_owler || '';
          const youtubeVimeo = row['Youtube/Vimeo'] || row['YouTube/Vimeo'] || row.youtube_vimeo || '';
          
          const isLp = row.is_lp === 'true' || row.is_lp === '1' || row.type?.toLowerCase() === 'lp';

          // Validate required field
          if (!name || name.trim() === '') {
            errors.push('Missing name');
          }

          // Validate email format if provided
          if (email && !validateEmail(email)) {
            errors.push('Invalid email format');
          }

          // Validate LinkedIn URL if provided
          if (linkedin && !validateLinkedIn(linkedin)) {
            errors.push('Invalid LinkedIn URL');
          }

          return {
            name: name.trim(),
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            email: email.trim() || undefined,
            title: title.trim() || undefined,
            company: company.trim() || undefined,
            linkedinUrl: linkedin ? normalizeLinkedInUrl(linkedin.trim()) : undefined,
            location: location.trim() || undefined,
            phone: phone.trim() || undefined,
            category: category.trim() || undefined,
            twitter: twitter.trim() || undefined,
            angellist: angellist.trim() || undefined,
            bio: bio.trim() || undefined,
            companyAddress: companyAddress.trim() || undefined,
            companyEmployees: companyEmployees.trim() || undefined,
            companyFounded: companyFounded.trim() || undefined,
            companyUrl: companyUrl.trim() || undefined,
            companyLinkedin: companyLinkedin.trim() || undefined,
            companyTwitter: companyTwitter.trim() || undefined,
            companyFacebook: companyFacebook.trim() || undefined,
            companyAngellist: companyAngellist.trim() || undefined,
            companyCrunchbase: companyCrunchbase.trim() || undefined,
            companyOwler: companyOwler.trim() || undefined,
            youtubeVimeo: youtubeVimeo.trim() || undefined,
            isLp: isLp || false,
            errors,
          };
        });

        setContacts(parsed);
        setStats(s => ({ ...s, total: parsed.length }));
        setProgress(100);

        toast({
          title: "CSV parsed successfully!",
          description: `Found ${parsed.length} contacts. Starting import...`,
        });

        // Auto-start import (duplicates are handled during import)
        await importContacts(parsed);
      },
      error: (parseError) => {
        toast({
          title: "Failed to parse CSV",
          description: parseError.message,
          variant: "destructive",
        });
        setStage('upload');
      },
    });
  };

  const importContacts = async (contactsToImport: ParsedContact[]) => {
    setStage('importing');
    setProgress(0);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication error",
        description: "Please log in to import contacts",
        variant: "destructive",
      });
      return;
    }

    // Fetch all existing contacts for this user to check for duplicates
    const { data: existingContacts, error: fetchError } = await supabase
      .from('contacts')
      .select('id, name, email, company, title, linkedin_url, location, phone, bio, company_url, company_address, company_employees, company_founded, company_linkedin, company_twitter')
      .eq('owned_by_profile', user.id) as { data: ExistingContact[] | null; error: unknown };

    if (fetchError) {
      console.error('Error fetching existing contacts:', fetchError);
      toast({
        title: "Error checking duplicates",
        description: "Could not check for duplicate contacts",
        variant: "destructive",
      });
      return;
    }

    // Build lookup maps for existing contacts (normalize with trim + lowercase)
    const existingByEmail = new Map<string, ExistingContact>();
    const existingByNameCompany = new Map<string, ExistingContact>();
    
    existingContacts?.forEach(contact => {
      if (contact.email) {
        existingByEmail.set(contact.email.trim().toLowerCase(), contact);
      }
      if (contact.name && contact.company) {
        const key = `${contact.name.trim().toLowerCase()}|${contact.company.trim().toLowerCase()}`;
        existingByNameCompany.set(key, contact);
      }
    });

    // Primary storage for pending new contacts (to merge same-CSV duplicates)
    const pendingContacts: PendingContact[] = [];
    const pendingByEmail = new Map<string, PendingContact>();
    const pendingByNameCompany = new Map<string, PendingContact>();
    const pendingByName = new Map<string, PendingContact[]>(); // Array because name alone might not be unique

    let merged = 0;
    let failed = 0;
    const insertedContactIds: string[] = [];
    const warnings: string[] = [];
    const toUpdate: Array<{ id: string; data: ContactUpdateData }> = [];

    // Helper to update pending lookup maps (normalize with trim + lowercase)
    const updatePendingMaps = (contact: PendingContact) => {
      if (contact.email) {
        pendingByEmail.set(contact.email.trim().toLowerCase(), contact);
      }
      if (contact.name && contact.company) {
        const key = `${contact.name.trim().toLowerCase()}|${contact.company.trim().toLowerCase()}`;
        pendingByNameCompany.set(key, contact);
      }
      // Always index by name for fallback matching
      if (contact.name) {
        const nameKey = contact.name.trim().toLowerCase();
        const existingArray = pendingByName.get(nameKey) || [];
        const existingSet = new Set(existingArray);
        existingSet.add(contact);
        pendingByName.set(nameKey, Array.from(existingSet));
      }
    };

    // Process all CSV contacts and build insert/update batches
    for (let i = 0; i < contactsToImport.length; i++) {
      const csvContact = contactsToImport[i];
      
      // Skip if no name
      if (!csvContact.name || csvContact.name.trim().length === 0) {
        failed++;
        continue;
      }

      // Track validation warnings
      if (csvContact.errors.length > 0) {
        warnings.push(`${csvContact.name}: ${csvContact.errors.join(', ')}`);
      }

      // Check for duplicate in EXISTING contacts first (normalize with trim + lowercase)
      let existingDuplicate = null;
      
      if (csvContact.email) {
        existingDuplicate = existingByEmail.get(csvContact.email.trim().toLowerCase());
      }
      
      if (!existingDuplicate && csvContact.company) {
        const key = `${csvContact.name.trim().toLowerCase()}|${csvContact.company.trim().toLowerCase()}`;
        existingDuplicate = existingByNameCompany.get(key);
      }

      if (existingDuplicate) {
        // MERGE with EXISTING contact: Prepare update (only fill in missing fields)
        const updateData: ContactUpdateData = {};
        
        if (csvContact.email && !existingDuplicate.email) updateData.email = csvContact.email;
        if (csvContact.title && !existingDuplicate.title) updateData.title = csvContact.title;
        if (csvContact.company && !existingDuplicate.company) updateData.company = csvContact.company;
        if (csvContact.linkedinUrl && !existingDuplicate.linkedin_url) updateData.linkedin_url = csvContact.linkedinUrl;
        if (csvContact.location && !existingDuplicate.location) updateData.location = csvContact.location;
        if (csvContact.phone && !existingDuplicate.phone) updateData.phone = csvContact.phone;
        if (csvContact.bio && !existingDuplicate.bio) updateData.bio = csvContact.bio;
        if (csvContact.companyUrl && !existingDuplicate.company_url) updateData.company_url = csvContact.companyUrl;
        if (csvContact.companyAddress && !existingDuplicate.company_address) updateData.company_address = csvContact.companyAddress;
        if (csvContact.companyEmployees && !existingDuplicate.company_employees) updateData.company_employees = csvContact.companyEmployees;
        if (csvContact.companyFounded && !existingDuplicate.company_founded) updateData.company_founded = csvContact.companyFounded;
        if (csvContact.companyLinkedin && !existingDuplicate.company_linkedin) updateData.company_linkedin = csvContact.companyLinkedin;
        if (csvContact.companyTwitter && !existingDuplicate.company_twitter) updateData.company_twitter = csvContact.companyTwitter;

        // Only queue update if there are fields to merge
        if (Object.keys(updateData).length > 0) {
          toUpdate.push({ id: existingDuplicate.id, data: updateData });
        }
        
        merged++;
        insertedContactIds.push(existingDuplicate.id);
      } else {
        // Check for duplicate in PENDING new contacts (same CSV) - normalize with trim + lowercase
        let pendingDuplicate = null;
        
        // 1. Try exact email match (highest confidence)
        if (csvContact.email) {
          pendingDuplicate = pendingByEmail.get(csvContact.email.trim().toLowerCase());
        }
        
        // 2. Try exact name+company match
        if (!pendingDuplicate && csvContact.company) {
          const key = `${csvContact.name.trim().toLowerCase()}|${csvContact.company.trim().toLowerCase()}`;
          pendingDuplicate = pendingByNameCompany.get(key);
        }
        
        // 3. Fallback: Try name-only match (ONLY for complementary partial data)
        if (!pendingDuplicate && csvContact.name) {
          const nameMatches = pendingByName.get(csvContact.name.trim().toLowerCase()) || [];
          // Only merge if:
          // - Exactly one match by name
          // - The existing contact is missing key fields (partial data)
          // - No conflicts between the two records
          if (nameMatches.length === 1) {
            const candidate = nameMatches[0];
            const isPartial = !candidate.email || !candidate.company;
            const hasConflicts = 
              (candidate.email && csvContact.email && candidate.email !== csvContact.email) ||
              (candidate.company && csvContact.company && candidate.company.toLowerCase() !== csvContact.company.toLowerCase());
            
            // Only merge complementary partial records (no conflicts)
            if (isPartial && !hasConflicts) {
              pendingDuplicate = candidate;
            }
          }
        }

        if (pendingDuplicate) {
          // MERGE with PENDING contact: Update the pending contact object
          if (csvContact.email && !pendingDuplicate.email) {
            pendingDuplicate.email = csvContact.email;
          }
          if (csvContact.title && !pendingDuplicate.title) {
            pendingDuplicate.title = csvContact.title;
          }
          if (csvContact.company && !pendingDuplicate.company) {
            pendingDuplicate.company = csvContact.company;
          }
          if (csvContact.linkedinUrl && !pendingDuplicate.linkedin_url) {
            pendingDuplicate.linkedin_url = csvContact.linkedinUrl;
          }
          if (csvContact.firstName && !pendingDuplicate.first_name) {
            pendingDuplicate.first_name = csvContact.firstName;
          }
          if (csvContact.lastName && !pendingDuplicate.last_name) {
            pendingDuplicate.last_name = csvContact.lastName;
          }
          if (csvContact.location && !pendingDuplicate.location) {
            pendingDuplicate.location = csvContact.location;
          }
          if (csvContact.phone && !pendingDuplicate.phone) {
            pendingDuplicate.phone = csvContact.phone;
          }
          if (csvContact.category && !pendingDuplicate.category) {
            pendingDuplicate.category = csvContact.category;
          }
          if (csvContact.twitter && !pendingDuplicate.twitter) {
            pendingDuplicate.twitter = csvContact.twitter;
          }
          if (csvContact.angellist && !pendingDuplicate.angellist) {
            pendingDuplicate.angellist = csvContact.angellist;
          }
          if (csvContact.bio && !pendingDuplicate.bio) {
            pendingDuplicate.bio = csvContact.bio;
          }
          if (csvContact.companyAddress && !pendingDuplicate.company_address) {
            pendingDuplicate.company_address = csvContact.companyAddress;
          }
          if (csvContact.companyEmployees && !pendingDuplicate.company_employees) {
            pendingDuplicate.company_employees = csvContact.companyEmployees;
          }
          if (csvContact.companyFounded && !pendingDuplicate.company_founded) {
            pendingDuplicate.company_founded = csvContact.companyFounded;
          }
          if (csvContact.companyUrl && !pendingDuplicate.company_url) {
            pendingDuplicate.company_url = csvContact.companyUrl;
          }
          if (csvContact.companyLinkedin && !pendingDuplicate.company_linkedin) {
            pendingDuplicate.company_linkedin = csvContact.companyLinkedin;
          }
          if (csvContact.companyTwitter && !pendingDuplicate.company_twitter) {
            pendingDuplicate.company_twitter = csvContact.companyTwitter;
          }
          if (csvContact.companyFacebook && !pendingDuplicate.company_facebook) {
            pendingDuplicate.company_facebook = csvContact.companyFacebook;
          }
          if (csvContact.companyAngellist && !pendingDuplicate.company_angellist) {
            pendingDuplicate.company_angellist = csvContact.companyAngellist;
          }
          if (csvContact.companyCrunchbase && !pendingDuplicate.company_crunchbase) {
            pendingDuplicate.company_crunchbase = csvContact.companyCrunchbase;
          }
          if (csvContact.companyOwler && !pendingDuplicate.company_owler) {
            pendingDuplicate.company_owler = csvContact.companyOwler;
          }
          if (csvContact.youtubeVimeo && !pendingDuplicate.youtube_vimeo) {
            pendingDuplicate.youtube_vimeo = csvContact.youtubeVimeo;
          }
          
          // Update lookup maps with newly added fields
          updatePendingMaps(pendingDuplicate);
          
          merged++;
        } else {
          // CREATE: New pending contact
          const newContact = {
            name: csvContact.name,
            first_name: csvContact.firstName || null,
            last_name: csvContact.lastName || null,
            email: csvContact.email || null,
            title: csvContact.title || null,
            company: csvContact.company || null,
            linkedin_url: csvContact.linkedinUrl || null,
            location: csvContact.location || null,
            phone: csvContact.phone || null,
            category: csvContact.category || null,
            twitter: csvContact.twitter || null,
            angellist: csvContact.angellist || null,
            bio: csvContact.bio || null,
            company_address: csvContact.companyAddress || null,
            company_employees: csvContact.companyEmployees || null,
            company_founded: csvContact.companyFounded || null,
            company_url: csvContact.companyUrl || null,
            company_linkedin: csvContact.companyLinkedin || null,
            company_twitter: csvContact.companyTwitter || null,
            company_facebook: csvContact.companyFacebook || null,
            company_angellist: csvContact.companyAngellist || null,
            company_crunchbase: csvContact.companyCrunchbase || null,
            company_owler: csvContact.companyOwler || null,
            youtube_vimeo: csvContact.youtubeVimeo || null,
            owned_by_profile: user.id,
          };
          
          pendingContacts.push(newContact);
          updatePendingMaps(newContact);
        }
      }

      // Update progress during processing
      if (i % 100 === 0) {
        setProgress((i / contactsToImport.length) * 50); // First 50% for processing
        setStats(prev => ({ ...prev, created: pendingContacts.length, merged, failed })); // Use length here as inserts haven't started
      }
    }

    // toInsert is just the pending contacts array (already merged)
    const toInsert = pendingContacts;

    // Execute batched inserts
    const BATCH_SIZE = 500;
    let createdCount = 0;  // Track actual successfully inserted contacts
    
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      
      try {
        const { data, error } = await supabase
          .from('contacts')
          .insert(batch as PendingContact[])
          .select('id') as { data: { id: string }[] | null; error: unknown };

        if (error) throw error;

        if (data) {
          insertedContactIds.push(...data.map((c) => c.id));
          createdCount += data.length;
        }
      } catch (error: unknown) {
        console.error('Batch insert error:', error);
        failed += batch.length;
      }

      const batchProgress = 50 + ((i + batch.length) / toInsert.length) * 25; // 50-75% for inserts
      setProgress(batchProgress);
      // Update stats after each batch to reflect actual successes/failures
      setStats({
        total: contactsToImport.length,
        created: createdCount,  // Use actual count, not pendingContacts.length
        merged,
        failed,
        enriched: 0,
        enrichmentFailed: 0
      });
    }

    // Execute batched updates
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);
      
      try {
        // Supabase doesn't support batch updates, so we do them in parallel
        await Promise.all(
          batch.map(({ id, data }: { id: string; data: ContactUpdateData }) =>
            supabase.from('contacts').update(data).eq('id', id)
          )
        );
      } catch (error: unknown) {
        console.error('Batch update error:', error);
      }

      const updateProgress = 75 + ((i + batch.length) / Math.max(toUpdate.length, 1)) * 25; // 75-100%
      setProgress(updateProgress);
    }
    
    // Final stats update after all batches complete
    setStats({
      total: contactsToImport.length,
      created: createdCount,  // Use actual count
      merged,
      failed,
      enriched: 0,
      enrichmentFailed: 0
    });

    const contactsWithoutName = contactsToImport.filter(c => !c.name || c.name.trim().length === 0).length;
    
    // Build toast message with all stats
    const parts = [];
    parts.push(`Created ${createdCount} new contacts`);  // Use actual count
    if (merged > 0) parts.push(`merged ${merged} duplicates`);
    if (failed > 0) parts.push(`${failed} failed`);
    if (contactsWithoutName > 0) parts.push(`${contactsWithoutName} skipped (no name)`);
    if (warnings.length > 0) parts.push(`${warnings.length} with warnings`);
    
    toast({
      title: "Contacts imported!",
      description: parts.join(', ') + '.',
    });

    // Store warnings for display in complete stage
    if (warnings.length > 0) {
      console.log('Validation warnings:', warnings);
    }

    // Invalidate contacts cache
    queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
    queryClient.invalidateQueries({ queryKey: ['/api/contacts/count'] });

    // Start enrichment for all processed contacts
    await enrichContacts(insertedContactIds);
  };

  const enrichContacts = async (contactIds: string[]) => {
    setStage('enriching');
    setProgress(0);

    // Only enrich contacts that have potential for enrichment
    const { data: contactsToEnrich } = await supabase
      .from('contacts')
      .select('id, email, name, company, linkedin_url')
      .in('id', contactIds)
      .or('email.not.is.null,linkedin_url.not.is.null,company.not.is.null') as { data: { id: string; email?: string; name?: string; company?: string; linkedin_url?: string }[] | null };

    if (!contactsToEnrich || contactsToEnrich.length === 0) {
      // No enrichment needed, proceed to thesis extraction
      if (contactIds.length > 0) {
        await extractThesesBatch(contactIds);
      } else {
        setStage('complete');
      }
      return;
    }

    let enriched = 0;
    let enrichmentFailed = 0;

    // Enrich with rate limiting (max 10 concurrent)
    const CONCURRENT_LIMIT = 10;
    
    for (let i = 0; i < contactsToEnrich.length; i += CONCURRENT_LIMIT) {
      const batch = contactsToEnrich.slice(i, i + CONCURRENT_LIMIT);
      
      const enrichmentPromises = batch.map(async (contact) => {
        try {
          await enrichContact(contact.id, 'auto');
          enriched++;
        } catch {
          enrichmentFailed++;
        }
      });

      await Promise.allSettled(enrichmentPromises);

      setProgress(((i + batch.length) / contactsToEnrich.length) * 100);
      setStats(prev => ({ ...prev, enriched, enrichmentFailed }));

      // Rate limiting delay (avoid hitting API limits)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
    queryClient.invalidateQueries({ queryKey: ['/api/contacts/count'] });

    toast({
      title: "Enrichment complete!",
      description: `Enriched ${enriched} contacts. ${enrichmentFailed} could not be enriched.`,
    });
    
    // After enrichment, extract theses
    await extractThesesBatch(contactIds);
  };
  
  const extractThesesBatch = async (contactIds: string[]) => {
    // Only extract thesis for contacts that have bio, title, or investor_notes
    const { data: contactsForThesis } = await supabase
      .from('contacts')
      .select('id, name, bio, title, investor_notes')
      .in('id', contactIds)
      .or('bio.not.is.null,title.not.is.null,investor_notes.not.is.null') as { data: { id: string; name?: string; bio?: string; title?: string; investor_notes?: string }[] | null };

    if (!contactsForThesis || contactsForThesis.length === 0) {
      setStage('complete');
      return;
    }
    
    // Filter to contacts that actually have content to analyze
    const contactsWithContent = contactsForThesis.filter(c => 
      (c.bio && c.bio.trim().length > 0) || 
      (c.title && c.title.trim().length > 0) || 
      (c.investor_notes && c.investor_notes.trim().length > 0)
    );
    
    if (contactsWithContent.length === 0) {
      setStage('complete');
      return;
    }

    setProgress(0);
    let thesisExtracted = 0;
    let _thesisFailed = 0;

    // Extract thesis with rate limiting (max 5 concurrent to avoid overloading OpenAI)
    const CONCURRENT_LIMIT = 5;
    
    try {
      const { extractThesis } = await import('@/lib/edgeFunctions');
      
      for (let i = 0; i < contactsWithContent.length; i += CONCURRENT_LIMIT) {
        const batch = contactsWithContent.slice(i, i + CONCURRENT_LIMIT);
        
        const thesisPromises = batch.map(async (contact) => {
          try {
            await extractThesis(contact.id);
            thesisExtracted++;
            console.log(`[Auto] Thesis extracted for: ${contact.name}`);
          } catch {
            _thesisFailed++;
            console.log(`[Auto] Thesis extraction failed for: ${contact.name}`);
          }
        });

        await Promise.allSettled(thesisPromises);

        setProgress(((i + batch.length) / contactsWithContent.length) * 100);

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (thesisExtracted > 0) {
        toast({
          title: "Thesis extraction complete!",
          description: `Extracted keywords from ${thesisExtracted} contacts.`,
        });
      }
    } catch {
      console.log('[Auto] Thesis extraction skipped (edge function may not be deployed)');
    }

    setStage('complete');
    queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (file) {
      parseCSV(file);
    }
  };

  const handleClose = () => {
    // Prevent closing during active operations
    if (stage !== 'upload' && stage !== 'complete') {
      toast({
        title: "Please wait",
        description: "Import in progress. Please wait until it completes.",
        variant: "destructive",
      });
      return;
    }
    
    setFile(null);
    setStage('upload');
    setContacts([]);
    setProgress(0);
    setStats({ total: 0, created: 0, merged: 0, enriched: 0, failed: 0, enrichmentFailed: 0 });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" data-testid="dialog-csv-upload">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your contacts. We'll validate, import, and enrich them automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {stage === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                  data-testid="input-csv-file"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-2">
                    {file ? file.name : 'Click to select CSV file'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports all contact fields: name, email, title, company, location, phone, bio, linkedin, twitter, and all company information
                  </p>
                </label>
              </div>

              {file && (
                <Button
                  onClick={handleUpload}
                  className="w-full"
                  data-testid="button-start-import"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Import {file.name}
                </Button>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Expected CSV columns:</strong></p>
                <p>• name (required)</p>
                <p>• email, title, company, linkedin, is_lp (optional)</p>
                <p className="pt-2"><strong>What happens:</strong></p>
                <p>1. Parse and validate all contacts</p>
                <p>2. Import to database (even with missing data)</p>
                <p>3. Enrich with Hunter.io & People Data Labs</p>
                <p>4. Validate emails and LinkedIn URLs</p>
              </div>
            </div>
          )}

          {stage === 'parsing' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Parsing CSV file...</p>
                  <p className="text-sm text-muted-foreground">Reading and validating contacts</p>
                </div>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {stage === 'importing' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Importing contacts...</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.created + stats.merged} of {stats.total} processed ({stats.created} created, {stats.merged} merged)
                  </p>
                </div>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {stage === 'enriching' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                <div className="flex-1">
                  <p className="font-medium">Enriching contacts...</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.enriched} enriched, {stats.enrichmentFailed} failed
                  </p>
                </div>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                Fetching additional data from Hunter.io and People Data Labs...
              </p>
            </div>
          )}

          {stage === 'complete' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle2 className="w-8 h-8" />
                <div>
                  <p className="font-medium text-lg">Import complete!</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Contacts</p>
                  <p className="text-2xl font-semibold">{stats.total}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-2xl font-semibold text-green-600">{stats.created}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Merged</p>
                  <p className="text-2xl font-semibold text-blue-600">{stats.merged}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enriched</p>
                  <p className="text-2xl font-semibold text-purple-600">{stats.enriched}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-semibold text-red-600">
                    {stats.failed + stats.enrichmentFailed}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleClose}
                className="w-full"
                data-testid="button-close-import"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
