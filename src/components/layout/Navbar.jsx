import { useState } from 'react';
import { Menu, Bell, Settings, LogOut, KeyRound, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Modal from '../ui/Modal';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ onMenuClick }) => {
    const { user, logout, changePassword } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showChange, setShowChange] = useState(false);
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        setDropdownOpen(false);
        navigate('/login');
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPwd !== confirmPwd) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }
        setSaving(true);
        try {
            await changePassword(currentPwd, newPwd);
            setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
            setShowChange(false);
            alert('Mot de passe mis à jour avec succès');
        } catch (err) {
            alert(err.message || 'Impossible de changer le mot de passe');
        } finally {
            setSaving(false);
        }
    };

    const initials = user?.username?.[0]?.toUpperCase() || 'A';
    const roleLabel = user?.role === 'admin' ? 'Administrateur' : 'Gestionnaire';

    return (
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 h-16 px-6 flex items-center justify-between">
            {/* Mobile menu toggle */}
            <button
                onClick={onMenuClick}
                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-all"
            >
                <Menu size={22} />
            </button>

            {/* Right side */}
            <div className="flex items-center gap-3 ml-auto">

                {/* Notification bell (placeholder) */}
                <button className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                    <Bell size={18} />
                </button>

                {/* User pill */}
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(o => !o)}
                        className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-150"
                    >
                        {/* Avatar */}
                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {initials}
                        </div>
                        <div className="hidden sm:flex flex-col items-start leading-none">
                            <span className="text-sm font-semibold text-slate-800">{user?.username || 'Admin'}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{roleLabel}</span>
                        </div>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    {dropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-modal z-20 overflow-hidden animate-fadeIn">
                                {/* User info */}
                                <div className="px-4 py-3 border-b border-slate-100">
                                    <p className="text-sm font-semibold text-slate-800">{user?.username}</p>
                                    <p className="text-xs text-slate-400">{user?.email}</p>
                                </div>
                                {/* Actions */}
                                <div className="py-1">
                                    <button
                                        onClick={() => { setDropdownOpen(false); setShowChange(true); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                    >
                                        <KeyRound size={15} className="text-slate-400" />
                                        Changer le mot de passe
                                    </button>
                                </div>
                                <div className="py-1 border-t border-slate-100">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut size={15} className="text-red-500" />
                                        Se déconnecter
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Change Password Modal */}
            <Modal isOpen={showChange} onClose={() => setShowChange(false)} title="Changer le mot de passe">
                <form onSubmit={handleChangePassword} className="space-y-4">
                    {[
                        ['Mot de passe actuel', currentPwd, setCurrentPwd],
                        ['Nouveau mot de passe', newPwd, setNewPwd],
                        ['Confirmer le nouveau mot de passe', confirmPwd, setConfirmPwd],
                    ].map(([label, val, setter]) => (
                        <div key={label}>
                            <label className="form-label">{label}</label>
                            <input
                                type="password"
                                value={val}
                                onChange={e => setter(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowChange(false)}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </Modal>
        </header>
    );
};

export default Navbar;
