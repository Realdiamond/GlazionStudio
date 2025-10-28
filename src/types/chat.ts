/**
 * TypeScript type definitions for GlazionStudio chat system
 * 
 * This file centralizes all type definitions to ensure:
 * - Type safety across components
 * - Consistent data structures
 * - Better development experience with IntelliSense
 * - Easy maintenance and updates
 */

// Core message types for the chat system
export interface Message {
  id: string; // Unique identifier for each message
  type: 'user' | 'ai'; // Message sender type
  content: string; // Text content of the message
  timestamp: Date; // When the message was created
  image?: string; // Optional image URL for user messages
  imageFile?: File; // Optional image file for processing
  error?: boolean; // Flag for error messages
  metadata?: MessageMetadata; // Additional message information
}

// Additional metadata for messages
export interface MessageMetadata {
  tokens?: number; // Token count for AI responses
  model?: string; // AI model used for response
  processingTime?: number; // Time taken to generate response
  imageDescription?: string; // Description of uploaded image
  
  // NEW: Metadata from combined endpoint
  knowledgeBase?: {
    success: boolean;
    matches?: KnowledgeBaseMatch[];
    source?: string;
    error?: string;
  };
  gptDirect?: {
    success: boolean;
    model?: string;
    tokensUsed?: number;
    isRestricted?: boolean;
    error?: string;
  };
  merge?: {
    success: boolean;
    tokensUsed?: number;
    error?: string;
  };
  totalTokensUsed?: number;
}

// NEW: Knowledge Base match structure
export interface KnowledgeBaseMatch {
  id: string;
  score: number;
  content: string;
  metadata: Record<string, any>;
}

// Chat session management
export interface ChatSession {
  id: string; // Unique session identifier
  title: string; // Human-readable session title
  messages: Message[]; // Array of messages in this session
  createdAt: Date; // Session creation timestamp
  updatedAt: Date; // Last update timestamp
  metadata?: ChatSessionMetadata; // Additional session data
}

// Session metadata for analytics and management
export interface ChatSessionMetadata {
  messageCount: number; // Total messages in session
  totalTokens: number; // Total tokens used
  lastActivity: Date; // Last user interaction
  archived?: boolean; // Whether session is archived
  tags?: string[]; // Tags for categorization
}

// User interaction types
export interface UserInteraction {
  type: 'message' | 'image_upload' | 'session_start' | 'session_end';
  timestamp: Date;
  data?: Record<string, any>; // Flexible data for different interaction types
}

// API response types
export interface AIResponse {
  content: string; // Generated text response
  model: string; // Model used for generation
  tokens: number; // Tokens consumed
  processingTime: number; // Response generation time
  error?: string; // Error message if any
}

// NEW: Combined chat response from backend
export interface CombinedChatResponse {
  answer: string;
  content: string; // Backward compatibility
  confidence: number;
  metadata: {
    knowledgeBase?: {
      success: boolean;
      matches?: KnowledgeBaseMatch[];
      source?: string;
      error?: string;
    };
    gptDirect?: {
      success: boolean;
      model?: string;
      tokensUsed?: number;
      isRestricted?: boolean;
      error?: string;
    };
    merge?: {
      success: boolean;
      tokensUsed?: number;
      error?: string;
    };
    totalTokensUsed: number;
    processingTimeMs: number;
  };
}

// File upload types for security and validation
export interface UploadedFile {
  file: File; // The actual file object
  type: 'image' | 'document'; // File category
  validated: boolean; // Whether file passed validation
  preview?: string; // Preview URL for images
  error?: string; // Validation error message
}

// Image processing types
export interface ImageAnalysis {
  description: string; // AI-generated description
  dominantColors: string[]; // Color palette extracted
  dimensions: { width: number; height: number }; // Image dimensions
  fileSize: number; // File size in bytes
  confidence: number; // Analysis confidence score
}

// Application state types
export interface AppState {
  currentSession: ChatSession | null; // Active chat session
  sessions: ChatSession[]; // All user sessions
  isLoading: boolean; // Global loading state
  error: string | null; // Global error state
  user: UserProfile | null; // Current user data
}

// User profile types
export interface UserProfile {
  id: string; // Unique user identifier
  name: string; // User's display name
  email: string; // User's email address
  avatar?: string; // Profile picture URL
  preferences: UserPreferences; // User settings
  subscription: SubscriptionInfo; // Subscription details
}

// User preferences for customization
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'; // UI theme preference
  language: string; // Preferred language
  notifications: boolean; // Enable notifications
  autoSave: boolean; // Auto-save chat sessions
  defaultModel?: string; // Preferred AI model
}

// Subscription and billing types
export interface SubscriptionInfo {
  plan: 'free' | 'pro' | 'enterprise'; // Subscription tier
  status: 'active' | 'inactive' | 'cancelled' | 'expired'; // Current status
  expiresAt?: Date; // Subscription expiration
  features: string[]; // Available features
  usage: UsageStats; // Current usage statistics
}

// Usage tracking for billing and limits
export interface UsageStats {
  messagesThisMonth: number; // Messages sent this billing period
  tokensThisMonth: number; // Tokens used this billing period
  imagesThisMonth: number; // Images uploaded this billing period
  maxMessages: number; // Monthly message limit
  maxTokens: number; // Monthly token limit
  maxImages: number; // Monthly image limit
}

// Error handling types
export interface AppError {
  code: string; // Error code for identification
  message: string; // User-friendly error message
  details?: string; // Technical error details
  timestamp: Date; // When error occurred
  context?: Record<string, any>; // Additional error context
}

// API configuration types
export interface APIConfig {
  baseURL: string; // API base URL
  apiKey: string; // Authentication key
  timeout: number; // Request timeout in ms
  retryAttempts: number; // Number of retry attempts
  model: string; // Default AI model
}

// Component prop types for better type checking
export interface ComponentProps {
  className?: string; // Additional CSS classes
  children?: React.ReactNode; // Child components
  disabled?: boolean; // Disabled state
  loading?: boolean; // Loading state
}

// Event handler types for consistent typing
export type MessageHandler = (content: string, image?: File) => Promise<void>;
export type ErrorHandler = (error: AppError) => void;
export type SessionHandler = (sessionId: string) => void;
export type FileHandler = (file: File) => Promise<void>;

// Form validation types
export interface ValidationRule {
  required?: boolean; // Field is required
  minLength?: number; // Minimum length
  maxLength?: number; // Maximum length
  pattern?: RegExp; // Regex pattern
  custom?: (value: any) => boolean | string; // Custom validation function
}

export interface FormField {
  name: string; // Field name
  label: string; // Display label
  type: 'text' | 'email' | 'password' | 'file' | 'textarea'; // Input type
  value: any; // Current value
  error?: string; // Validation error
  rules?: ValidationRule[]; // Validation rules
}

// Security and authentication types
export interface AuthToken {
  access_token: string; // JWT access token
  refresh_token: string; // JWT refresh token
  expires_in: number; // Token expiration time
  token_type: string; // Token type (usually 'Bearer')
}

export interface SecurityConfig {
  csrfToken: string; // CSRF protection token
  sessionId: string; // Current session identifier
  rateLimit: RateLimitConfig; // Rate limiting configuration
}

export interface RateLimitConfig {
  maxRequests: number; // Maximum requests per window
  windowMs: number; // Time window in milliseconds
  resetTime?: Date; // When rate limit resets
}

// Analytics and monitoring types
export interface AnalyticsEvent {
  event: string; // Event name
  timestamp: Date; // When event occurred
  userId?: string; // User who triggered event
  sessionId?: string; // Session where event occurred
  properties?: Record<string, any>; // Event properties
}

export interface PerformanceMetrics {
  responseTime: number; // API response time
  renderTime: number; // Component render time
  memoryUsage: number; // Memory consumption
  errorRate: number; // Error percentage
}

// Export utility types for common patterns
export type PartialMessage = Partial<Message>;
export type RequiredMessage = Required<Message>;
export type OptionalMetadata<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Status enums for consistent state management
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

export enum MessageType {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system',
  ERROR = 'error'
}

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  UNKNOWN = 'unknown'
}

// NEW: Endpoint status types
export enum EndpointStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
  TIMEOUT = 'timeout'
}

// NEW: Response source indicator
export enum ResponseSource {
  KNOWLEDGE_BASE = 'knowledge_base',
  GPT_DIRECT = 'gpt_direct',
  MERGED = 'merged',
  FALLBACK = 'fallback'
}