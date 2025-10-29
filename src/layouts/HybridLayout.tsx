import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { MessageSquare, Image as ImgIcon, FlaskConical, Calculator, Upload } from 'lucide-react';

const featureTabs = [
  { to: '/', label: 'Chat Assistant', icon: MessageSquare, short: 'Chat' },
  { to: '/recipes-to-image', label: 'Recipes → Image', icon: FlaskConical, short: 'R→I' },
  { to: '/image-to-recipes', label: 'Image → Recipes', icon: ImgIcon, short: 'I→R' },
  { to: '/umf-calculator', label: 'UMF Calculator', icon: Calculator, short: 'UMF' },
  { to: '/share-glaze', label: 'Share Glaze', icon: Upload, short: 'Share' },
];

/**
 * HybridLayout - Feature tabs layout using CSS custom properties
 * 
 * Benefits of CSS variables approach:
 * - No flash/jump on initial load
 * - Instant positioning updates
 * - SSR-safe
 * - Consistent with Header positioning
 */
export default function HybridLayout() {
  const { pathname } = useLocation();

  // Only show feature tabs on feature pages
  const isFeaturePage = ['/', '/recipes-to-image', '/image-to-recipes', '/umf-calculator', '/share-glaze'].includes(pathname);

  return (
    <div className="relative">
      {/* Top Feature Tabs - Only show on feature pages */}
      {isFeaturePage && (
        <div 
          className="fixed top-14 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300"
          style={{
            // Use CSS custom properties set by AppShell - same as Header
            left: 'calc(var(--is-desktop, 0) * var(--sidebar-offset, 0px))',
            right: 0,
            height: '52px'
          }}
        >
          <div className="h-full flex items-center justify-center px-4">
            <nav className="w-full max-w-4xl mx-auto">
              <ul className="flex h-full items-center justify-center gap-2">
                {featureTabs.map(({ to, label, icon: Icon, short }) => {
                  const active = pathname === to;
                  return (
                    <li key={to}>
                      <Link
                        to={to}
                        className={[
                          'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium',
                          active 
                            ? 'text-primary bg-primary/10 border border-primary/20 shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        ].join(' ')}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon className="h-4 w-4" />
                        {/* Full label on desktop, short on mobile */}
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{short}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Content - Uses same approach as RecipesToImage, etc. */}
      <div style={{ paddingTop: isFeaturePage ? '52px' : '0px' }}>
        <Outlet />
      </div>
    </div>
  );
}
