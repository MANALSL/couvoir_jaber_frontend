import { twMerge } from 'tailwind-merge';

export const Card = ({ className, children, ...props }) => (
    <div
        className={twMerge(
            'bg-white rounded-xl border border-slate-200/80 shadow-card',
            className
        )}
        {...props}
    >
        {children}
    </div>
);

export const CardHeader = ({ className, children, ...props }) => (
    <div className={twMerge('flex flex-col space-y-1 p-5 border-b border-slate-100', className)} {...props}>
        {children}
    </div>
);

export const CardTitle = ({ className, children, ...props }) => (
    <h3 className={twMerge('font-semibold leading-snug tracking-tight text-slate-900 text-base', className)} {...props}>
        {children}
    </h3>
);

export const CardContent = ({ className, children, ...props }) => (
    <div className={twMerge('p-5 pt-4', className)} {...props}>
        {children}
    </div>
);
