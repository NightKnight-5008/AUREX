import { useMutation, useQuery } from '@tanstack/react-query';
import { platformApi } from '@/sdk/core/request';
import { getAuthToken } from '@/sdk/core/auth';

/**
 * Calendar event with start/end times and reminders
 */
export interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  colorId?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

/**
 * Response from calendar API
 */
export interface CalendarEventResponse {
  id: string;
  summary: string;
  description?: string;
  start: Record<string, unknown>;
  end: Record<string, unknown>;
  htmlLink?: string;
}

/**
 * List of calendar events
 */
export interface CalendarEventsList {
  items?: CalendarEventResponse[];
  nextPageToken?: string;
}

/**
 * Request to create a calendar event
 */
export interface CreateCalendarEventRequest extends CalendarEvent {
  calendarId?: string;
}

/**
 * Request to list calendar events
 */
export interface ListCalendarEventsRequest {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}

/**
 * Request to update calendar event
 */
export interface UpdateCalendarEventRequest extends CalendarEvent {
  calendarId?: string;
  eventId: string;
}

/**
 * Hook to create a calendar event
 *
 * @example
 * const { mutateAsync: createEvent } = useCreateCalendarEvent();
 * const response = await createEvent({
 *   summary: 'Payment Due',
 *   start: { dateTime: '2026-02-01T10:00:00', timeZone: 'Africa/Cairo' },
 *   end: { dateTime: '2026-02-01T11:00:00', timeZone: 'Africa/Cairo' }
 * });
 */
export function useCreateCalendarEvent() {
  return useMutation({
    mutationFn: async (request: CreateCalendarEventRequest): Promise<CalendarEventResponse> => {
      const calendarId = request.calendarId || 'primary';
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'X-CREAO-API-NAME': 'GoogleCalendar',
        'X-CREAO-API-PATH': '/calendars/{calendarId}/events',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.post(
        `/calendars/${calendarId}/events`,
        {
          summary: request.summary,
          description: request.description,
          start: request.start,
          end: request.end,
          reminders: request.reminders,
          colorId: request.colorId,
          extendedProperties: request.extendedProperties,
        },
        { headers }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create event' }));
        throw new Error(error.message || 'Failed to create event');
      }

      return response.json();
    },
  });
}

/**
 * Hook to list calendar events
 *
 * @example
 * const { data: events, isLoading } = useListCalendarEvents({
 *   calendarId: 'primary',
 *   timeMin: '2026-02-01T00:00:00Z'
 * });
 */
export function useListCalendarEvents(request?: ListCalendarEventsRequest) {
  return useQuery({
    queryKey: ['calendarEvents', request],
    queryFn: async (): Promise<CalendarEventsList> => {
      const calendarId = request?.calendarId || 'primary';
      const token = getAuthToken();

      const params = new URLSearchParams();
      if (request?.timeMin) params.append('timeMin', request.timeMin);
      if (request?.timeMax) params.append('timeMax', request.timeMax);
      if (request?.maxResults) params.append('maxResults', request.maxResults.toString());

      const url = `/calendars/${calendarId}/events${params.toString() ? `?${params.toString()}` : ''}`;

      const headers: Record<string, string> = {
        'X-CREAO-API-NAME': 'GoogleCalendar',
        'X-CREAO-API-PATH': '/calendars/{calendarId}/events',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.get(url, { headers });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to list events' }));
        throw new Error(error.message || 'Failed to list events');
      }

      return response.json();
    },
    enabled: !!getAuthToken(),
  });
}

/**
 * Hook to update a calendar event
 *
 * @example
 * const { mutateAsync: updateEvent } = useUpdateCalendarEvent();
 * await updateEvent({
 *   calendarId: 'primary',
 *   eventId: 'abc123',
 *   summary: 'Updated Payment Reminder',
 *   start: { dateTime: '2026-02-01T10:00:00', timeZone: 'Africa/Cairo' },
 *   end: { dateTime: '2026-02-01T11:00:00', timeZone: 'Africa/Cairo' }
 * });
 */
export function useUpdateCalendarEvent() {
  return useMutation({
    mutationFn: async (request: UpdateCalendarEventRequest): Promise<CalendarEventResponse> => {
      const calendarId = request.calendarId || 'primary';
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'X-CREAO-API-NAME': 'GoogleCalendar',
        'X-CREAO-API-PATH': '/calendars/{calendarId}/events/{eventId}',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.put(
        `/calendars/${calendarId}/events/${request.eventId}`,
        {
          summary: request.summary,
          description: request.description,
          start: request.start,
          end: request.end,
          reminders: request.reminders,
          colorId: request.colorId,
          extendedProperties: request.extendedProperties,
        },
        { headers }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update event' }));
        throw new Error(error.message || 'Failed to update event');
      }

      return response.json();
    },
  });
}

/**
 * Hook to delete a calendar event
 *
 * @example
 * const { mutateAsync: deleteEvent } = useDeleteCalendarEvent();
 * await deleteEvent({
 *   calendarId: 'primary',
 *   eventId: 'abc123'
 * });
 */
export function useDeleteCalendarEvent() {
  return useMutation({
    mutationFn: async (options: { calendarId?: string; eventId: string }): Promise<void> => {
      const calendarId = options.calendarId || 'primary';
      const token = getAuthToken();

      const headers: Record<string, string> = {
        'X-CREAO-API-NAME': 'GoogleCalendar',
        'X-CREAO-API-PATH': '/calendars/{calendarId}/events/{eventId}',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await platformApi.delete(
        `/calendars/${calendarId}/events/${options.eventId}`,
        { headers }
      );

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete event' }));
        throw new Error(error.message || 'Failed to delete event');
      }
    },
  });
}
