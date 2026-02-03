import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { contactFromDb, contactToDb } from '@/lib/supabaseHelpers';
import type { Contact, InsertContact } from '@shared/schema';

export function useContacts() {
  return useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      let allContacts: Record<string, unknown>[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allContacts = [...allContacts, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      
      return allContacts.map(contactFromDb);
    },
  });
}

export function useContactsCount() {
  return useQuery<number>({
    queryKey: ['/api/contacts/count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return 0;
      }

      const { count, error } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('owned_by_profile', user.id);
      
      if (error) throw error;
      return count || 0;
    },
  });
}

export function useContact(id: string) {
  return useQuery<Contact>({
    queryKey: ['/api/contacts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return contactFromDb(data);
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  return useMutation({
    mutationFn: async (contact: InsertContact) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const dbContact = contactToDb({
        ...contact,
        ownedByProfile: user.id,
      });

      const { data, error } = await supabase
        .from('contacts')
        .insert(dbContact)
        .select()
        .single();
      
      if (error) throw error;
      return contactFromDb(data);
    },
    onSuccess: async (createdContact) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/count'] });
      
      // Automatically extract thesis if contact has bio, title, or notes
      const hasBio = createdContact.bio && createdContact.bio.trim().length > 0;
      const hasTitle = createdContact.title && createdContact.title.trim().length > 0;
      const hasNotes = createdContact.investorNotes && createdContact.investorNotes.trim().length > 0;
      
      if (hasBio || hasTitle || hasNotes) {
        try {
          const { extractThesis } = await import('@/lib/edgeFunctions');
          await extractThesis(createdContact.id);
          queryClient.invalidateQueries({ queryKey: ['/api/contacts', createdContact.id, 'thesis'] });
          console.log('[Auto] Thesis extracted for new contact:', createdContact.name);
        } catch {
          console.log('[Auto] Thesis extraction skipped (edge function not deployed)');
        }
      }
    },
  });
}

export function useUpdateContact() {
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const dbUpdates = contactToDb(updates);
      
      const { data, error } = await supabase
        .from('contacts')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return contactFromDb(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', data.id] });
    },
  });
}

export function useDeleteContact() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/count'] });
    },
  });
}

export interface Thesis {
  id: string;
  contactId: string;
  sectors: string[];
  stages: string[];
  checkSizes: string[];
  geos: string[];
  personas: string[];
  intents: string[];
  notes: string | null;
}

export function useContactThesis(contactId: string) {
  return useQuery<Thesis | null>({
    queryKey: ['/api/contacts', contactId, 'thesis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theses')
        .select('*')
        .eq('contact_id', contactId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        id: data.id,
        contactId: data.contact_id,
        sectors: data.sectors || [],
        stages: data.stages || [],
        checkSizes: data.check_sizes || [],
        geos: data.geos || [],
        personas: data.personas || [],
        intents: data.intents || [],
        notes: data.notes,
      };
    },
    enabled: !!contactId,
  });
}

export function useExtractThesis() {
  return useMutation({
    mutationFn: async (contactId: string) => {
      const { extractThesis } = await import('@/lib/edgeFunctions');
      return extractThesis(contactId);
    },
    onSuccess: (_, contactId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contactId, 'thesis'] });
    },
  });
}
