import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Warehouse, ChevronRight, Plus, X, Edit2, Trash2, Egg } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import { productionService } from '../../services/productionService';
import { elevageService } from '../../services/elevageService';
import { useAuth } from '../../context/AuthContext';

const ProductionBatimentsView = () => {
    const navigate = useNavigate();
    const { fermeId } = useParams();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [batiments, setBatiments] = useState([]);
    const [fermeInfo, setFermeInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editingBatiment, setEditingBatiment] = useState(null);
    const [createForm, setCreateForm] = useState({ name: '', lot: '' });
    const [editForm, setEditForm] = useState({ name: '', lot: '' });

    useEffect(() => {
        const load = async () => {
            try {
                const [bats, fermes] = await Promise.all([
                    productionService.getBatiments(fermeId),
                    productionService.getFermes()
                ]);
                setBatiments(bats);
                setFermeInfo(fermes.find(f => f.id === parseInt(fermeId)));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [fermeId]);

    const handleSaveCreate = async (e) => {
        e.preventDefault();
        try {
            const newBat = await elevageService.addBatiment({ ...createForm, ferme_id: parseInt(fermeId) });
            setBatiments(prev => [...prev, newBat]);
            setCreateModalOpen(false);
            setCreateForm({ name: '', lot: '' });
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            const updated = await elevageService.updateBatiment(editingBatiment.id, { ...editForm, ferme_id: parseInt(fermeId) });
            setBatiments(prev => prev.map(b => b.id === editingBatiment.id ? updated : b));
            setEditingBatiment(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (e, batId) => {
        e.stopPropagation();
        if (!window.confirm('Supprimer ce bâtiment ?')) return;
        try {
            await elevageService.deleteBatiment(batId);
            setBatiments(prev => prev.filter(b => b.id !== batId));
        } catch (err) {
            alert('Erreur lors de la suppression');
        }
    };

    return (
        <div className="space-y-6">
            <Breadcrumb items={[
                { label: fermeInfo?.name || `Ferme ${fermeId}`, link: '/production' }
            ]} />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
                            <Egg size={22} className="text-white" />
                        </div>
                        {fermeInfo?.name || `Ferme ${fermeId}`}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Sélectionnez un bâtiment pour saisir la production</p>
                </div>
                {isAdmin && (
                    <Button
                        onClick={() => setCreateModalOpen(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Nouveau Bâtiment
                    </Button>
                )}
            </div>

            {/* Batiment Cards */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Chargement...</p>
                </div>
            ) : batiments.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Warehouse size={64} className="text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800">Aucun bâtiment</h3>
                    <p className="text-gray-500 mb-6">Créez le premier bâtiment pour cette ferme.</p>
                    {isAdmin && (
                        <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                            <Plus size={18} />
                            Créer un Bâtiment
                        </Button>
                    )}
                </div>
            ) : (
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Bâtiments</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                        {batiments.map(batiment => (
                            <Card
                                key={batiment.id}
                                className="group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-orange-400"
                                onClick={() => navigate(`/production/ferme/${fermeId}/batiment/${batiment.id}`)}
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                                            <Warehouse size={28} className="text-white" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setEditingBatiment(batiment); setEditForm({ name: batiment.name, lot: batiment.lot || '' }); }}
                                                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                    ><Edit2 size={16} /></button>
                                                    <button
                                                        onClick={e => handleDelete(e, batiment.id)}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    ><Trash2 size={16} /></button>
                                                </>
                                            )}
                                            <ChevronRight size={22} className="text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                                        {batiment.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-3">
                                        <span className="font-medium">Lot:</span> {batiment.lot || '—'}
                                    </p>
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                        <span className="text-xs text-gray-500">Parcs</span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                            {batiment.parc_count || 0}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">Nouveau Bâtiment</h3>
                                <button onClick={() => setCreateModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSaveCreate} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Nom</label>
                                    <input type="text" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none" required />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Lot</label>
                                    <input type="text" value={createForm.lot} onChange={e => setCreateForm(p => ({ ...p, lot: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none" />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>Annuler</Button>
                                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white">Créer</Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}

            {/* Edit Modal */}
            {editingBatiment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <Card className="w-full max-w-md shadow-2xl">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">Modifier le Bâtiment</h3>
                                <button onClick={() => setEditingBatiment(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSaveEdit} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Nom</label>
                                    <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none" required />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Lot</label>
                                    <input type="text" value={editForm.lot} onChange={e => setEditForm(p => ({ ...p, lot: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none" />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="secondary" type="button" onClick={() => setEditingBatiment(null)}>Annuler</Button>
                                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white">Enregistrer</Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ProductionBatimentsView;
