import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ 
  isOpen, 
  onClose, 
  onNewChat 
}) => {
  const { toast } = useToast();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreateNewChat = () => {
    onNewChat();
    onClose();
    toast({
      title: "New chat started",
      description: "You can now start a fresh conversation.",
    });
  };

  const chatTemplates = [
    {
      title: "General Pottery Help",
      description: "Ask questions about pottery techniques, tools, and processes",
      icon: MessageSquare,
    },
    {
      title: "Glaze Recipes",
      description: "Get help with glaze formulations and combinations",
      icon: MessageSquare,
    },
    {
      title: "Firing Techniques",
      description: "Learn about kiln firing, temperatures, and schedules",
      icon: MessageSquare,
    },
    {
      title: "Troubleshooting",
      description: "Solve problems with cracking, warping, and other issues",
      icon: MessageSquare,
    },
  ];

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[99998]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal container - Increased height with proper text wrapping */}
      <div 
        className="bg-background border border-border rounded-lg shadow-2xl w-full max-w-2xl mx-4 min-h-[600px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Plus className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Start New Chat</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - Increased spacing and text wrapping */}
        <div className="p-6 space-y-6">
          <p className="text-muted-foreground text-base leading-relaxed">
            Begin a fresh conversation with GlazionStudio. Your current chat will be saved automatically.
          </p>

          {/* Templates Grid - Larger with proper text wrapping */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {chatTemplates.map((template) => (
              <Button
                key={template.title}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-accent/50 transition-colors min-h-[80px]"
                onClick={handleCreateNewChat}
              >
                <div className="flex items-center gap-2 w-full">
                  <template.icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-medium text-left text-sm leading-tight">{template.title}</span>
                </div>
                <span className="text-xs text-muted-foreground text-left leading-relaxed whitespace-normal break-words">
                  {template.description}
                </span>
              </Button>
            ))}
          </div>

          {/* Main Action Button */}
          <div className="border-t pt-6">
            <Button
              onClick={handleCreateNewChat}
              className="w-full gradient-primary text-primary-foreground hover:opacity-90"
              size="lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start Fresh Conversation
            </Button>
          </div>

          {/* Info Notice */}
          <div className="p-4 bg-accent/20 rounded-lg">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Your current conversation will be automatically saved to your chat history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Use createPortal to render modal outside the component tree
  return createPortal(modalContent, document.body);
};