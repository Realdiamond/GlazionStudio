import { useState, useCallback, useRef, useEffect } from 'react';
import { sendMessage, rateLimiter } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import type { Message, ChatSession, AppError } from '@/types/chat';

/**
 * Custom hook for managing chat functionality in GlazionStudio
 * 
 * Features:
 * - Message state management
 * - API communication with new combined endpoint
 * - Error handling
 * - Loading states
 * - Rate limiting
 * - Session management
 * - Security validation
 * 
 * Security considerations:
 * - Input sanitization
 * - Rate limiting enforcement
 * - Error message sanitization
 * - Memory cleanup
 */

export interface UseChatOptions {
  sessionId?: string; // Optional session ID for persistence
  maxMessages?: number; // Maximum messages to keep in memory
  autoSave?: boolean; // Whether to auto-save sessions
}

export interface UseChatReturn {
  // State
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  currentSession: ChatSession | null;
  
  // Actions
  sendUserMessage: (content: string, image?: File) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  
  // Session management
  startNewSession: () => void;
  loadSession: (sessionId: string) => Promise<void>;
  saveCurrentSession: () => Promise<void>;
  
  // Utilities
  canSendMessage: boolean;
  messageCount: number;
  rateLimitTimeRemaining: number;
}

/**
 * Main chat hook implementation
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    sessionId,
    maxMessages = 100,
    autoSave = true
  } = options;

  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [rateLimitTimeRemaining, setRateLimitTimeRemaining] = useState<number>(0);

  // Refs for cleanup and persistence
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageRef = useRef<{ content: string; image?: File } | null>(null);

  // Toast for user notifications
  const { toast } = useToast();

  /**
   * Generates unique message ID
   */
  const generateMessageId = useCallback((): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Generates unique session ID
   */
  const generateSessionId = useCallback((): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Creates a new message object
   */
  const createMessage = useCallback((
    type: 'user' | 'ai',
    content: string,
    image?: string,
    error?: boolean
  ): Message => {
    return {
      id: generateMessageId(),
      type,
      content,
      timestamp: new Date(),
      image,
      error: error || false,
    };
  }, [generateMessageId]);

  /**
   * Adds a message to the chat
   */
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      
      // Limit messages to prevent memory issues
      if (newMessages.length > maxMessages) {
        return newMessages.slice(-maxMessages);
      }
      
      return newMessages;
    });
  }, [maxMessages]);

  /**
   * Updates the last message (useful for streaming responses)
   */
  const updateLastMessage = useCallback((content: string) => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      
      const lastMessage = prev[prev.length - 1];
      if (lastMessage.type !== 'ai') return prev;
      
      return [
        ...prev.slice(0, -1),
        { ...lastMessage, content }
      ];
    });
  }, []);

  /**
   * Handles API errors with user-friendly messages
   */
  const handleError = useCallback((error: unknown): void => {
    let errorMessage = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Sanitize error message to prevent XSS
    const sanitizedError = errorMessage.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    setError(sanitizedError);
    
    // Add error message to chat
    const errorMessage_ = createMessage('ai', `Sorry, I encountered an error: ${sanitizedError}`, undefined, true);
    addMessage(errorMessage_);

    // Show toast notification
    toast({
      title: "Error",
      description: sanitizedError,
      variant: "destructive",
    });

    console.error('Chat error:', error);
  }, [createMessage, addMessage, toast]);

  /**
   * Checks rate limiting before sending messages
   */
  const checkRateLimit = useCallback((): boolean => {
    if (!rateLimiter.canMakeRequest()) {
      const timeRemaining = rateLimiter.getTimeUntilReset();
      setRateLimitTimeRemaining(timeRemaining);
      
      toast({
        title: "Rate limit exceeded",
        description: `Please wait ${Math.ceil(timeRemaining / 1000)} seconds before sending another message.`,
        variant: "destructive",
      });
      
      return false;
    }
    
    return true;
  }, [toast]);

  /**
   * Main function to send user messages
   * Now works with the new combined endpoint (KB + GPT Direct + Merge)
   */
  const sendUserMessage = useCallback(async (
    content: string,
    image?: File
  ): Promise<void> => {
    // Validate input
    if (!content.trim() && !image) {
      toast({
        title: "Empty message",
        description: "Please enter a message or select an image.",
        variant: "destructive",
      });
      return;
    }

    // Check rate limiting
    if (!checkRateLimit()) {
      return;
    }

    // Clear any previous errors
    setError(null);
    setIsLoading(true);

    // Store message for retry functionality
    lastMessageRef.current = { content, image };

    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Add user message to chat
      let imageUrl: string | undefined;
      if (image) {
        imageUrl = URL.createObjectURL(image);
      }
      
      const userMessage = createMessage('user', content.trim(), imageUrl);
      addMessage(userMessage);

      // Send to API - now returns combined response from 3 endpoints
      const startTime = Date.now();
      const aiResponse = await sendMessage(content, image);
      const processingTime = Date.now() - startTime;

      // Add AI response to chat
      // Note: sendMessage() already returns the merged answer string
      // All metadata (KB matches, tokens, etc.) is logged server-side only
      const aiMessage = createMessage('ai', aiResponse);
      aiMessage.metadata = {
        processingTime,
        // We could add more metadata here if needed, but keeping it simple
        // The complex metadata (KB matches, token usage) stays server-side
      };
      addMessage(aiMessage);

      // Auto-save if enabled
      if (autoSave && currentSession) {
        await saveCurrentSession();
      }

    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    checkRateLimit,
    createMessage,
    addMessage,
    handleError,
    autoSave,
    currentSession,
    toast
  ]);

  /**
   * Retry the last failed message
   */
  const retryLastMessage = useCallback(async (): Promise<void> => {
    if (!lastMessageRef.current) {
      toast({
        title: "No message to retry",
        description: "There's no previous message to retry.",
        variant: "destructive",
      });
      return;
    }

    const { content, image } = lastMessageRef.current;
    await sendUserMessage(content, image);
  }, [sendUserMessage, toast]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback((): void => {
    setMessages([]);
    setError(null);
    lastMessageRef.current = null;
  }, []);

  /**
   * Delete a specific message
   */
  const deleteMessage = useCallback((messageId: string): void => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    
    toast({
      title: "Message deleted",
      description: "Message has been removed from chat.",
    });
  }, [toast]);

  /**
   * Edit a message and resend to get new AI response
   */
  const editMessage = useCallback(async (messageId: string, newContent: string): Promise<void> => {
    if (!newContent.trim()) {
      toast({
        title: "Empty message",
        description: "Please enter a message.",
        variant: "destructive",
      });
      return;
    }

    // Find the message index
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    const messageToEdit = messages[messageIndex];
    if (messageToEdit.type !== 'user') return; // Only allow editing user messages

    // Remove the edited message and all messages after it (including AI responses)
    const messagesBeforeEdit = messages.slice(0, messageIndex);
    setMessages(messagesBeforeEdit);

    // Send the edited message as a new message
    await sendUserMessage(newContent.trim(), undefined);
    
    toast({
      title: "Message edited",
      description: "Your message has been updated and resent.",
    });
  }, [messages, sendUserMessage, toast]);

  /**
   * Start a new chat session
   */
  const startNewSession = useCallback((): void => {
    const newSession: ChatSession = {
      id: generateSessionId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        messageCount: 0,
        totalTokens: 0,
        lastActivity: new Date(),
      }
    };

    setCurrentSession(newSession);
    clearMessages();
  }, [generateSessionId, clearMessages]);

  /**
   * Load an existing session
   */
  const loadSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      // In production, this would load from a database or storage service
      // For now, we'll simulate loading from localStorage
      const savedSession = localStorage.getItem(`chat_session_${sessionId}`);
      
      if (savedSession) {
        const session: ChatSession = JSON.parse(savedSession);
        setCurrentSession(session);
        setMessages(session.messages);
        
        toast({
          title: "Session loaded",
          description: `Loaded chat session: ${session.title}`,
        });
      } else {
        throw new Error('Session not found');
      }
    } catch (error) {
      handleError(error);
    }
  }, [handleError, toast]);

  /**
   * Save current session
   */
  const saveCurrentSession = useCallback(async (): Promise<void> => {
    if (!currentSession) return;

    try {
      const updatedSession: ChatSession = {
        ...currentSession,
        messages,
        updatedAt: new Date(),
        metadata: {
          ...currentSession.metadata,
          messageCount: messages.length,
          lastActivity: new Date(),
        }
      };

      // In production, this would save to a database or storage service
      localStorage.setItem(
        `chat_session_${currentSession.id}`,
        JSON.stringify(updatedSession)
      );

      setCurrentSession(updatedSession);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, [currentSession, messages]);

  /**
   * Cleanup function for component unmount
   */
  useEffect(() => {
    return () => {
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clean up object URLs to prevent memory leaks
      messages.forEach(message => {
        if (message.image && message.image.startsWith('blob:')) {
          URL.revokeObjectURL(message.image);
        }
      });
    };
  }, [messages]);

  /**
   * Initialize session if sessionId is provided
   */
  useEffect(() => {
    if (sessionId && !currentSession) {
      loadSession(sessionId).catch(() => {
        // If loading fails, start a new session
        startNewSession();
      });
    } else if (!currentSession) {
      startNewSession();
    }
  }, [sessionId, currentSession, loadSession, startNewSession]);

  /**
   * Update rate limit timer
   */
  useEffect(() => {
    if (rateLimitTimeRemaining > 0) {
      const interval = setInterval(() => {
        setRateLimitTimeRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [rateLimitTimeRemaining]);

  // Calculate derived state
  const canSendMessage = !isLoading && rateLimitTimeRemaining === 0;
  const messageCount = messages.length;

  return {
    // State
    messages,
    isLoading,
    error,
    currentSession,
    
    // Actions
    sendUserMessage,
    clearMessages,
    retryLastMessage,
    deleteMessage,
    editMessage,
    
    // Session management
    startNewSession,
    loadSession,
    saveCurrentSession,
    
    // Utilities
    canSendMessage,
    messageCount,
    rateLimitTimeRemaining,
  };
}