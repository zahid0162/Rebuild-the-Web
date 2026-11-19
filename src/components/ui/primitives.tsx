import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'secondary',
  size = 'md',
  type = 'button',
  children,
  ...props
}) => {
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500/60 shadow-sm',
    secondary:
      'bg-[#18181B] text-zinc-100 hover:bg-[#202024] border border-white/10',
    ghost:
      'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] border border-transparent',
    danger:
      'bg-red-950/60 text-red-200 hover:bg-red-900/70 border border-red-500/30',
  };

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
    md: 'h-9 px-4 text-xs font-medium rounded-md gap-2',
    lg: 'h-11 px-5 text-sm font-medium rounded-lg gap-2',
  };

  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap shrink-0 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-45 disabled:pointer-events-none cursor-pointer',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className,
  ...props
}) => {
  return (
    <input
      className={cn(
        'w-full h-9 rounded-md bg-[#111114] border border-white/10 px-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 transition-colors',
        className
      )}
      {...props}
    />
  );
};

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className,
  ...props
}) => {
  return (
    <textarea
      className={cn(
        'w-full rounded-md bg-[#111114] border border-white/10 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 transition-colors resize-y',
        className
      )}
      {...props}
    />
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <select
      className={cn(
        'w-full h-9 rounded-md bg-[#111114] border border-white/10 px-2.5 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
};
