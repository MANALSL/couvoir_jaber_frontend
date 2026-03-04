import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Button = forwardRef(({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] rounded-lg';

    const variants = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500/40 shadow-sm hover:shadow-md',
        secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-400/30 shadow-sm',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/40 shadow-sm hover:shadow-md',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300/40',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500/40 shadow-sm',
        orange: 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-400/40 shadow-sm',
    };

    const sizes = {
        xs: 'h-7 px-2.5 text-xs gap-1',
        sm: 'h-8 px-3 text-xs gap-1.5',
        default: 'h-9 px-4 text-sm gap-2',
        lg: 'h-11 px-6 text-sm gap-2',
        icon: 'h-9 w-9 p-0',
    };

    return (
        <button
            ref={ref}
            className={twMerge(base, variants[variant] || variants.primary, sizes[size] || sizes.default, className)}
            {...props}
        />
    );
});

Button.displayName = 'Button';
export default Button;
