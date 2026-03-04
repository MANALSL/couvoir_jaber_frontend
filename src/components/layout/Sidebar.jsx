import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Beef, Factory, LogOut, Syringe } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
    const { pathname } = useLocation();
    const { logout } = useAuth();

    const links = [
        { name: 'Tableau de Bord', path: '/', icon: LayoutDashboard, exact: true },
        { name: 'Élevage', path: '/elevage', icon: Beef },
        { name: 'Production', path: '/production', icon: Factory },
        { name: 'Vaccination', path: '/vaccination', icon: Syringe },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 bg-white h-screen fixed left-0 top-0 border-r border-slate-200/80 shadow-[1px_0_0_0_#e2e8f0]">
            {/* Logo area */}
            <div className="flex items-center justify-center px-6 py-5 border-b border-slate-100">
                <img
                    src="/logo.png"
                    alt="Couvoir Jaber"
                    className="h-16 w-auto object-contain"
                />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-2 mb-1">Menu principal</p>
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = link.exact
                        ? pathname === link.path
                        : pathname === link.path || pathname.startsWith(link.path + '/');
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                                isActive
                                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            )}
                        >
                            {/* Active indicator bar */}
                            {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/40 rounded-r-full -ml-3" />
                            )}
                            <span className={clsx(
                                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                                isActive ? 'bg-white/15' : 'bg-slate-100 group-hover:bg-slate-200'
                            )}>
                                <Icon size={17} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'} />
                            </span>
                            <span>{link.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-slate-100">
                <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-all duration-150 group"
                >
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 group-hover:bg-red-100 transition-colors">
                        <LogOut size={17} className="text-red-500" />
                    </span>
                    Se déconnecter
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
