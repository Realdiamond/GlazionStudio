import React, { forwardRef } from 'react';
import { PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// TypeScript interface for header component props
interface HeaderProps {
  onToggleSidebar: () => void; // Callback to toggle sidebar visibility
  isDesktop?: boolean;
}

/**
 * Header Component - Top navigation bar for GlazionStudio
 * 
 * Features:
 * - Responsive design using CSS custom properties
 * - Sidebar toggle functionality
 * - Clean, professional styling
 * - No flash positioning with CSS variables
 */
const Header = forwardRef<HTMLElement, HeaderProps>(({ onToggleSidebar, isDesktop = false }, ref) => {
  return (
    <header
      ref={ref}
      className="fixed top-0 z-30 h-14 border-b border-border/40
                bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
                transition-all duration-300"
      style={{
        // Use CSS custom properties set by AppShell
        left: 'calc(var(--is-desktop, 0) * var(--sidebar-offset, 0px))',
        right: 0
      }}
    >
      <div className="w-full flex h-14 items-center justify-between pl-0 pr-5">
        {/* Left section with sidebar toggle - only show on mobile */}
        <div className="flex items-center gap-4">
          {!isDesktop && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="text-foreground hover:bg-accent"
              aria-label="Toggle sidebar"
            >
              <PanelRight strokeWidth={1} style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }} />
            </Button>
          )}
        </div>

        {/* Center section - App title */}
        <div className="flex items-center flex-1 justify-center md:justify-start md:pl-10">
          <h1 className="text-xl font-bold font-heading text-foreground">
            GlazionStudio
          </h1>
        </div>

        {/* Right section - empty for future features */}
        <div className="flex items-center gap-2">
          {/* Space for future features */}
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;