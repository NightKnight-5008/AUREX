import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import type { CompanyCard } from '@/types/financial';

/**
 * Hook to fetch all credit cards for the current user
 */
export function useCards() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cards', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const response = await apiClient.getCreditCards(user.id) as { cards: CompanyCard[] };
      return response.cards || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single credit card
 */
export function useCard(cardId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cards', cardId],
    queryFn: async () => {
      if (!cardId) throw new Error('Card ID required');
      
      const response = await apiClient.getCreditCard(cardId) as { card: CompanyCard };
      return response.card;
    },
    enabled: !!cardId && !!user?.id,
  });
}

/**
 * Hook to create a new credit card
 */
export function useCreateCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardData: Partial<CompanyCard>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return apiClient.createCreditCard(user.id, cardData);
    },
    onSuccess: () => {
      // Invalidate cards query to refetch
      queryClient.invalidateQueries({ queryKey: ['cards', user?.id] });
    },
  });
}

/**
 * Hook to update a credit card
 */
export function useUpdateCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, cardData }: { cardId: string; cardData: Partial<CompanyCard> }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return apiClient.updateCreditCard(cardId, user.id, cardData);
    },
    onSuccess: (_, variables) => {
      // Invalidate both the list and the specific card
      queryClient.invalidateQueries({ queryKey: ['cards', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cards', variables.cardId] });
    },
  });
}

/**
 * Hook to delete a credit card
 */
export function useDeleteCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return apiClient.deleteCreditCard(cardId, user.id);
    },
    onSuccess: () => {
      // Invalidate cards query to refetch
      queryClient.invalidateQueries({ queryKey: ['cards', user?.id] });
    },
  });
}
