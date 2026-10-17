import { useMutation, useQuery } from '@tanstack/react-query';
import { platformApi } from '@/sdk/core/request';
import { getAuthToken } from '@/sdk/core/auth';

/**
 * Google Task with title, notes, and status
 */
export interface Task {
  title: string;
  notes?: string;
  due?: string;
  status?: 'needsAction' | 'completed';
}

/**
 * Response from tasks API
 */
export interface TaskResponse {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status?: string;
  selfLink?: string;
}

/**
 * List of tasks
 */
export interface TasksList {
  items?: TaskResponse[];
  nextPageToken?: string;
}

/**
 * Request to create a task
 */
export interface CreateTaskRequest extends Task {}

/**
 * Request to list tasks
 */
export interface ListTasksRequest {
  showCompleted?: boolean;
  maxResults?: number;
  dueMin?: string;
  dueMax?: string;
}

/**
 * Request to update task
 */
export interface UpdateTaskRequest extends Task {
  taskId: string;
}

/**
 * Hook to create a task
 *
 * @example
 * const { mutateAsync: createTask } = useCreateTask();
 * const response = await createTask({
 *   title: 'Pay Credit Card',
 *   notes: 'Credit card payment due on 2026-02-01',
 *   due: '2026-02-01'
 * });
 */
export function useCreateTask() {
  return useMutation({
    mutationFn: async (request: CreateTaskRequest): Promise<TaskResponse> => {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'X-CREAO-API-NAME': 'GoogleTasks',
        'X-CREAO-API-PATH': '/lists/@default/tasks',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.post(
        '/lists/@default/tasks',
        {
          title: request.title,
          notes: request.notes,
          due: request.due,
          status: request.status,
        },
        { headers }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create task' }));
        throw new Error(error.message || 'Failed to create task');
      }

      return response.json();
    },
  });
}

/**
 * Hook to list tasks
 *
 * @example
 * const { data: tasks, isLoading } = useListTasks({
 *   showCompleted: false,
 *   maxResults: 50
 * });
 */
export function useListTasks(request?: ListTasksRequest) {
  return useQuery({
    queryKey: ['tasks', request],
    queryFn: async (): Promise<TasksList> => {
      const token = getAuthToken();

      const params = new URLSearchParams();
      if (request?.showCompleted !== undefined) params.append('showCompleted', request.showCompleted.toString());
      if (request?.maxResults) params.append('maxResults', request.maxResults.toString());
      if (request?.dueMin) params.append('dueMin', request.dueMin);
      if (request?.dueMax) params.append('dueMax', request.dueMax);

      const url = `/lists/@default/tasks${params.toString() ? `?${params.toString()}` : ''}`;

      const headers: Record<string, string> = {
        'X-CREAO-API-NAME': 'GoogleTasks',
        'X-CREAO-API-PATH': '/lists/@default/tasks',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.get(url, { headers });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to list tasks' }));
        throw new Error(error.message || 'Failed to list tasks');
      }

      return response.json();
    },
    enabled: !!getAuthToken(),
  });
}

/**
 * Hook to update a task
 *
 * @example
 * const { mutateAsync: updateTask } = useUpdateTask();
 * await updateTask({
 *   taskId: 'task123',
 *   title: 'Pay Credit Card',
 *   status: 'completed'
 * });
 */
export function useUpdateTask() {
  return useMutation({
    mutationFn: async (request: UpdateTaskRequest): Promise<TaskResponse> => {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'X-CREAO-API-NAME': 'GoogleTasks',
        'X-CREAO-API-PATH': '/lists/@default/tasks/{taskId}',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.put(
        `/lists/@default/tasks/${request.taskId}`,
        {
          title: request.title,
          notes: request.notes,
          due: request.due,
          status: request.status,
        },
        { headers }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update task' }));
        throw new Error(error.message || 'Failed to update task');
      }

      return response.json();
    },
  });
}

/**
 * Hook to delete a task
 *
 * @example
 * const { mutateAsync: deleteTask } = useDeleteTask();
 * await deleteTask({
 *   taskId: 'task123'
 * });
 */
export function useDeleteTask() {
  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'X-CREAO-API-NAME': 'GoogleTasks',
        'X-CREAO-API-PATH': '/lists/@default/tasks/{taskId}',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.delete(
        `/lists/@default/tasks/${taskId}`,
        { headers }
      );

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete task' }));
        throw new Error(error.message || 'Failed to delete task');
      }
    },
  });
}
