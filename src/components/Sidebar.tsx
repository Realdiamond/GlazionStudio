import React, { useState } from 'react';
import { Plus, PanelLeft, PanelRight, MessageSquare, Image as ImgIcon, FlaskConical, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface EnhancedSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onFastClose?: () => void;
  onNewChat?: () => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  width?: number;
  collapsedWidth?: number;
}

const EnhancedSidebar: React.FC<EnhancedSidebarProps> = ({ 
  isOpen, 
  onClose, 
  onFastClose,
  onNewChat, 
  isCollapsed = false,
  onToggleCollapsed,
  width = 280,
  collapsedWidth = 64
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Add internal animation state to control content visibility
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(!isCollapsed);
  
  // For mobile: handle mount/unmount with animation
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isMobileAnimating, setIsMobileAnimating] = useState(false);
  const [transitionSpeed, setTransitionSpeed] = useState(400);
  
  // Detect if this is mobile or desktop usage
  const isMobileUsage = window.innerWidth < 768;

  // Handle desktop collapse/expand animation timing
  React.useEffect(() => {
    if (isMobileUsage) return; // Only for desktop
    
    if (isCollapsed) {
      // Closing: Start fade out immediately, content will fade during width collapse
      setShowContent(false);
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
      }, 150); // Match CSS transition duration
    } else {
      // Opening: Start width expansion, content will fade in during expansion
      setIsAnimating(true);
      setTimeout(() => {
        setShowContent(true); // Start fade in after small delay
        setTimeout(() => {
          setIsAnimating(false);
        }, 50);
      }, 30); // Start content fade very early in the opening animation
    }
  }, [isCollapsed, isMobileUsage]);

  // Handle mobile mounting/unmounting with proper timing for animations
  React.useEffect(() => {
    if (!isMobileUsage) return; // Only for mobile
    
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsMobileAnimating(true), 10);
    } else {
      setTimeout(() => {
        setIsMobileAnimating(false);
        setTimeout(() => setShouldRender(false), 400);
      }, 10);
    }
  }, [isOpen, isMobileUsage]);

  // For desktop, always render (no mount/unmount)
  if (isMobileUsage && !shouldRender) return null;

  const handleClose = (fast = false) => {
    if (isMobileUsage) {
      setTransitionSpeed(fast ? 200 : 400);
      setIsMobileAnimating(false);
      setTimeout(() => {
        setShouldRender(false);
        onClose();
      }, fast ? 200 : 400);
    } else {
      // For desktop, use collapse functionality
      onToggleCollapsed?.();
    }
  };

  // Listen for fast close events from outside clicks
  React.useEffect(() => {
    const handleFastClose = () => {
      handleClose(true);
    };
    
    if (onFastClose) {
      window.addEventListener('closeSidebarFast', handleFastClose);
      return () => window.removeEventListener('closeSidebarFast', handleFastClose);
    }
  }, [onFastClose]);

  const mainFeatures = [
    { name: 'Chat Assistant', path: '/', icon: MessageSquare },
    { name: 'Recipes → Image', path: '/recipes-to-image', icon: FlaskConical },
    { name: 'Image → Recipes', path: '/image-to-recipes', icon: ImgIcon },
    { name: 'UMF Calculator', path: '/umf-calculator', icon: Calculator },
  ];

  // Updated handleNewChat to trigger the modal properly
  const handleNewChat = () => {
    // Navigate to chat page if not already there
    if (location.pathname !== '/') {
      navigate('/');
    }
    
    // Dispatch event to open the new chat modal
    window.dispatchEvent(new CustomEvent('openNewChatModal'));
    
    // Close sidebar on mobile
    if (!isCollapsed && isMobileUsage) {
      onClose();
    }
  };

  const currentWidth = isCollapsed ? collapsedWidth : width;
  
  // Use showContent for desktop content visibility instead of isCollapsed directly
  const shouldShowContent = isMobileUsage ? true : showContent;

  return (
    <div 
      data-sidebar="true"
      className="fixed top-0 left-0 flex flex-col h-full bg-sidebar border-r border-sidebar-border z-[200] shadow-elevated"
      style={{ 
        width: currentWidth,
        transform: isMobileUsage 
          ? (isMobileAnimating ? 'translateX(0px)' : 'translateX(-100%)')
          : 'translateX(0px)',
        transition: `transform ${transitionSpeed}ms ease-in-out, width 150ms ease-in-out`,
        willChange: 'transform, width',
        backfaceVisibility: 'hidden'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-14 p-4 border-b border-sidebar-border">
        {shouldShowContent ? (
          <div 
            className="flex items-center justify-between w-full"
            style={{
              opacity: shouldShowContent ? 1 : 0,
              transition: 'opacity 150ms ease-in-out'
            }}
          >
            <h2 className="text-lg font-semibold text-sidebar-foreground font-heading">
              GlazionStudio
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleClose(false)}
                className="text-sidebar-foreground hover:bg-sidebar-accent p-2"
                aria-label="Collapse sidebar"
              >
                <PanelLeft strokeWidth={1} style={{ width: '27px', height: '27px', minWidth: '27px', minHeight: '27px' }} />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapsed}
            className="text-sidebar-foreground hover:bg-sidebar-accent mx-auto p-2"
            style={{ marginLeft: '-5px' }}
            aria-label="Expand sidebar"
          >
            <PanelRight strokeWidth={1} style={{ width: '27px', height: '27px', minWidth: '27px', minHeight: '27px' }} />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 py-2 flex flex-col overflow-hidden">
        {/* New Chat Button */}
        <div className="px-3 mb-4">
          <Button
            onClick={handleNewChat}
            className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity justify-start px-3"
            size="sm"
            title={!shouldShowContent ? "New Chat" : undefined}
          >
            <Plus className="h-4 w-4 flex-shrink-0" />
            <span 
              className="ml-3 whitespace-nowrap"
              style={{
                opacity: shouldShowContent ? 1 : 0,
                transition: 'opacity 150ms ease-in-out'
              }}
            >
              New Chat
            </span>
          </Button>
        </div>

        {/* Main Features Section */}
        <nav className="px-3 space-y-0.5 flex-1">
          <h3 
            className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-3 whitespace-nowrap"
            style={{
              opacity: shouldShowContent ? 1 : 0,
              transition: 'opacity 150ms ease-in-out'
            }}
          >
            Features
          </h3>
          {mainFeatures.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => shouldShowContent && onClose()}
                title={!shouldShowContent ? item.name : undefined}
                className={`flex items-center w-full justify-start px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span 
                  className="ml-3 whitespace-nowrap"
                  style={{
                    opacity: shouldShowContent ? 1 : 0,
                    transition: 'opacity 150ms ease-in-out'
                  }}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default EnhancedSidebar;