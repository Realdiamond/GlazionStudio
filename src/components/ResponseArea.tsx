/**
 * ResponseArea Component - Updated version with AI branding and response animation
 *
 * Enhancements:
 * - GlazionStudio favicon with spinning effect during typing
 * - Shows "GlazionStudio" label beside favicon
 * - Typing animation for AI responses with markdown support
 * - Timestamp hidden for AI messages; only copy button shown
 * - User messages retain timestamp and hover-based actions
 * - Maintains scroll behavior and layout structure
 * - Communicates typing state to parent component
 */

import React from 'react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
// import { User } from 'lucide-react';
// import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageActions } from '@/components/MessageActions';
import { TypingMessage } from '@/components/TypingMessage';
import { getDateSeparatorText, shouldShowDateSeparator, formatMessageTime } from '@/utils/dateUtils';

// TypeScript interfaces for message structure
interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

// Props for the main chat response component
interface ResponseAreaProps {
  messages: Message[];
  isTyping: boolean;
  onSuggestionSelect?: (text: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onMessageTypingChange?: (isTyping: boolean) => void; // NEW: Callback for typing state
  bottomPadPx?: number;
  scrollParentRef?: React.RefObject<HTMLDivElement>;
}

// Suggestion Button Component
const SuggestionButton: React.FC<{ text: string; onSelect: (text: string) => void }> = ({ text, onSelect }) => (
  <button 
    className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-accent-foreground transition-colors text-sm"
    onClick={() => onSelect(text)}
  >
    {text}
  </button>
);

const ResponseArea: React.FC<ResponseAreaProps> = (props) => {
  const { messages, isTyping, onSuggestionSelect, onEditMessage, onMessageTypingChange, bottomPadPx = 96 } = props;
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const lastMessageRef = React.useRef<HTMLDivElement>(null);

  // 1) Initialize finishedMessages to include every message already in props
  const [finishedMessages, setFinishedMessages] = useState<Set<string>>(
    () => new Set(messages.map((m) => m.id))
  );

  // Track typing state for each message
  const [typingMessages, setTypingMessages] = useState<Set<string>>(new Set());

  // 2) Detect truly new messages and allow them to animate
  const prevCount = React.useRef(messages.length);
  React.useEffect(() => {
    if (messages.length > prevCount.current) {
      const newMsg = messages[messages.length - 1];
      if (newMsg.type === 'ai') {
        // Remove from finished so it will animate once
        setFinishedMessages((prev) => {
          const next = new Set(prev);
          next.delete(newMsg.id);
          return next;
        });
      }
    }
    prevCount.current = messages.length;
  }, [messages]);

  // Notify parent about overall typing state
  React.useEffect(() => {
    const isAnyMessageTyping = typingMessages.size > 0;
    onMessageTypingChange?.(isAnyMessageTyping);
  }, [typingMessages, onMessageTypingChange]);

  // Functions to manage typing state
  const handleTypingStart = (messageId: string) => {
    setTypingMessages(prev => new Set(prev).add(messageId));
  };

  const handleTypingComplete = (messageId: string) => {
    setTypingMessages(prev => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
    setFinishedMessages(prev => new Set(prev).add(messageId));
  };

  // pick the real scroll element
  const getScrollEl = () => props.scrollParentRef?.current ?? scrollContainerRef.current;

  React.useLayoutEffect(() => {
    const container = getScrollEl();
    if (container && lastMessageRef.current) {
      setTimeout(() => {
        if (!lastMessageRef.current) return;
        
        const target = lastMessageRef.current;
        const headerOffset = 108; // Header + tab bar height
        
        // Find the message bubble
        const messageBubble = target.querySelector('div[class*="inline-block"]') || target;
        const messageHeight = messageBubble.getBoundingClientRect().height;
        
        // Check if message is long (more than ~4 lines ≈ 100px)
        const isLongMessage = messageHeight > 100;
        
        if (isLongMessage) {
          // Long message: scroll to show only bottom 3-4 lines
          const visibleHeight = 100; // Show ~4 lines
          const scrollPosition = target.offsetTop + messageHeight - visibleHeight - headerOffset;
          container.scrollTo({ top: Math.max(0, scrollPosition), behavior: 'smooth' });
        } else {
          // Short message: scroll to show entire message under top bar  
          const scrollPosition = target.offsetTop - headerOffset - 20;
          container.scrollTo({ top: Math.max(0, scrollPosition), behavior: 'smooth' });
        }
      }, 200);
    }
  }, [messages.length]);

  // Basic formatter for trimming content
  const formatMessageContent = (content: string): string => content.trim();

  return (
    <div
      ref={scrollContainerRef}
      className="h-full pl-0 md:px-2"
      style={{
        paddingBottom: `calc(env(safe-area-inset-bottom) + ${bottomPadPx}px)`,
        scrollbarGutter: 'stable',
      }}
    >
      <div className="max-w-3xl mx-auto space-y-0 pb-10 pt-5">

        {/* Welcome screen shown only if no messages exist */}
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 rounded-2xl gradient-subtle flex items-center justify-center shadow-moderate">
                <img src="/favicon.ico" alt="GlazionStudio" className="w-full h-full object-cover" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 font-heading">Good to See You!</h2>
            <h3 className="text-xl text-foreground mb-4 font-heading">How Can I be an Assistance?</h3>
            <div className="mt-2 flex flex-wrap gap-3 justify-center">
              <SuggestionButton text="Any advice for me?" onSelect={(text) => onSuggestionSelect && onSuggestionSelect(text)} />
              <SuggestionButton text="Some glaze recipe ideas" onSelect={(text) => onSuggestionSelect && onSuggestionSelect(text)} />
              <SuggestionButton text="Kiln firing techniques" onSelect={(text) => onSuggestionSelect && onSuggestionSelect(text)} />
            </div>
          </div>
        )}

        {/* All chat messages rendered here */}
        {messages.map((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : undefined;
          const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
          const isLastMessage    = index === messages.length - 1;

          return (
            <div key={message.id} ref={isLastMessage ? lastMessageRef : null}>
              {/* Date separator */}
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <div className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-medium">
                    {getDateSeparatorText(message.timestamp)}
                  </div>
                </div>
              )}

              <div
                className={`group flex gap-4 ${
                  message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                } mb-0`}
              >
                <div
                  className={`flex-1 max-w-3xl ${
                    message.type === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {/* AI Header */}
                  {message.type === 'ai' && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-7 h-7 rounded-full overflow-hidden ${isTyping ? 'animate-spin' : ''}`}>
                        <img src="/favicon.ico" alt="GlazionStudio" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-sm font-semibold text-primary">GlazionStudio</span>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className="pl-4 md:pl-9">
                    <div
                      className={`inline-block rounded-2xl ${
                        message.type === 'user'
                          // user bubbles keep padding, gradient, and shadow
                          ? 'px-4 py-2 shadow-subtle gradient-primary text-primary-foreground'
                          // AI bubbles are transparent, no padding, no shadow, no border
                          : 'px-0 py-0 bg-transparent text-card-foreground'
                      }`}
                    >

                      {/* Text or typing animation - UPDATED FOR MARKDOWN */}
                      <div className="leading-relaxed text-sm">
                        {message.type === 'ai' ? (
                          message.content ? (
                            <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-ul:text-foreground">
                              <TypingMessage
                                content={message.content.trim()}
                                speed={1000}
                                delay={0}
                                onStart={() => handleTypingStart(message.id)}
                                onComplete={() => handleTypingComplete(message.id)}
                                useMarkdown={true}
                              />
                            </div>
                          ) : (
                            <div />
                          )
                        ) : (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {message.type === 'user' ? (
                      <div className="mt-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 justify-end">
                        <div className="text-xs text-muted-foreground">
                          {formatMessageTime(message.timestamp)}
                        </div>
                        <MessageActions
                          content={message.content}
                          messageType="user"
                          onEdit={(c) => onEditMessage?.(message.id, c)}
                        />
                      </div>
                    ) : (
                      finishedMessages.has(message.id) && (
                        <div className="mt-1 flex items-center gap-2 justify-start">
                          <MessageActions content={message.content} messageType="ai" />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}


        {/* Typing Indicator with spinner avatar */}
        {isTyping && (
          <div className="flex gap-4">
            <div className="flex-1 max-w-3xl">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full overflow-hidden animate-spin">
                  <img src="/favicon.ico" alt="GlazionStudio" className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-semibold text-primary">GlazionStudio</span>
              </div>

              <div className="pl-9">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Thinking</span>
                  <div className="flex gap-1 ml-2">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse delay-75"></div>
                    <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseArea;