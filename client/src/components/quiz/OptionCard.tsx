import React from 'react';
import { Check } from 'lucide-react';

interface OptionCardProps {
  label: string; // e.g. 'A', 'B', 'C', 'D'
  text: string;
  isSelected: boolean;
  isMultiSelect?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  label,
  text,
  isSelected,
  isMultiSelect = false,
  onClick,
  disabled = false
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between group ${
        isSelected
          ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30 text-white shadow-lg shadow-amber-500/10'
          : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800/60'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'}`}
    >
      <div className="flex items-center space-x-3 sm:space-x-4 pr-3">
        <span
          className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base border transition-colors ${
            isSelected
              ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-md'
              : 'bg-slate-800 text-slate-400 border-slate-700 group-hover:border-slate-600 group-hover:text-slate-200'
          }`}
        >
          {label}
        </span>
        <span className="text-sm sm:text-base font-medium leading-snug">
          {text}
        </span>
      </div>

      <div className="flex-shrink-0">
        <div
          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-${isMultiSelect ? 'md' : 'full'} border flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-amber-500 border-amber-500 text-black'
              : 'border-slate-700 bg-slate-800/50'
          }`}
        >
          {isSelected && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />}
        </div>
      </div>
    </button>
  );
};
