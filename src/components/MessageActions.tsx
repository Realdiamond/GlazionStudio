import React, { useState } from 'react';
import { Copy, Edit, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface MessageActionsProps {
  content: string;
  messageType: 'user' | 'ai';
  onEdit?: (newContent: string) => void;
  className?: string;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  content,
  messageType,
  onEdit,
  className = '',
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy message to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditValue(content);
  };

  const handleEditSave = () => {
    if (onEdit && editValue.trim()) {
      onEdit(editValue.trim());
      setIsEditing(false);
      toast({
        title: "Message updated",
        description: "Your message has been edited and resent.",
      });
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditValue(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 ${className}`}>
        <div className="bg-background border border-border rounded-lg shadow-elevated max-w-2xl w-full">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold">Edit Message</h3>
          </div>
          <div className="p-4">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-[400px] p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Edit your message..."
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleEditSave}
                size="sm"
                className="gradient-primary text-primary-foreground hover:opacity-90"
              >
                <Check className="h-3 w-3 mr-1" />
                Send
              </Button>
              <Button
                onClick={handleEditCancel}
                variant="outline"
                size="sm"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy message</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {messageType === 'user' && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditClick}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <Edit className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit message</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};