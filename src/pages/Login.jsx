import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Egg, Lock, User, AlertCircle } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError('Identifiants incorrects. Vérifiez votre nom d\'utilisateur et mot de passe.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
            />

            <div className="relative w-full max-w-md animate-slideDown">
                {/* Logo Card */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-4 shadow-xl">
                        <img src="/logo.png" alt="Couvoir Jaber" className="h-10 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Couvoir Jaber</h1>
                    <p className="text-slate-400 text-sm mt-1">Système de gestion avicole</p>
                </div>

                {/* Login card */}
                <div className="bg-white rounded-2xl shadow-modal overflow-hidden">
                    <div className="p-8">
                        <h2 className="text-xl font-semibold text-slate-900 mb-1">Connexion</h2>
                        <p className="text-sm text-slate-500 mb-6">Entrez vos identifiants pour accéder à l'application</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="form-label">Nom d'utilisateur</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="admin"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="form-input pl-9"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Mot de passe</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="form-input pl-9"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-3 rounded-lg">
                                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-10 mt-2"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="spinner w-4 h-4" />
                                        Connexion…
                                    </span>
                                ) : 'Se connecter'}
                            </Button>
                        </form>
                    </div>
                    <div className="px-8 py-3 bg-slate-50 border-t border-slate-100 text-center">
                        <span className="text-xs text-slate-400">© 2026 Couvoir Jaber — Tous droits réservés</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
