import { useMutation } from '@tanstack/react-query';
import { createChatCompletion, type CreateChatCompletionData } from '@/sdk/api-clients/OpenAIGPTChat';
import type { CreateChatCompletionResponse } from '@/sdk/api-clients/OpenAIGPTChat';

/**
 * Message role types for chat completion
 */
export type ChatMessageRole = 'system' | 'user' | 'assistant';

/**
 * Individual chat message
 */
export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

/**
 * Request options for chat completion
 */
export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
}

/**
 * Response from chat completion
 */
export interface ChatCompletionResult {
  id: string;
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  rawResponse: CreateChatCompletionResponse;
}

/**
 * Hook for creating chat completions using OpenAI GPT Chat API
 *
 * This hook provides a simple interface to the chat completion endpoint,
 * handling authentication and request formatting automatically.
 *
 * @example
 * const { mutate: sendMessage, isPending, data } = useGPTChat();
 *
 * const handleSend = () => {
 *   sendMessage({
 *     messages: [
 *       { role: 'user', content: 'Hello!' }
 *     ]
 *   }, {
 *     onSuccess: (result) => {
 *       console.log('Response:', result.content);
 *     }
 *   });
 * };
 */
export function useGPTChat() {
  return useMutation({
    mutationFn: async (request: ChatCompletionRequest): Promise<ChatCompletionResult> => {
      const { messages, model = 'MaaS_4.1' } = request;

      // Prepare the request data according to the SDK types
      const apiId = import.meta.env.VITE_AI_API_ID || '';
      const apiPath = import.meta.env.VITE_AI_API_PATH || '';
      const apiName = import.meta.env.VITE_AI_API_NAME || 'OpenAIGPTChat';

      if (!apiId || !apiPath) {
        throw new Error('AI API not configured. Set VITE_AI_API_ID and VITE_AI_API_PATH in .env.local');
      }

      const requestData: CreateChatCompletionData = {
        body: {
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        },
        headers: {
          'X-CREAO-API-NAME': apiName,
          'X-CREAO-API-PATH': apiPath,
          'X-CREAO-API-ID': apiId,
        },
        url: apiPath,
      };

      // Call the SDK function
      const response = await createChatCompletion(requestData);

      // Handle errors
      if (response.error) {
        throw new Error(
          typeof response.error === 'object' && response.error !== null
            ? JSON.stringify(response.error)
            : 'Chat completion request failed'
        );
      }

      if (!response.data) {
        throw new Error('No data received from chat completion');
      }

      // Extract the response content
      const firstChoice = response.data.choices[0];
      if (!firstChoice) {
        throw new Error('No choices in response');
      }

      return {
        id: response.data.id,
        content: firstChoice.message.content,
        finishReason: firstChoice.finish_reason,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
        rawResponse: response.data,
      };
    },
  });
}

/**
 * Hook for creating chat completions with conversation history management
 *
 * This hook maintains a conversation history and provides methods to
 * add messages and send them to the API.
 *
 * @example
 * const { messages, sendMessage, isPending, reset } = useGPTChatConversation();
 *
 * // Add a user message and get a response
 * const handleUserMessage = async (userInput: string) => {
 *   const result = await sendMessage(userInput);
 *   console.log('Assistant response:', result.content);
 * };
 */
export function useGPTChatConversation(initialMessages: ChatMessage[] = []) {
  const { mutateAsync, isPending, isError, error } = useGPTChat();
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);

  const sendMessage = async (userMessage: string): Promise<ChatCompletionResult> => {
    // Add user message to history
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];

    setMessages(newMessages);

    // Send to API
    const result = await mutateAsync({ messages: newMessages });

    // Add assistant response to history
    setMessages([
      ...newMessages,
      { role: 'assistant', content: result.content },
    ]);

    return result;
  };

  const reset = () => {
    setMessages(initialMessages);
  };

  const addSystemMessage = (content: string) => {
    setMessages([...messages, { role: 'system', content }]);
  };

  return {
    messages,
    sendMessage,
    isPending,
    isError,
    error,
    reset,
    addSystemMessage,
  };
}

// Re-export React for the conversation hook
import React from 'react';
