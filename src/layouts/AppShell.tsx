import React, { useState, useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

/**
 * AppShell - Main layout component with sidebar functionality
 * - Uses CSS custom properties for instant, flash-free positioning
 * - Responsive layout that adapts to screen size
 * - Mobile keyboard friendly with dynamic viewport heights
 */
export default function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const sidebarWidth = 280;
  const railWidth = 64;
  const location = useLocation();
  const navigate = useNavigate();

  // Update CSS custom properties for instant positioning
  useLayoutEffect(() => {
    const updateLayoutVars = () => {
      const desktop = window.innerWidth >= 768;
      const offset = desktop ? (isSidebarOpen ? sidebarWidth : railWidth) : 0;

      // Set CSS custom properties on document root
      document.documentElement.style.setProperty('--sidebar-offset', `${offset}px`);
      document.documentElement.style.setProperty('--is-desktop', desktop ? '1' : '0');
      document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
      document.documentElement.style.setProperty('--rail-width', `${railWidth}px`);

      // Update React state for conditional rendering
      setIsDesktop(desktop);
    };

    // Initial update
    updateLayoutVars();

    // Listen for resize
    window.addEventListener('resize', updateLayoutVars);
    return () => window.removeEventListener('resize', updateLayoutVars);
  }, [isSidebarOpen, sidebarWidth, railWidth]);

  // Close sidebar on route change on mobile
  React.useEffect(() => {
    if (!isDesktop) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isDesktop]);

  // Handle new chat - navigate to home page and trigger chat reset
  const handleNewChat = () => {
    if (location.pathname !== '/') {
      navigate('/');
    }
    // Trigger a custom event to reset chat in the Index component
    window.dispatchEvent(new CustomEvent('newChatRequested'));
  };

  const hasBottomTabs = ['/', '/recipes-to-image', '/image-to-recipes', '/umf-calculator'].includes(location.pathname);

  // ✅ Chat route should NOT add page-level overflow; Index owns scroll
  const isChat = location.pathname === '/';
  const mainClass =
    `transition-all duration-300 ease-in-out ${isChat ? 'overflow-hidden' : 'overflow-auto'}`;

  return (
    // Unify on dvh to avoid svh/dvh mismatch issues
    <div className="h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Fixed Header - Now uses CSS variables */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        isDesktop={isDesktop}
      />

      {/* Single Sidebar that handles both expanded and collapsed states */}
      <div
        className="hidden md:block fixed top-0 left-0 z-40 h-screen overflow-hidden transition-[width] duration-300 ease-out"
        style={{ width: 'var(--sidebar-offset, 64px)' }}
      >
        <Sidebar
          isOpen={true}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={!isSidebarOpen}
          onToggleCollapsed={() => setIsSidebarOpen(prev => !prev)}
          onNewChat={handleNewChat}
          width={sidebarWidth}
          collapsedWidth={railWidth}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && !isDesktop && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed top-0 left-0 z-50 h-screen w-64">
            <Sidebar
              isOpen={true}
              onClose={() => setIsSidebarOpen(false)}
              onNewChat={handleNewChat}
              width={256}
            />
          </div>
        </>
      )}

      {/* Main Content Area - Mobile keyboard friendly */}
      <main
        className={mainClass}
        style={{
          marginLeft: 'var(--sidebar-offset, 0px)',
          paddingTop: '3.5rem',         // header is fixed, keep visual spacing
          paddingBottom: 0,             // remove extra padding
          scrollbarGutter: 'stable',
          // For chat: let Index manage scrolling; for others: AppShell manages it
          ...(isChat
            ? { minHeight: 'calc(100dvh - 3.5rem)' }
            : { minHeight: 'calc(100dvh - 3.5rem)', maxHeight: 'calc(100dvh - 3.5rem)' }
          ),
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
