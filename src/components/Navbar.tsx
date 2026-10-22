import React from 'react';
import { ActiveTab } from '../types';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenQuickShorten: () => void;
  onOpenCloudflareModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenQuickShorten,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-[#FAF8F5]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6 sm:gap-8">
        {/* Zone 1: Stylized Q2R Brand Logo & Wordmark */}
        <BrandLogo
          size="md"
          showSubtitle={true}
          onClick={() => onTabChange('home')}
          className="shrink-0"
        />

        {/* Zone 2: 4-6 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-stone-600">
          <button
            onClick={() => onTabChange('home')}
            className={`whitespace-nowrap pb-0.5 transition-colors cursor-pointer ${
              activeTab === 'home'
                ? 'text-stone-900 font-semibold border-b-2 border-stone-900'
                : 'hover:text-stone-900'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onTabChange('studio')}
            className={`whitespace-nowrap pb-0.5 transition-colors cursor-pointer ${
              activeTab === 'studio'
                ? 'text-stone-900 font-semibold border-b-2 border-stone-900'
                : 'hover:text-stone-900'
            }`}
          >
            QR Studio
          </button>
          <button
            onClick={() => onTabChange('router')}
            className={`whitespace-nowrap pb-0.5 transition-colors cursor-pointer ${
              activeTab === 'router'
                ? 'text-stone-900 font-semibold border-b-2 border-stone-900'
                : 'hover:text-stone-900'
            }`}
          >
            Short Links
          </button>
          <button
            onClick={() => onTabChange('inspector')}
            className={`whitespace-nowrap pb-0.5 transition-colors cursor-pointer ${
              activeTab === 'inspector'
                ? 'text-stone-900 font-semibold border-b-2 border-stone-900'
                : 'hover:text-stone-900'
            }`}
          >
            Tree Map
          </button>
          <button
            onClick={() => onTabChange('about')}
            className={`whitespace-nowrap pb-0.5 transition-colors cursor-pointer ${
              activeTab === 'about'
                ? 'text-stone-900 font-semibold border-b-2 border-stone-900'
                : 'hover:text-stone-900'
            }`}
          >
            About
          </button>
          <button
            onClick={() => onTabChange('privacy')}
            className={`whitespace-nowrap pb-0.5 transition-colors cursor-pointer ${
              activeTab === 'privacy'
                ? 'text-stone-900 font-semibold border-b-2 border-stone-900'
                : 'hover:text-stone-900'
            }`}
          >
            Privacy
          </button>
        </nav>

        {/* Zone 3: Primary Action (Minimal & Clean) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenQuickShorten}
            className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-all rounded-xl cursor-pointer whitespace-nowrap shadow-xs hover:shadow"
          >
            + Create Short Link
          </button>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden border-t border-stone-200/70 px-4 py-2.5 overflow-x-auto gap-4 text-xs font-medium scrollbar-none bg-[#FAF8F5] text-stone-600 items-center">
        <button
          onClick={() => onTabChange('home')}
          className={`whitespace-nowrap shrink-0 ${activeTab === 'home' ? 'font-bold text-stone-900' : ''}`}
        >
          Home
        </button>
        <button
          onClick={() => onTabChange('studio')}
          className={`whitespace-nowrap shrink-0 ${activeTab === 'studio' ? 'font-bold text-stone-900' : ''}`}
        >
          QR Studio
        </button>
        <button
          onClick={() => onTabChange('router')}
          className={`whitespace-nowrap shrink-0 ${activeTab === 'router' ? 'font-bold text-stone-900' : ''}`}
        >
          Short Links
        </button>
        <button
          onClick={() => onTabChange('inspector')}
          className={`whitespace-nowrap shrink-0 ${activeTab === 'inspector' ? 'font-bold text-stone-900' : ''}`}
        >
          Tree Map
        </button>
        <button
          onClick={() => onTabChange('about')}
          className={`whitespace-nowrap shrink-0 ${activeTab === 'about' ? 'font-bold text-stone-900' : ''}`}
        >
          About
        </button>
        <button
          onClick={() => onTabChange('privacy')}
          className={`whitespace-nowrap shrink-0 ${activeTab === 'privacy' ? 'font-bold text-stone-900' : ''}`}
        >
          Privacy
        </button>
      </div>
    </header>
  );
};
