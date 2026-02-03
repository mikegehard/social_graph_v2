import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { matchFromDb } from '@/lib/supabaseHelpers';
import type { MatchSuggestion } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';

interface MatchWithContact extends MatchSuggestion {
  contact?: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
    title: string | null;
    location: string | null;
    bio: string | null;
    checkSizeMin: number | null;
    checkSizeMax: number | null;
    investorNotes: string | null;
    contactType: string[] | null;
  };
}

export function useMatchSuggestions(conversationId: string) {
  return useQuery<MatchWithContact[]>({
    queryKey: ['/api/conversations', conversationId, 'matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('match_suggestions')
        .select(`
          *,
          contact:contacts (
            id,
            name,
            email,
            company,
            title,
            location,
            bio,
            check_size_min,
            check_size_max,
            investor_notes,
            contact_type
          )
        `)
        .eq('conversation_id', conversationId)
        .order('score', { ascending: false });

      if (error) throw error;

      type MatchRow = Record<string, unknown> & {
        contact?: {
          check_size_min?: number;
          check_size_max?: number;
          investor_notes?: string;
          contact_type?: string[];
        }
      };
      return (data || []).map((row: MatchRow) => ({
        ...matchFromDb(row),
        contact: row.contact ? {
          ...row.contact,
          checkSizeMin: row.contact.check_size_min,
          checkSizeMax: row.contact.check_size_max,
          investorNotes: row.contact.investor_notes,
          contactType: row.contact.contact_type,
        } : undefined,
      }));
    },
    enabled: !!conversationId,
  });
}

export function useTopMatches(conversationId: string, minScore: number = 2) {
  return useQuery<MatchWithContact[]>({
    queryKey: ['/api/conversations', conversationId, 'top-matches', minScore],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('match_suggestions')
        .select(`
          *,
          contact:contacts (
            id,
            name,
            email,
            company,
            title,
            location,
            bio,
            check_size_min,
            check_size_max,
            investor_notes,
            contact_type
          )
        `)
        .eq('conversation_id', conversationId)
        .gte('score', minScore)
        .order('score', { ascending: false })
        .limit(10);

      if (error) throw error;

      type MatchRow = Record<string, unknown> & {
        contact?: {
          check_size_min?: number;
          check_size_max?: number;
          investor_notes?: string;
          contact_type?: string[];
        }
      };
      return (data || []).map((row: MatchRow) => ({
        ...matchFromDb(row),
        contact: row.contact ? {
          ...row.contact,
          checkSizeMin: row.contact.check_size_min,
          checkSizeMax: row.contact.check_size_max,
          investorNotes: row.contact.investor_notes,
          contactType: row.contact.contact_type,
        } : undefined,
      }));
    },
    enabled: !!conversationId,
  });
}

export function useConversationMatchStats() {
  return useQuery<Record<string, { introsOffered: number; introsMade: number }>>({
    queryKey: ['/api/conversations/match-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('match_suggestions')
        .select('conversation_id, status');

      if (error) throw error;

      const stats: Record<string, { introsOffered: number; introsMade: number }> = {};

      (data || []).forEach((match: { conversation_id: string; status: string }) => {
        if (!stats[match.conversation_id]) {
          stats[match.conversation_id] = { introsOffered: 0, introsMade: 0 };
        }
        
        stats[match.conversation_id].introsOffered += 1;
        
        if (match.status === 'accepted' || match.status === 'intro_made') {
          stats[match.conversation_id].introsMade += 1;
        }
      });
      
      return stats;
    },
  });
}

export function useUpdateMatchStatus(conversationId: string) {
  return useMutation({
    mutationFn: async ({ matchId, status }: { matchId: string; status: string }) => {
      const { data, error } = await supabase
        .from('match_suggestions')
        .update({ status } as Record<string, unknown>)
        .eq('id', matchId)
        .select();
      
      if (error) {
        throw new Error(error.message || 'Failed to update match');
      }
      return data?.[0] || null;
    },
    onMutate: async ({ matchId, status }) => {
      await queryClient.cancelQueries({ 
        queryKey: ['/api/conversations', conversationId, 'matches'] 
      });
      
      const previousMatches = queryClient.getQueryData<MatchWithContact[]>([
        '/api/conversations',
        conversationId,
        'matches'
      ]);
      
      queryClient.setQueryData<MatchWithContact[]>(
        ['/api/conversations', conversationId, 'matches'],
        (old) => old?.map(match => 
          match.id === matchId ? { ...match, status } : match
        ) || []
      );
      
      return { previousMatches };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousMatches) {
        queryClient.setQueryData(
          ['/api/conversations', conversationId, 'matches'],
          context.previousMatches
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', conversationId, 'matches'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/matches/all'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations/match-stats'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/introductions/stats'] 
      });
    },
  });
}
