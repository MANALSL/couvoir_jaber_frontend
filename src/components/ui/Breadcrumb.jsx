import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

// Detect section root from current URL to pick correct home link
const useSectionRoot = (items) => {
    const { pathname } = useLocation();
    if (pathname.startsWith('/production')) return { label: 'Production', path: '/production' };
    if (pathname.startsWith('/vaccination')) return { label: 'Vaccination', path: '/vaccination' };
    return { label: 'Élevage', path: '/elevage' };
};

const Breadcrumb = ({ items = [] }) => {
    const root = useSectionRoot(items);

    return (
        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm mb-5">
            <Link
                to="/"
                className="flex items-center gap-1 text-slate-400 hover:text-primary-600 transition-colors"
                title="Accueil"
            >
                <Home size={14} />
            </Link>

            <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />

            <Link
                to={root.path}
                className="text-slate-500 hover:text-primary-600 font-medium transition-colors"
            >
                {root.label}
            </Link>

            {items.map((item, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                    <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />
                    {item.link ? (
                        <Link
                            to={item.link}
                            className="text-slate-500 hover:text-primary-600 font-medium transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-slate-800 font-semibold">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
};

export default Breadcrumb;
