import React, { useState } from 'react';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

interface NotesToggleProps {
  className?: string;
}

interface Note {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: Date;
}

// Mock notes data - in production this would come from an API
const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Glazing Techniques',
    excerpt: 'Basic glazing techniques for beginners and intermediate potters...',
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: 'Firing Schedule',
    excerpt: 'Cone 10 firing schedule with detailed temperature ramps...',
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '3',
    title: 'Clay Body Recipes',
    excerpt: 'Various clay body formulations for different pottery styles...',
    updatedAt: new Date('2024-01-08'),
  },
];

export const NotesToggle: React.FC<NotesToggleProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Notes Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className={`border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 ${className}`}
      >
        <FileText className="w-4 h-4" />
        {/* Show text on tablet, hide on mobile */}
        <span className="ml-2 hidden sm:inline md:inline">Notes</span>
      </Button>

      {/* Mobile/Tablet Notes Panel Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
          <div className="fixed inset-y-0 right-0 w-full bg-background border-l border-border shadow-elevated">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Notes</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="text-foreground hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Notes List */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {mockNotes.map((note) => (
                  <Card
                    key={note.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-moderate hover:bg-accent/20"
                    onClick={() => {
                      // Navigate to notes page with selected note
                      window.location.href = '/notes';
                    }}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-medium text-foreground text-sm mb-2 line-clamp-1">
                        {note.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {note.excerpt}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {note.updatedAt.toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Create New Note Button */}
                <Link to="/notes">
                  <Card className="cursor-pointer transition-all duration-200 hover:shadow-moderate border-dashed border-2 border-primary/30 hover:border-primary/50">
                    <CardContent className="p-4 flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
                        <p className="text-sm font-medium text-primary">Create New Note</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};