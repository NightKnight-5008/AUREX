import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FinancialTransaction } from '@/types/financial';
import { useWorkspace } from '@/hooks/use-workspace';
import { checkPermission, getPermissionHeaders, handlePermissionError, PermissionDeniedError } from '@/lib/permission-guard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper function to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Helper function to create headers with auth
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

// Helper function to create headers for JSON requests
function getJsonHeaders(): HeadersInit {
  return {
    ...getAuthHeaders(),
    'Content-Type': 'application/json',
  };
}

interface TransactionResponse {
  transaction: any;
  message: string;
}

interface TransactionsResponse {
  transactions: any[];
}

// Map API response to FinancialTransaction type
function mapApiTransaction(apiTx: any): FinancialTransaction {
  return {
    id: apiTx.id,
    type: apiTx.type,
    amount: Number(apiTx.amount),
    category: apiTx.category || '',
    description: apiTx.description || '',
    date: new Date(apiTx.date),
    relatedCardId: apiTx.card_id,
    status: 'completed', // API doesn't store status yet
    photoData: apiTx.photo_data,
    createdAt: apiTx.created_at ? new Date(apiTx.created_at) : undefined,
    updatedAt: apiTx.updated_at ? new Date(apiTx.updated_at) : undefined,
  };
}

// GET /api/transactions - Fetch all transactions
// PERMISSION REQUIRED: canViewCards (transactions are tied to cards)
export function useTransactions() {
  const { membership } = useWorkspace();

  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      // Frontend permission check (UX optimization)
      const permCheck = checkPermission(membership, {
        permission: 'canViewCards',
        action: 'View transactions',
        resourceType: 'transaction',
      });

      if (!permCheck.allowed) {
        throw new PermissionDeniedError(
          permCheck.reason || 'You don\'t have permission to view transactions',
          'canViewCards'
        );
      }

      // Backend will validate permissions independently
      const response = await fetch(`${API_URL}/api/transactions`, {
        headers: getPermissionHeaders(membership),
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. You don\'t have permission to view transactions.');
        }
        throw new Error('Failed to fetch transactions');
      }

      const data: TransactionsResponse = await response.json();
      return data.transactions.map(mapApiTransaction);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!membership && membership.status === 'approved',
  });
}

// GET /api/transactions/:id - Fetch single transaction
export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/transactions/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transaction');
      }

      const data: TransactionResponse = await response.json();
      return mapApiTransaction(data.transaction);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

// POST /api/transactions - Create transaction
// PERMISSION REQUIRED: canCreateTransactions
export interface CreateTransactionData {
  type: string;
  amount: number;
  description?: string;
  category?: string;
  cardId?: string;
  date?: Date;
  photo?: File;
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { membership } = useWorkspace();

  return useMutation({
    mutationFn: async (data: CreateTransactionData) => {
      // Frontend permission check (UX optimization)
      const permCheck = checkPermission(membership, {
        permission: 'canCreateTransactions',
        action: 'Create transaction',
        resourceType: 'transaction',
      });

      if (!permCheck.allowed) {
        throw new PermissionDeniedError(
          permCheck.reason || 'You don\'t have permission to create transactions',
          'canCreateTransactions'
        );
      }

      const formData = new FormData();
      formData.append('type', data.type);
      formData.append('amount', data.amount.toString());

      if (data.description) formData.append('description', data.description);
      if (data.category) formData.append('category', data.category);
      if (data.cardId) formData.append('cardId', data.cardId);
      if (data.date) formData.append('date', data.date.toISOString());
      if (data.photo) formData.append('photo', data.photo);

      // Backend will validate permissions independently
      const response = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: getPermissionHeaders(membership),
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          throw new Error('Access denied. You don\'t have permission to create transactions.');
        }
        throw new Error(error.error || 'Failed to create transaction');
      }

      const result: TransactionResponse = await response.json();
      return mapApiTransaction(result.transaction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      const message = handlePermissionError(error);
      console.error('Create transaction failed:', message);
      // Error will be handled by the component using this hook
    },
  });
}

// PUT /api/transactions/:id - Update transaction
// PERMISSION REQUIRED: canEditTransactions
export interface UpdateTransactionData {
  id: string;
  type?: string;
  amount?: number;
  description?: string;
  category?: string;
  cardId?: string;
  date?: Date;
  photo?: File;
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { membership } = useWorkspace();

  return useMutation({
    mutationFn: async (data: UpdateTransactionData) => {
      // Frontend permission check (UX optimization)
      const permCheck = checkPermission(membership, {
        permission: 'canEditTransactions',
        action: 'Update transaction',
        resourceType: 'transaction',
      });

      if (!permCheck.allowed) {
        throw new PermissionDeniedError(
          permCheck.reason || 'You don\'t have permission to update transactions',
          'canEditTransactions'
        );
      }

      const formData = new FormData();

      if (data.type) formData.append('type', data.type);
      if (data.amount !== undefined) formData.append('amount', data.amount.toString());
      if (data.description !== undefined) formData.append('description', data.description);
      if (data.category !== undefined) formData.append('category', data.category);
      if (data.cardId !== undefined) formData.append('cardId', data.cardId);
      if (data.date) formData.append('date', data.date.toISOString());
      if (data.photo) formData.append('photo', data.photo);

      // Backend will validate permissions independently
      const response = await fetch(`${API_URL}/api/transactions/${data.id}`, {
        method: 'PUT',
        headers: getPermissionHeaders(membership),
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          throw new Error('Access denied. You don\'t have permission to update transactions.');
        }
        throw new Error(error.error || 'Failed to update transaction');
      }

      const result: TransactionResponse = await response.json();
      return mapApiTransaction(result.transaction);
    },
    onSuccess: (updatedTransaction) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', updatedTransaction.id] });
    },
    onError: (error) => {
      const message = handlePermissionError(error);
      console.error('Update transaction failed:', message);
    },
  });
}

// DELETE /api/transactions/:id - Delete transaction
// PERMISSION REQUIRED: canDeleteTransactions
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { membership } = useWorkspace();

  return useMutation({
    mutationFn: async (id: string) => {
      // Frontend permission check (UX optimization)
      const permCheck = checkPermission(membership, {
        permission: 'canDeleteTransactions',
        action: 'Delete transaction',
        resourceType: 'transaction',
      });

      if (!permCheck.allowed) {
        throw new PermissionDeniedError(
          permCheck.reason || 'You don\'t have permission to delete transactions',
          'canDeleteTransactions'
        );
      }

      // Backend will validate permissions independently
      const response = await fetch(`${API_URL}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: getPermissionHeaders(membership),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          throw new Error('Access denied. You don\'t have permission to delete transactions.');
        }
        throw new Error(error.error || 'Failed to delete transaction');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      const message = handlePermissionError(error);
      console.error('Delete transaction failed:', message);
    },
  });
}
