import { useMutation, useQuery } from '@tanstack/react-query';
import { platformApi } from '@/sdk/core/request';
import { getAuthToken } from '@/sdk/core/auth';

/**
 * Request to create a new Google Document
 */
export interface CreateDocumentRequest {
  title?: string;
}

/**
 * Batch update request for document content
 */
export interface BatchUpdateRequest {
  requests: Array<{
    insertText?: {
      location: { index: number };
      text: string;
    };
    updateParagraphStyle?: {
      range: { startIndex: number; endIndex: number };
      paragraphStyle: {
        namedStyleType?: 'HEADING_1' | 'HEADING_2' | 'HEADING_3' | 'NORMAL_TEXT';
      };
      fields?: string;
    };
    updateTextStyle?: {
      range: { startIndex: number; endIndex: number };
      textStyle: {
        bold?: boolean;
        fontSize?: {
          magnitude?: number;
          unit?: string;
        };
      };
      fields?: string;
    };
    insertTable?: {
      location: { index: number };
      rows: number;
      columns: number;
    };
  }>;
}

/**
 * Response from batch update
 */
export interface BatchUpdateResponse {
  documentId: string;
  replies?: Array<Record<string, unknown>>;
}

/**
 * Document response
 */
export interface DocumentResponse {
  documentId: string;
  title?: string;
  body?: {
    content?: Array<Record<string, unknown>>;
  };
  revisionId?: string;
}

/**
 * Hook to create a new Google Document
 *
 * @example
 * const { mutateAsync: createDocument } = useCreateGoogleDoc();
 * const response = await createDocument({
 *   title: 'Monthly Financial Report - January 2026'
 * });
 */
export function useCreateGoogleDoc() {
  return useMutation({
    mutationFn: async (request: CreateDocumentRequest): Promise<DocumentResponse> => {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'X-CREAO-API-NAME': 'GoogleDocs',
        'X-CREAO-API-PATH': '/documents',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.post(
        '/documents',
        {
          title: request.title || 'Untitled Document',
        },
        { headers }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create document' }));
        throw new Error(error.message || 'Failed to create document');
      }

      return response.json();
    },
  });
}

/**
 * Hook to batch update document content
 *
 * @example
 * const { mutateAsync: updateDocument } = useBatchUpdateGoogleDoc();
 * await updateDocument({
 *   documentId: 'doc123',
 *   requests: [
 *     {
 *       insertText: {
 *         location: { index: 1 },
 *         text: 'Financial Report Header'
 *       }
 *     }
 *   ]
 * });
 */
export function useBatchUpdateGoogleDoc() {
  return useMutation({
    mutationFn: async (options: {
      documentId: string;
      requests: BatchUpdateRequest['requests'];
    }): Promise<BatchUpdateResponse> => {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'X-CREAO-API-NAME': 'GoogleDocs',
        'X-CREAO-API-PATH': '/documents/{documentId}:batchUpdate',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.post(
        `/documents/${options.documentId}:batchUpdate`,
        {
          requests: options.requests,
        },
        { headers }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update document' }));
        throw new Error(error.message || 'Failed to update document');
      }

      return response.json();
    },
  });
}

/**
 * Hook to get document details
 *
 * @example
 * const { data: document, isLoading } = useGetGoogleDoc('doc123');
 */
export function useGetGoogleDoc(documentId?: string) {
  return useQuery({
    queryKey: ['googleDoc', documentId],
    queryFn: async (): Promise<DocumentResponse> => {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'X-CREAO-API-NAME': 'GoogleDocs',
        'X-CREAO-API-PATH': '/documents/{documentId}',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.get(`/documents/${documentId}`, { headers });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to get document' }));
        throw new Error(error.message || 'Failed to get document');
      }

      return response.json();
    },
    enabled: !!documentId && !!getAuthToken(),
  });
}

/**
 * Helper hook to insert text into a Google Doc
 *
 * @example
 * const { mutateAsync: insertText } = useInsertTextGoogleDoc();
 * await insertText({
 *   documentId: 'doc123',
 *   index: 1,
 *   text: 'New paragraph text'
 * });
 */
export function useInsertTextGoogleDoc() {
  return useMutation({
    mutationFn: async (options: {
      documentId: string;
      index: number;
      text: string;
    }): Promise<BatchUpdateResponse> => {
      const { mutateAsync: updateDocument } = useBatchUpdateGoogleDoc();

      return updateDocument({
        documentId: options.documentId,
        requests: [
          {
            insertText: {
              location: { index: options.index },
              text: options.text,
            },
          },
        ],
      });
    },
  });
}

/**
 * Helper hook to insert a table into a Google Doc
 *
 * @example
 * const { mutateAsync: insertTable } = useInsertTableGoogleDoc();
 * await insertTable({
 *   documentId: 'doc123',
 *   index: 1,
 *   rows: 3,
 *   columns: 4
 * });
 */
export function useInsertTableGoogleDoc() {
  return useMutation({
    mutationFn: async (options: {
      documentId: string;
      index: number;
      rows: number;
      columns: number;
    }): Promise<BatchUpdateResponse> => {
      const { mutateAsync: updateDocument } = useBatchUpdateGoogleDoc();

      return updateDocument({
        documentId: options.documentId,
        requests: [
          {
            insertTable: {
              location: { index: options.index },
              rows: options.rows,
              columns: options.columns,
            },
          },
        ],
      });
    },
  });
}

/**
 * Helper hook to update text style in a Google Doc
 *
 * @example
 * const { mutateAsync: updateStyle } = useUpdateTextStyleGoogleDoc();
 * await updateStyle({
 *   documentId: 'doc123',
 *   startIndex: 0,
 *   endIndex: 10,
 *   bold: true,
 *   fontSize: 14
 * });
 */
export function useUpdateTextStyleGoogleDoc() {
  return useMutation({
    mutationFn: async (options: {
      documentId: string;
      startIndex: number;
      endIndex: number;
      bold?: boolean;
      fontSize?: number;
    }): Promise<BatchUpdateResponse> => {
      const { mutateAsync: updateDocument } = useBatchUpdateGoogleDoc();

      return updateDocument({
        documentId: options.documentId,
        requests: [
          {
            updateTextStyle: {
              range: {
                startIndex: options.startIndex,
                endIndex: options.endIndex,
              },
              textStyle: {
                bold: options.bold,
                fontSize: options.fontSize ? { magnitude: options.fontSize, unit: 'PT' } : undefined,
              },
              fields: 'bold,fontSize',
            },
          },
        ],
      });
    },
  });
}
