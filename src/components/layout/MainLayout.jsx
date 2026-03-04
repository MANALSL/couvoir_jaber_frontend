import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const MainLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
            <Sidebar />
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300 overflow-x-hidden">
                <Navbar onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
                <main className="flex-1 p-6 md:p-8 overflow-x-hidden w-full max-w-[1600px] mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
