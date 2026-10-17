// Use these request functions from "./sdk.gen.ts" or "./index.ts":
//
//   /**
//    * Create a chat completion
//    */
//   export function createChatCompletion(opts: CreateChatCompletionData): Promise<{
//     error?: CreateChatCompletionErrors[keyof CreateChatCompletionErrors],
//     data?: CreateChatCompletionResponses[keyof CreateChatCompletionResponses],
//     request: Request,
//     response: Response }>;
//
//
// NOTICE: Please use default values from original openapi schema:
//
//    {
//      "openapi": "3.0.3",
//      "info": {
//        "title": "GenAI Chat Completion API",
//        "version": "1.0.0",
//        "description": "Creates a chat completion."
//      },
//      "servers": [
//        {
//          "url": "https://api-production.creao.ai/execute-apis/v2"  // Override with VITE_AI_API_BASE_URL
//        }
//      ],
//      "paths": {
//        "/v1/ai/zWwyutGgvEGWwzSa/chat/completions": {
//          "post": {
//            "summary": "Create a chat completion",
//            "operationId": "createChatCompletion",
//            "requestBody": {
//              "required": true,
//              "content": {
//                "application/json": {
//                  "schema": {
//                    "type": "object",
//                    "required": [
//                      "model",
//                      "messages"
//                    ],
//                    "properties": {
//                      "model": {
//                        "type": "string",
//                        "description": "Model name",
//                        "example": "MaaS_4.1",
//                        "default": "MaaS_4.1"
//                      },
//                      "messages": {
//                        "type": "array",
//                        "description": "Conversation history",
//                        "minItems": 1,
//                        "items": {
//                          "type": "object",
//                          "required": [
//                            "role",
//                            "content"
//                          ],
//                          "properties": {
//                            "role": {
//                              "type": "string",
//                              "enum": [
//                                "system",
//                                "user",
//                                "assistant"
//                              ]
//                            },
//                            "content": {
//                              "type": "string"
//                            }
//                          }
//                        }
//                      }
//                    }
//                  },
//                  "examples": {
//                    "default": {
//                      "summary": "Basic user prompt",
//                      "value": {
//                        "model": "MaaS_4.1",
//                        "messages": [
//                          {
//                            "role": "user",
//                            "content": "hello"
//                          }
//                        ]
//                      }
//                    }
//                  }
//                }
//              }
//            },
//            "security": [
//              {
//                "BearerAuth": []
//              }
//            ],
//            "responses": {
//              "200": {
//                "description": "Successful completion",
//                "content": {
//                  "application/json": {
//                    "schema": {
//                      "type": "object",
//                      "required": [
//                        "id",
//                        "object",
//                        "created",
//                        "model",
//                        "choices",
//                        "usage"
//                      ],
//                      "properties": {
//                        "id": {
//                          "type": "string",
//                          "description": "A unique identifier for the chat completion",
//                          "example": "chatcmpl-C2LQSxGT9C96M4LioHa2cPU9RZkic"
//                        },
//                        "object": {
//                          "type": "string",
//                          "description": "The object type, which is always 'chat.completion'",
//                          "enum": [
//                            "chat.completion"
//                          ],
//                          "example": "chat.completion"
//                        },
//                        "created": {
//                          "type": "integer",
//                          "format": "int64",
//                          "description": "The Unix timestamp (in seconds) of when the chat completion was created",
//                          "example": 1754675052
//                        },
//                        "model": {
//                          "type": "string",
//                          "description": "The model used for the chat completion",
//                          "example": "MaaS_4.1"
//                        },
//                        "system_fingerprint": {
//                          "type": "string",
//                          "nullable": true,
//                          "description": "This fingerprint represents the backend configuration that the model runs with"
//                        },
//                        "choices": {
//                          "type": "array",
//                          "description": "A list of chat completion choices. Can be more than one if n is greater than 1",
//                          "items": {
//                            "type": "object",
//                            "required": [
//                              "index",
//                              "message",
//                              "finish_reason"
//                            ],
//                            "properties": {
//                              "index": {
//                                "type": "integer",
//                                "description": "The index of the choice in the list of choices",
//                                "example": 0
//                              },
//                              "logprobs": {
//                                "type": "object",
//                                "nullable": true,
//                                "description": "Log probability information for the choice"
//                              },
//                              "message": {
//                                "type": "object",
//                                "required": [
//                                  "role",
//                                  "content"
//                                ],
//                                "properties": {
//                                  "role": {
//                                    "type": "string",
//                                    "enum": [
//                                      "assistant"
//                                    ],
//                                    "description": "The role of the author of this message"
//                                  },
//                                  "content": {
//                                    "type": "string",
//                                    "description": "The contents of the message",
//                                    "example": "Hello! How can I help you today?"
//                                  },
//                                  "reasoning_content": {
//                                    "type": "string",
//                                    "nullable": true,
//                                    "description": "The reasoning content of the message, if any"
//                                  },
//                                  "function_call": {
//                                    "type": "object",
//                                    "nullable": true,
//                                    "description": "The function call generated by the model, if any"
//                                  },
//                                  "tool_calls": {
//                                    "type": "array",
//                                    "nullable": true,
//                                    "description": "The tool calls generated by the model, if any",
//                                    "items": {
//                                      "type": "object"
//                                    }
//                                  },
//                                  "reasoning_details": {
//                                    "type": "object",
//                                    "nullable": true,
//                                    "description": "Additional reasoning details, if any"
//                                  }
//                                }
//                              },
//                              "finish_reason": {
//                                "type": "string",
//                                "description": "The reason the model stopped generating tokens",
//                                "enum": [
//                                  "stop",
//                                  "length",
//                                  "function_call",
//                                  "content_filter",
//                                  "null"
//                                ],
//                                "example": "stop"
//                              },
//                              "native_finish_reason": {
//                                "type": "string",
//                                "nullable": true,
//                                "description": "The native finish reason from the underlying model"
//                              }
//                            }
//                          }
//                        },
//                        "usage": {
//                          "type": "object",
//                          "description": "Usage statistics for the completion request",
//                          "required": [
//                            "prompt_tokens",
//                            "completion_tokens",
//                            "total_tokens"
//                          ],
//                          "properties": {
//                            "prompt_tokens": {
//                              "type": "integer",
//                              "description": "Number of tokens in the prompt",
//                              "example": 8
//                            },
//                            "completion_tokens": {
//                              "type": "integer",
//                              "description": "Number of tokens in the generated completion",
//                              "example": 10
//                            },
//                            "total_tokens": {
//                              "type": "integer",
//                              "description": "Total number of tokens used in the request (prompt + completion)",
//                              "example": 18
//                            },
//                            "completion_tokens_details": {
//                              "type": "object",
//                              "description": "Breakdown of completion tokens usage",
//                              "properties": {
//                                "reasoning_tokens": {
//                                  "type": "integer",
//                                  "description": "Number of tokens used for reasoning",
//                                  "example": 0
//                                }
//                              },
//                              "required": [
//                                "reasoning_tokens"
//                              ]
//                            },
//                            "prompt_tokens_details": {
//                              "type": "object",
//                              "nullable": true,
//                              "description": "Breakdown of prompt tokens usage"
//                            }
//                          }
//                        }
//                      }
//                    },
//                    "examples": {
//                      "successful_completion": {
//                        "summary": "Successful chat completion response",
//                        "value": {
//                          "id": "chatcmpl-C2LQSxGT9C96M4LioHa2cPU9RZkic",
//                          "choices": [
//                            {
//                              "index": 0,
//                              "logprobs": null,
//                              "message": {
//                                "role": "assistant",
//                                "content": "Hello! How can I help you today?",
//                                "reasoning_content": null,
//                                "function_call": null,
//                                "tool_calls": null,
//                                "reasoning_details": null
//                              },
//                              "finish_reason": "stop",
//                              "native_finish_reason": null
//                            }
//                          ],
//                          "created": 1754675052,
//                          "model": "MaaS_4.1",
//                          "object": "chat.completion",
//                          "system_fingerprint": null,
//                          "usage": {
//                            "prompt_tokens": 8,
//                            "completion_tokens": 10,
//                            "total_tokens": 18,
//                            "completion_tokens_details": {
//                              "reasoning_tokens": 0
//                            },
//                            "prompt_tokens_details": null
//                          }
//                        }
//                      }
//                    }
//                  }
//                }
//              },
//              "401": {
//                "description": "Invalid or missing API key"
//              },
//              "4XX": {
//                "description": "Client error"
//              },
//              "5XX": {
//                "description": "Server error"
//              }
//            },
//            "parameters": [
//              {
//                "$ref": "#/components/parameters/CreaoApiNameHeader"
//              },
//              {
//                "$ref": "#/components/parameters/CreaoApiPathHeader"
//              },
//              {
//                "$ref": "#/components/parameters/CreaoApiIdHeader"
//              }
//            ]
//          }
//        }
//      },
//      "components": {
//        "securitySchemes": {
//          "BearerAuth": {
//            "type": "http",
//            "scheme": "bearer",
//            "bearerFormat": "JWT",
//            "x-bearer-token": "BXuSPHRhErkTPwFTiLff"
//          }
//        },
//        "parameters": {
//          "CreaoApiNameHeader": {
//            "name": "X-CREAO-API-NAME",
//            "in": "header",
//            "required": true,
//            "schema": {
//              "type": "string",
//              "default": "OpenAIGPTChat"
//            },
//            "description": "API name identifier - must be \"OpenAIGPTChat\""
//          },
//          "CreaoApiIdHeader": {
//            "name": "X-CREAO-API-ID",
//            "in": "header",
//            "required": true,
//            "schema": {
//              "type": "string",
//              "default": "your-api-id-here"
//            },
//            "description": "API ID identifier - must be \"your-api-id-here\""
//          },
//          "CreaoApiPathHeader": {
//            "name": "X-CREAO-API-PATH",
//            "in": "header",
//            "required": true,
//            "schema": {
//              "type": "string",
//              "default": "/v1/ai/zWwyutGgvEGWwzSa/chat/completions"
//            },
//            "description": "API path identifier - must be \"/v1/ai/zWwyutGgvEGWwzSa/chat/completions\""
//          }
//        }
//      }
//    }
//
// 

export type ClientOptions = {
    baseUrl: string;
};

/**
 * API name identifier - must be "OpenAIGPTChat"
 */
export type CreaoApiNameHeader = string;

/**
 * API ID identifier - must be "your-api-id-here"
 */
export type CreaoApiIdHeader = string;

/**
 * API path identifier - must be "/v1/ai/zWwyutGgvEGWwzSa/chat/completions"
 */
export type CreaoApiPathHeader = string;

export type CreateChatCompletionData = {
    body: {
        /**
         * Model name
         */
        model: string;
        /**
         * Conversation history
         */
        messages: Array<{
            role: 'system' | 'user' | 'assistant';
            content: string;
        }>;
    };
    headers: {
        /**
         * API name identifier - must be "OpenAIGPTChat"
         */
        'X-CREAO-API-NAME': string;
        /**
         * API path identifier - must be "/v1/ai/zWwyutGgvEGWwzSa/chat/completions"
         */
        'X-CREAO-API-PATH': string;
        /**
         * API ID identifier - must be "your-api-id-here"
         */
        'X-CREAO-API-ID': string;
    };
    path?: never;
    query?: never;
    url: '/v1/ai/zWwyutGgvEGWwzSa/chat/completions';
};

export type CreateChatCompletionErrors = {
    /**
     * Invalid or missing API key
     */
    401: unknown;
    /**
     * Client error
     */
    '4XX': unknown;
    /**
     * Server error
     */
    '5XX': unknown;
};

export type CreateChatCompletionResponses = {
    /**
     * Successful completion
     */
    200: {
        /**
         * A unique identifier for the chat completion
         */
        id: string;
        /**
         * The object type, which is always 'chat.completion'
         */
        object: 'chat.completion';
        /**
         * The Unix timestamp (in seconds) of when the chat completion was created
         */
        created: number;
        /**
         * The model used for the chat completion
         */
        model: string;
        /**
         * This fingerprint represents the backend configuration that the model runs with
         */
        system_fingerprint?: string | null;
        /**
         * A list of chat completion choices. Can be more than one if n is greater than 1
         */
        choices: Array<{
            /**
             * The index of the choice in the list of choices
             */
            index: number;
            /**
             * Log probability information for the choice
             */
            logprobs?: {
                [key: string]: unknown;
            } | null;
            message: {
                /**
                 * The role of the author of this message
                 */
                role: 'assistant';
                /**
                 * The contents of the message
                 */
                content: string;
                /**
                 * The reasoning content of the message, if any
                 */
                reasoning_content?: string | null;
                /**
                 * The function call generated by the model, if any
                 */
                function_call?: {
                    [key: string]: unknown;
                } | null;
                /**
                 * The tool calls generated by the model, if any
                 */
                tool_calls?: Array<{
                    [key: string]: unknown;
                }> | null;
                /**
                 * Additional reasoning details, if any
                 */
                reasoning_details?: {
                    [key: string]: unknown;
                } | null;
            };
            /**
             * The reason the model stopped generating tokens
             */
            finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | 'null';
            /**
             * The native finish reason from the underlying model
             */
            native_finish_reason?: string | null;
        }>;
        /**
         * Usage statistics for the completion request
         */
        usage: {
            /**
             * Number of tokens in the prompt
             */
            prompt_tokens: number;
            /**
             * Number of tokens in the generated completion
             */
            completion_tokens: number;
            /**
             * Total number of tokens used in the request (prompt + completion)
             */
            total_tokens: number;
            /**
             * Breakdown of completion tokens usage
             */
            completion_tokens_details?: {
                /**
                 * Number of tokens used for reasoning
                 */
                reasoning_tokens: number;
            };
            /**
             * Breakdown of prompt tokens usage
             */
            prompt_tokens_details?: {
                [key: string]: unknown;
            } | null;
        };
    };
};

export type CreateChatCompletionResponse = CreateChatCompletionResponses[keyof CreateChatCompletionResponses];
