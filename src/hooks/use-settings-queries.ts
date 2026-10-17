import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';

export interface UserSettings {
  id: string;
  userId: string;
  country: string;
  currency: string;
  language: string;
  theme: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch user settings
 */
export function useUserSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const response = await apiClient.getUserSettings(user.id) as { settings: UserSettings };
      return response.settings as UserSettings;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - settings don't change often
  });
}

/**
 * Hook to update user settings
 */
export function useUpdateUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return apiClient.updateUserSettings(user.id, settings);
    },
    onSuccess: () => {
      // Invalidate settings query to refetch
      queryClient.invalidateQueries({ queryKey: ['settings', user?.id] });
    },
  });
}
