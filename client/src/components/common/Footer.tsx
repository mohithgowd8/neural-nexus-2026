import React from 'react';
import { Cpu, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 py-8 text-slate-400 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-slate-300">NEURAL NEXUS 2026</span>
          <span className="text-slate-600">|</span>
          <span className="text-xs text-slate-400">Department of Artificial Intelligence &amp; Data Science</span>
        </div>
        <div className="flex items-center space-x-1 text-xs text-slate-500">
          <span>Organized with</span>
          <Heart className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
          <span>for First-Year AI &amp; DS Innovators</span>
        </div>
      </div>
    </footer>
  );
};
