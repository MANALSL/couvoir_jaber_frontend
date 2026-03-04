import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Warehouse, ChevronRight, Plus, Building, Grid3x3, Edit2, X, Trash2, History, RotateCcw, FileText, BarChart3 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ElevageCharts from '../../components/charts/ElevageCharts';
import { elevageService } from '../../services/elevageService';
import { useAuth } from '../../context/AuthContext';

const BatimentsView = () => {
    const navigate = useNavigate();
    const { fermeId } = useParams();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [editingBatiment, setEditingBatiment] = useState(null);
    const [viewingBilan, setViewingBilan] = useState(null);
    const [viewingSummary, setViewingSummary] = useState(null);
    const [summaryDataForModal, setSummaryDataForModal] = useState([]);
    const [isChartsOpen, setIsChartsOpen] = useState(false);
    const [allFermeData, setAllFermeData] = useState([]);
    const [editForm, setEditForm] = useState({ name: '', lot: '' });
    const [fermeInfo, setFermeInfo] = useState(null);

    // History state
    const [deletedBatiments, setDeletedBatiments] = useState([]);

    // Generate 8 batiments for demonstration
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', lot: '' });

    // Generate 8 batiments for demonstration
    const [batiments, setBatiments] = useState([]);

    // Link real data to the summary overview
    const [summaryData, setSummaryData] = useState([]);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Fetch global summary data
    useEffect(() => {
        const fetchGlobalSummary = async () => {
            setLoadingSummary(true);
            try {
                const data = await elevageService.getFermeSummary(fermeId);
                setSummaryData(data);
            } catch (error) {
                console.error("Error fetching global summary:", error);
                setSummaryData([]);
            } finally {
                setLoadingSummary(false);
            }
        };

        if (fermeId) {
            fetchGlobalSummary();
        }
    }, [fermeId, allFermeData]); // Re-fetch if allFermeData changes (e.g. after update) or fermeId changes

    // Process data for the detailed Bilan modal (grouped by date)
    const bilanData = useMemo(() => {
        if (!viewingBilan || !allFermeData) return [];

        const buildingData = allFermeData.filter(d => String(d.batimentId) === String(viewingBilan.id));

        // Group by date
        const groupedByDate = buildingData.reduce((acc, curr) => {
            if (!acc[curr.date]) acc[curr.date] = [];
            acc[curr.date].push(curr);
            return acc;
        }, {});

        // Sort dates ASC
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b));

        return sortedDates.map((date, idx) => {
            const dayRecords = groupedByDate[date];
            const prevDateData = idx > 0 ? groupedByDate[sortedDates[idx - 1]] : null;

            const parcs = Array.from({ length: viewingBilan.parcs }).map((_, i) => {
                const pIdx = i + 1;
                const rec = dayRecords.find(r => String(r.parcId) === String(pIdx)) || {};
                const prevRec = prevDateData ? prevDateData.find(r => String(r.parcId) === String(pIdx)) : null;

                const curPoids = parseFloat(rec.poids_poule) || 0;
                const prevPoids = prevRec ? (parseFloat(prevRec.poids_poule) || 0) : 0;
                const gain = (curPoids > 0 && prevPoids > 0) ? (curPoids - prevPoids) : null;

                return {
                    effectif: (parseFloat(rec.effectif_poule) || 0) + (parseFloat(rec.effectif_coq) || 0),
                    poids: rec.poids_poule || '-',
                    gain: gain !== null ? `+${gain}` : '-',
                    guide: rec.poids_guide || '-',
                    ecart: (rec.poids_poule && rec.poids_guide) ? (parseFloat(rec.poids_poule) - parseFloat(rec.poids_guide)) : '-',
                    homog: rec.homog_pct || '-'
                };
            });

            const totalEffectif = parcs.reduce((sum, p) => sum + (typeof p.effectif === 'number' ? p.effectif : 0), 0);
            const activePoids = parcs.filter(p => p.poids !== '-').map(p => parseFloat(p.poids));
            const avgPoids = activePoids.length > 0 ? (activePoids.reduce((a, b) => a + b, 0) / activePoids.length).toFixed(0) : '-';

            return {
                date: new Date(date).toLocaleDateString('fr-FR'),
                age: dayRecords[0]?.age || '-',
                parcs,
                totalEffectif,
                avgPoids,
                guide: dayRecords[0]?.poids_guide || '-'
            };
        });
    }, [viewingBilan, allFermeData]);

    const handleBatimentClick = (batimentId) => {
        navigate(`/elevage/ferme/${fermeId}/batiment/${batimentId}`);
    };

    useEffect(() => {
        const fetchBatiments = async () => {
            try {
                const data = await elevageService.getBatiments(fermeId);
                setBatiments(data);
            } catch (error) {
                console.error("Error fetching batiments:", error);
            }
        };
        const fetchFermeData = async () => {
            const data = await elevageService.getElevages();
            // Normalisation pour assurer la correspondance avec le backend
            const normalized = data.map(d => ({
                ...d,
                fermeId: d.fermeId || d.ferme_id,
                batimentId: d.batimentId || d.batiment_id,
                parcId: d.parcId || d.parc_id,
                deleted: d.deleted ?? d.is_deleted
            }));
            const farmData = normalized.filter(item => String(item.fermeId) === String(fermeId) && !item.deleted);
            setAllFermeData(farmData);
        };
        const fetchFermeInfo = async () => {
            try {
                const fermes = await elevageService.getFermes();
                const ferme = fermes.find(f => f.id === parseInt(fermeId));
                setFermeInfo(ferme);
            } catch (error) {
                console.error("Error fetching ferme info:", error);
            }
        };
        fetchBatiments();
        fetchFermeData();
        fetchFermeInfo();
    }, [fermeId]);

    const handleViewBilan = (e, batiment) => {
        e.stopPropagation();
        setViewingBilan(batiment);
    };

    const handleViewSummary = async (e, batiment) => {
        e.stopPropagation();
        setViewingSummary(batiment);
        try {
            const data = await elevageService.getBatimentSummary(batiment.id);
            setSummaryDataForModal(data);
        } catch (error) {
            console.error("Error fetching batiment summary:", error);
            setSummaryDataForModal([]);
        }
    };

    const handleEditClick = (e, batiment) => {
        e.stopPropagation();
        setEditingBatiment(batiment);
        setEditForm({ name: batiment.name, lot: batiment.lot });
    };

    const handleDeleteBatiment = async (e, batimentId) => {
        e.stopPropagation();
        if (window.confirm('Voulez-vous vraiment supprimer ce bâtiment ?')) {
            try {
                await elevageService.deleteBatiment(batimentId);
                const batimentToDelete = batiments.find(b => b.id === batimentId);
                if (batimentToDelete) {
                    setDeletedBatiments(prev => [{
                        ...batimentToDelete,
                        deletedAt: new Date().toLocaleString()
                    }, ...prev]);
                    setBatiments(prev => prev.filter(b => b.id !== batimentId));
                }
            } catch (error) {
                console.error("Error deleting batiment:", error);
                alert("Erreur lors de la suppression");
            }
        }
    };

    const handleRestoreBatiment = (batimentToRestore) => {
        // eslint-disable-next-line no-unused-vars
        const { deletedAt, ...batiment } = batimentToRestore;
        setBatiments(prev => [...prev, batiment].sort((a, b) => a.id - b.id));
        setDeletedBatiments(prev => prev.filter(b => b.id !== batiment.id));
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            const updated = await elevageService.updateBatiment(editingBatiment.id, {
                ...editForm,
                ferme_id: parseInt(fermeId)
            });
            setBatiments(prev => prev.map(b => b.id === editingBatiment.id ? updated : b));
            setEditingBatiment(null);
        } catch (error) {
            console.error("Error updating batiment:", error);
            alert("Erreur lors de la mise à jour");
        }
    };

    const handleCreateBatiment = () => {
        setCreateForm({ name: '', lot: '' });
        setCreateModalOpen(true);
        setShowCreateMenu(false);
    };

    const handleSaveCreate = async (e) => {
        e.preventDefault();
        try {
            const newBatiment = await elevageService.addBatiment({
                ...createForm,
                ferme_id: parseInt(fermeId)
            });
            setBatiments([...batiments, newBatiment]);
            setCreateModalOpen(false);
        } catch (error) {
            console.error("Error creating batiment:", error);
            alert("Erreur lors de la création");
        }
    };

    const handleCreateParc = () => {
        alert('Créer un nouveau Parc');
        setShowCreateMenu(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Actif':
                return 'bg-green-100 text-green-800';
            case 'En production':
                return 'bg-blue-100 text-blue-800';
            case 'Maintenance':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6 relative">
            <Breadcrumb
                items={[
                    { label: fermeInfo?.name || `Ferme ${fermeId}`, link: `/elevage` }
                ]}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{fermeInfo?.name || `Ferme ${fermeId}`}</h1>
                    <p className="text-sm text-gray-500">Sélectionnez un bâtiment pour continuer</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Global Summary Badge for Parcs - Clickable to show summary */}
                    <div
                        onClick={() => setShowSummary(!showSummary)}
                        className={`border px-4 py-2 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-300 ${showSummary
                            ? 'bg-blue-600 border-blue-700 text-white shadow-inner scale-[0.98]'
                            : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 shadow-sm hover:shadow-md'
                            }`}
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm transition-colors ${showSummary ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'
                            }`}>
                            <Grid3x3 size={20} />
                        </div>
                        <div>
                            <div className={`text-[10px] uppercase tracking-wider font-bold ${showSummary ? 'text-blue-100' : 'text-blue-600'
                                }`}>Total Parcs</div>
                            <div className={`text-xl font-black leading-none ${showSummary ? 'text-white' : 'text-blue-900'
                                }`}>
                                {batiments.reduce((sum, b) => sum + (Number(b.parc_count) || 0), 0)}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setIsChartsOpen(true)}
                            className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                        >
                            <BarChart3 size={20} className="mr-2" />
                            Dashboard
                        </Button>



                        {/* Create Actions Dropdown */}
                        <div className="relative">
                            <Button
                                onClick={() => setShowCreateMenu(!showCreateMenu)}
                                className="flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Créer
                            </Button>

                            {showCreateMenu && (
                                <>
                                    {/* Backdrop */}
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowCreateMenu(false)}
                                    />

                                    {/* Dropdown Menu */}
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
                                        <div className="py-1">
                                            <button
                                                onClick={handleCreateBatiment}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                                            >
                                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                    <Building size={18} className="text-green-600" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-medium">Nouveau Bâtiment</div>
                                                    <div className="text-xs text-gray-500">Ajouter un bâtiment</div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={handleCreateParc}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                            >
                                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                                    <Grid3x3 size={18} className="text-purple-600" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-medium">Nouveau Parc</div>
                                                    <div className="text-xs text-gray-500">Créer un parc</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Batiment Cards */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Sélectionner un Bâtiment</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                    {batiments.map((batiment) => (
                        <Card
                            key={batiment.id}
                            className="group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-emerald-500"
                            onClick={() => handleBatimentClick(batiment.id)}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                                        <Warehouse size={28} className="text-white" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleViewSummary(e, batiment)}
                                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                            title="Résumé (État Actuel)"
                                        >
                                            <Grid3x3 size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => handleViewBilan(e, batiment)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            title="Bilan (Historique)"
                                        >
                                            <FileText size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => handleEditClick(e, batiment)}
                                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                            title="Modifier"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteBatiment(e, batiment.id)}
                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <ChevronRight
                                            size={24}
                                            className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all"
                                        />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                                    {batiment.name}
                                </h3>

                                <div className="space-y-2 mb-3">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Lot:</span> {batiment.lot}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Capacité: <span className="font-medium">{batiment.capacity}</span>
                                    </p>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(batiment.status)}`}>
                                        {batiment.status}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <span className="text-xs text-gray-500">Parcs</span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                        {batiment.parc_count || 0}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Edit Modal */}
            {editingBatiment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <Card className="w-full max-w-md shadow-2xl relative">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Modifier le Bâtiment</h3>
                                <button
                                    onClick={() => setEditingBatiment(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveEdit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Nom du Bâtiment</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Ex: Bâtiment A"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Lot</label>
                                    <input
                                        type="text"
                                        value={editForm.lot}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, lot: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Ex: LOT-001"
                                        required
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setEditingBatiment(null)}
                                    >
                                        Annuler
                                    </Button>
                                    <Button type="submit">
                                        Enregistrer
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}

            {/* Create Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <Card className="w-full max-w-md shadow-2xl relative">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Nouveau Bâtiment</h3>
                                <button
                                    onClick={() => setCreateModalOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Nom du Bâtiment</label>
                                    <input
                                        type="text"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Ex: Bâtiment Z"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Lot</label>
                                    <input
                                        type="text"
                                        value={createForm.lot}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, lot: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Ex: LOT-099"
                                        required
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setCreateModalOpen(false)}
                                    >
                                        Annuler
                                    </Button>
                                    <Button type="submit">
                                        Créer
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}

            {/* Global Summary Table */}
            {showSummary && (
                <Card className="animate-fadeIn">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900">Vue d'ensemble - Tous les Parcs</h2>
                        <p className="text-sm text-gray-500">Informations globales pour tous les parcs de batiments</p>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm border-collapse">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-blue-50">BAT</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-blue-50">PARCS</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-blue-50">AGE</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">EFFECTIF</th>
                                    <th colSpan="3" className="px-3 py-3 border border-gray-300 font-medium text-center bg-yellow-50">POIDS(g)</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">Guide</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">HOMOG %</th>
                                    <th colSpan="4" className="px-3 py-3 border border-gray-300 font-medium text-center bg-green-50">RATION(g)</th>
                                    <th colSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-red-50">MORT %</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">OBSEVT</th>
                                </tr>
                                <tr>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50 text-[10px]">ACTUEL</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50 text-[10px]">GAIN</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50 text-[10px]">ECRT/GUID</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-green-50 text-[10px]">GUIDE</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-green-50 text-[10px]">ACTUEL</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-green-50 text-[10px]">DIFF</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-green-50 text-[10px]">PROCH</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-red-50 text-[10px]">ACTUEL</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-red-50 text-[10px]">GUIDE</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loadingSummary ? (
                                    <tr>
                                        <td colSpan="14" className="p-8 text-center text-gray-500 italic">
                                            Chargement des données...
                                        </td>
                                    </tr>
                                ) : summaryData.length === 0 ? (
                                    <tr>
                                        <td colSpan="14" className="p-8 text-center text-gray-500 italic">
                                            Chargement des données ou aucun parc actif...
                                        </td>
                                    </tr>
                                ) : (
                                    summaryData.map((row, idx) => {
                                        const isBatimentFirst = idx === 0 || row.batiment !== summaryData[idx - 1].batiment;
                                        let rowSpan = 1;
                                        if (isBatimentFirst) {
                                            let i = idx + 1;
                                            while (i < summaryData.length && summaryData[i].batiment === row.batiment) {
                                                rowSpan++;
                                                i++;
                                            }
                                        }

                                        return (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                {isBatimentFirst && (
                                                    <td
                                                        rowSpan={rowSpan}
                                                        className="px-3 py-2 border border-gray-300 text-center font-bold text-xl bg-white align-middle text-gray-800 shadow-sm"
                                                    >
                                                        {row.batiment}
                                                    </td>
                                                )}
                                                <td className="px-3 py-2 border border-gray-200 text-center font-semibold bg-blue-50">{row.parc}</td>
                                                <td className="px-3 py-2 border border-gray-200 text-center font-medium bg-blue-50">{row.age}</td>
                                                <td className="px-3 py-2 border border-gray-200 text-center font-mono">{row.effectif}</td>
                                                <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.poids_actuel}</td>
                                                <td className={`px-2 py-2 border border-gray-200 text-center font-mono text-xs ${row.poids_gain !== '-' && parseFloat(row.poids_gain) > 0 ? 'text-green-600' : ''}`}>
                                                    {row.poids_gain !== '-' ? (parseFloat(row.poids_gain) > 0 ? `+${row.poids_gain}` : row.poids_gain) : '-'}
                                                </td>

                                                {/* ECRT/GUID : Diff between Actuel and Guide */}
                                                <td className={`px-2 py-2 border border-gray-200 text-center font-mono text-xs ${row.poids_actuel !== '-' && row.guide !== '-'
                                                    ? ((parseFloat(row.poids_actuel) - parseFloat(row.guide)) >= 0 ? 'text-green-600' : 'text-red-600')
                                                    : ''
                                                    }`}>
                                                    {row.poids_actuel !== '-' && row.guide !== '-'
                                                        ? (() => {
                                                            const diff = parseFloat(row.poids_actuel) - parseFloat(row.guide);
                                                            return diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0);
                                                        })()
                                                        : '-'}
                                                </td>

                                                {/* Guide */}
                                                <td className="px-3 py-2 border border-gray-200 text-center font-mono">{row.guide}</td>

                                                <td className="px-3 py-2 border border-gray-200 text-center font-mono">{row.homog_pct !== '-' ? `${row.homog_pct}%` : '-'}</td>
                                                <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs text-gray-500 italic">{row.ration_guide}</td>
                                                <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.ration_actuel}</td>
                                                <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">
                                                    {row.ration_diff !== '-' ? (parseFloat(row.ration_diff) > 0 ? `+${row.ration_diff}` : row.ration_diff) : '-'}
                                                </td>
                                                <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.ration_proch}</td>
                                                <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs text-red-600 font-bold">{row.mort_pct !== '-' ? `${row.mort_pct}%` : '-'}</td>
                                                <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs text-gray-500">{row.mort_guide}</td>
                                                <td className="px-3 py-2 border border-gray-200 text-center text-xs">{row.obsevt}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Batiment Summary Modal (Resume) */}
            <Modal
                isOpen={!!viewingSummary}
                onClose={() => setViewingSummary(null)}
                title={`Résumé - ${viewingSummary?.name || ''}`}
                size="xl"
            >
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm border-collapse">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-blue-50">PARC</th>
                                <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-blue-50">AGE</th>
                                <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">EFFECTIF</th>
                                <th colSpan="3" className="px-3 py-3 border border-gray-300 font-medium text-center bg-yellow-50">POIDS(g)</th>
                                <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">Guide</th>
                                <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">HOMOG %</th>
                                <th colSpan="3" className="px-3 py-3 border border-gray-300 font-medium text-center bg-green-50">RATION(g)</th>
                                <th colSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-red-50">MORT %</th>
                                <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">OBSEVT</th>
                            </tr>
                            <tr>
                                <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50 text-[10px]">ACTUEL</th>
                                <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50 text-[10px]">GAIN</th>
                                <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50 text-[10px]">ECRT/GUID</th>
                                <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-green-50 text-[10px]">ACTUEL</th>
                                <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-green-50 text-[10px]">DIFF</th>
                                <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-green-50 text-[10px]">PROCH</th>
                                <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-red-50 text-[10px]">ACTUEL</th>
                                <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-red-50 text-[10px]">GUIDE</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {summaryDataForModal.length === 0 ? (
                                <tr>
                                    <td colSpan="14" className="p-4 text-center text-gray-500 italic">Chargement... ou aucune donnée</td>
                                </tr>
                            ) : (
                                summaryDataForModal.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-3 py-2 border border-gray-200 text-center font-semibold bg-blue-50">{row.parc}</td>
                                        <td className="px-3 py-2 border border-gray-200 text-center font-medium bg-blue-50">{row.age}</td>
                                        <td className="px-3 py-2 border border-gray-200 text-center font-mono">{row.effectif}</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.poids_actuel}</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs text-green-600">+{row.poids_gain}</td>
                                        <td className={`px-2 py-2 border border-gray-200 text-center font-mono text-xs ${isNaN(row.poids_actuel - row.guide) ? '' : (row.poids_actuel - row.guide) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {isNaN(row.poids_actuel - row.guide) ? '' : (row.poids_actuel - row.guide) > 0 ? `+${(row.poids_actuel - row.guide).toFixed(0)}` : (row.poids_actuel - row.guide).toFixed(0)}
                                        </td>
                                        <td className="px-3 py-2 border border-gray-200 text-center font-mono">{row.guide}</td>
                                        <td className="px-3 py-2 border border-gray-200 text-center font-mono">{row.homog_pct}%</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.ration_actuel}</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{parseFloat(row.ration_diff) > 0 ? `+${row.ration_diff}` : row.ration_diff}</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.ration_proch}</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs text-red-600 font-bold">{row.mort_pct}%</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs text-gray-500">{row.mort_guide}%</td>
                                        <td className="px-3 py-2 border border-gray-200 text-center text-xs">{row.obsevt}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Modal>

            {/* Bilan Modal */}
            <Modal
                isOpen={!!viewingBilan}
                onClose={() => setViewingBilan(null)}
                title={`Bilan Détaille - ${viewingBilan?.name || ''}`}
                size="xxl" // Assuming Modal supports sizes, or uses default
            >
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-[1800px] text-xs border-collapse border border-gray-300">
                        <thead className="bg-blue-200">
                            <tr>
                                <th rowSpan="2" className="border border-gray-400 p-2 min-w-[100px]">Date</th>
                                <th rowSpan="2" className="border border-gray-400 p-2 min-w-[60px]">Age</th>
                                <th colSpan={viewingBilan?.parcs + 2 || 6} className="border border-gray-400 p-2 bg-gray-100">Effectif</th>
                                <th colSpan={viewingBilan?.parcs + 1 || 5} className="border border-gray-400 p-2 bg-blue-100">POIDS(g) ACTUEL</th>
                                <th colSpan={viewingBilan?.parcs || 4} className="border border-gray-400 p-2 bg-green-100">Gain</th>
                                <th rowSpan="2" className="border border-gray-400 p-2 min-w-[60px]">GUIDE</th>
                                <th colSpan={viewingBilan?.parcs || 4} className="border border-gray-400 p-2 bg-yellow-100">Ecart/guide</th>
                                <th colSpan={viewingBilan?.parcs || 4} className="border border-gray-400 p-2 bg-gray-100">HOMOG %</th>
                            </tr>
                            <tr>
                                {/* Effectif Subheaders */}
                                {Array.from({ length: viewingBilan?.parcs || 0 }).map((_, i) => (
                                    <th key={`eff-p-${i}`} className="border border-gray-400 p-1">Parc {i + 1}</th>
                                ))}
                                <th className="border border-gray-400 p-1 font-bold">BATIMENT</th>
                                <th className="border border-gray-400 p-1">Effectif Rest</th>

                                {/* Poids Actuel Subheaders */}
                                {Array.from({ length: viewingBilan?.parcs || 0 }).map((_, i) => (
                                    <th key={`poids-p-${i}`} className="border border-gray-400 p-1">Parc {i + 1}</th>
                                ))}
                                <th className="border border-gray-400 p-1 font-bold">Moyenne</th>

                                {/* Gain Subheaders */}
                                {Array.from({ length: viewingBilan?.parcs || 0 }).map((_, i) => (
                                    <th key={`gain-p-${i}`} className="border border-gray-400 p-1 text-green-700">Parc {i + 1}</th>
                                ))}

                                {/* Ecart Subheaders */}
                                {Array.from({ length: viewingBilan?.parcs || 0 }).map((_, i) => (
                                    <th key={`ecart-p-${i}`} className="border border-gray-400 p-1">Parc {i + 1}</th>
                                ))}

                                {/* Homog Subheaders */}
                                {Array.from({ length: viewingBilan?.parcs || 0 }).map((_, i) => (
                                    <th key={`homog-p-${i}`} className="border border-gray-400 p-1">Parc {i + 1}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bilanData.length === 0 ? (
                                <tr>
                                    <td colSpan="100" className="p-8 text-center text-gray-500 italic font-sans">Aucune donnée disponible pour ce bâtiment</td>
                                </tr>
                            ) : (
                                bilanData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 text-center font-mono">
                                        <td className="border border-gray-300 p-2 font-medium bg-blue-50">{row.date}</td>
                                        <td className="border border-gray-300 p-2 bg-blue-50">{row.age}</td>

                                        {/* Effectif Data */}
                                        {row.parcs.map((p, i) => (
                                            <td key={`eff-d-${i}`} className="border border-gray-300 p-1">{p.effectif || '-'}</td>
                                        ))}
                                        <td className="border border-gray-300 p-1 font-bold bg-gray-50">{row.totalEffectif}</td>
                                        <td className="border border-gray-300 p-1 text-gray-400 italic"></td>

                                        {/* Poids Actuel Data */}
                                        {row.parcs.map((p, i) => (
                                            <td key={`poids-d-${i}`} className="border border-gray-300 p-1">{p.poids}</td>
                                        ))}
                                        <td className="border border-gray-300 p-1 font-bold bg-gray-50">{row.avgPoids}</td>

                                        {/* Gain Data */}
                                        {row.parcs.map((p, i) => (
                                            <td key={`gain-d-${i}`} className="border border-gray-300 p-1 text-green-600">{p.gain}</td>
                                        ))}

                                        <td className="border border-gray-300 p-1 font-medium bg-yellow-50">{row.guide}</td>

                                        {/* Ecart Data */}
                                        {row.parcs.map((p, i) => (
                                            <td key={`ecart-d-${i}`} className={`border border-gray-300 p-1 ${typeof p.ecart === 'number' ? (p.ecart >= 0 ? 'text-green-600' : 'text-red-500') : ''}`}>
                                                {typeof p.ecart === 'number' ? (p.ecart > 0 ? `+${p.ecart}` : p.ecart) : p.ecart}
                                            </td>
                                        ))}

                                        {/* Homog Data */}
                                        {row.parcs.map((p, i) => (
                                            <td key={`homog-d-${i}`} className="border border-gray-300 p-1">{p.homog}{p.homog !== '-' ? '%' : ''}</td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Modal>

            {/* Charts Modal - Global for Farm */}
            <Modal
                isOpen={isChartsOpen}
                onClose={() => setIsChartsOpen(false)}
                title={`Tableau de Bord Global - ${fermeInfo?.name || `Ferme ${fermeId}`}`}
                size="xxl"
            >
                <div className="bg-gray-50/50 -m-6 p-6 min-h-[600px]">
                    <div className="mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-sm text-gray-600">
                            Cette vue affiche les données agrégées pour tous les bâtiments et parcs de la <strong>{fermeInfo?.name || `Ferme ${fermeId}`}</strong>.
                        </p>
                    </div>
                    <ElevageCharts data={allFermeData} />
                </div>
            </Modal>
        </div>
    );
};

export default BatimentsView;
