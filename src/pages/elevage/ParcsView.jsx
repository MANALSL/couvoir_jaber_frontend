import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Grid3x3, ChevronRight, Plus, X, Trash2, History, RotateCcw, TrendingUp, List } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { elevageService } from '../../services/elevageService';
import { useAuth } from '../../context/AuthContext';
import ParkPerformanceChart from '../../components/charts/ParkPerformanceChart';
import ElevageCharts from '../../components/charts/ElevageCharts';

const ParcsView = () => {
    const navigate = useNavigate();
    const { fermeId, batimentId } = useParams();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [parcs, setParcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [allElevageData, setAllElevageData] = useState([]);
    const [deletedParcs, setDeletedParcs] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', lot: '' });
    const [openParkCurves, setOpenParkCurves] = useState([]);
    const [viewingHistory, setViewingHistory] = useState(null);
    const [archivedRecords, setArchivedRecords] = useState([]);
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [batimentInfo, setBatimentInfo] = useState(null);
    const [fermeInfo, setFermeInfo] = useState(null);

    useEffect(() => {
        const fetchParcs = async () => {
            try {
                setLoading(true);
                const data = await elevageService.getParcs(batimentId);
                setParcs(data);
            } catch (error) {
                console.error("Error fetching parcs:", error);
            } finally {
                setLoading(false);
            }
        };
        const fetchData = async () => {
            try {
                const data = await elevageService.getElevages();
                // Normalisation complète pour correspondre au JSX
                const normalized = data.map(d => ({
                    ...d,
                    fermeId: d.fermeId || d.ferme_id,
                    batimentId: d.batimentId || d.batiment_id,
                    parcId: d.parcId || d.parc_id,
                    deleted: d.deleted ?? d.is_deleted
                }));
                setAllElevageData(normalized);
            } catch (error) {
                console.error("Error fetching elevage data:", error);
            }
        };
        const fetchBatimentAndFerme = async () => {
            try {
                const [batiment, fermes] = await Promise.all([
                    elevageService.getBatiment(batimentId),
                    elevageService.getFermes()
                ]);
                setBatimentInfo(batiment);
                const ferme = fermes.find(f => f.id === parseInt(fermeId));
                setFermeInfo(ferme);
            } catch (error) {
                console.error("Error fetching batiment/ferme info:", error);
            }
        };
        fetchParcs();
        fetchData();
        fetchBatimentAndFerme();
    }, [batimentId, fermeId]);

    const toggleCurve = (e, parcId) => {
        e.stopPropagation();
        setOpenParkCurves(prev =>
            prev.includes(parcId)
                ? prev.filter(id => id !== parcId)
                : [...prev, parcId]
        );
    };

    const handleViewHistory = async (e, parc) => {
        e.stopPropagation();
        setViewingHistory(parc);
        try {
            const history = await elevageService.getArchivedElevages(parc.id);
            // Also include records from other lots that aren't officially "deleted"
            const allHistory = await elevageService.getElevages(parc.id);
            const otherLots = allHistory.filter(r => r.lot !== parc.lot);
            setArchivedRecords([...history, ...otherLots].sort((a, b) => new Date(b.date) - new Date(a.date)));
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    };

    // Generate exactly 5 parcs as requested

    const handleParcClick = (parcId) => {
        navigate(`/elevage/ferme/${fermeId}/batiment/${batimentId}/parc/${parcId}`);
    };

    const handleDeleteParc = async (e, parcId) => {
        e.stopPropagation();
        if (window.confirm('Voulez-vous vraiment supprimer ce parc ?')) {
            try {
                await elevageService.deleteParc(parcId);
                const parcToDelete = parcs.find(p => p.id === parcId);
                if (parcToDelete) {
                    setDeletedParcs(prev => [{
                        ...parcToDelete,
                        deletedAt: new Date().toLocaleString()
                    }, ...prev]);
                    setParcs(prev => prev.filter(p => p.id !== parcId));
                }
            } catch (error) {
                console.error("Error deleting parc:", error);
            }
        }
    };

    const handleRestoreParc = async (parcToRestore) => {
        try {
            await elevageService.restoreParc(parcToRestore.id);
            // eslint-disable-next-line no-unused-vars
            const { deletedAt, ...parc } = parcToRestore;
            setParcs(prev => [...prev, parc].sort((a, b) => a.id - b.id));
            setDeletedParcs(prev => prev.filter(p => p.id !== parc.id));
        } catch (error) {
            console.error("Error restoring parc:", error);
        }
    };

    const handleCreateParc = () => {
        setCreateForm({ name: '', lot: '' });
        setCreateModalOpen(true);
        setShowCreateMenu(false);
    };

    const handleSaveCreate = async (e) => {
        e.preventDefault();
        try {
            await elevageService.addParc({
                ...createForm,
                batiment_id: parseInt(batimentId)
            });
            // Refresh the list to show the new card immediately
            const updated = await elevageService.getParcs(batimentId);
            setParcs(updated);
            setCreateModalOpen(false);
            // navigate(`/elevage/ferme/${fermeId}/batiment/${batimentId}/parc/${newParc.id}`, { state: { openCreate: true } });
        } catch (error) {
            console.error("Error creating parc:", error);
        }
    };

    // Generate summary data for all parcs in this batiment
    // Generate summary data for all parcs in this batiment using real records
    const summaryData = useMemo(() => {
        return parcs.map(parc => {
            const parkRecords = allElevageData
                .filter(d => String(d.parcId) === String(parc.id))
                // Only show records matching the parc's current lot for accuracy in summary
                .filter(d => !parc.lot || d.lot === parc.lot)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            const latest = parkRecords[0] || {};
            const prev = parkRecords[1] || {};

            return {
                batiment: batimentId,
                parc: parc.id,
                effectif: (parseFloat(latest.effectif_poule) || 0) + (parseFloat(latest.effectif_coq) || 0) || '-',
                poids_precedent: prev.poids_poule || '-',
                poids_actuel: latest.poids_poule || '-',
                poids_gain: (latest.poids_poule && prev.poids_poule) ? (parseFloat(latest.poids_poule) - parseFloat(prev.poids_poule)).toFixed(0) : '-',
                guide: latest.poids_guide || '-',
                homog_pct: latest.homog_pct || '-',
                ration_actuel: latest.aliment_poule || '-',
                ration_diff: (latest.aliment_poule && prev.aliment_poule) ? (parseFloat(latest.aliment_poule) - parseFloat(prev.aliment_poule)).toFixed(1) : '-',
                ration_proch: '-',
                mort_pct: latest.mort_poule_pct || '-',
                obsevt: latest.observation || ''
            };
        });
    }, [parcs, allElevageData]);

    return (
        <div className="space-y-6">
            <Breadcrumb
                items={[
                    { label: fermeInfo?.name || `Ferme ${fermeId}`, link: `/elevage` },
                    { label: batimentInfo?.name || `Bâtiment ${batimentId}`, link: `/elevage/ferme/${fermeId}` }
                ]}
            />

            {/* View Toggle & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        {fermeInfo?.name || `Ferme ${fermeId}`} - {batimentInfo?.name || `Bâtiment ${batimentId}`}
                    </h1>
                    <p className="text-sm text-gray-500">Vue d'ensemble des parcs de ce bâtiment</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-gray-100 p-1 rounded-lg flex items-center mr-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Vue Grille"
                        >
                            <Grid3x3 size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Vue Liste"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    {isAdmin && (
                        <Button
                            variant="secondary"
                            onClick={() => setShowHistory(true)}
                            className="flex items-center gap-2"
                        >
                            <History size={18} />
                            <span className="hidden sm:inline">Historique</span>
                        </Button>
                    )}

                    <Button
                        variant="secondary"
                        onClick={() => setShowSummary(!showSummary)}
                        className="flex items-center gap-2"
                    >
                        <TrendingUp size={18} />
                        <span className="hidden sm:inline">{showSummary ? 'Masquer' : 'Tableau de Bord'}</span>
                    </Button>

                    <Button
                        onClick={handleCreateParc}
                        className="flex items-center gap-2"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Nouveau Parc</span>
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    {viewMode === 'grid' ? 'Cartes des Parcs' : 'Liste des Parcs'}
                </h2>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                        <p className="text-gray-500 mt-4 text-sm">Chargement des parcs...</p>
                    </div>
                ) : parcs.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <Grid3x3 size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Aucun parc trouvé</h3>
                        <p className="text-gray-500 mt-1">Commencez par créer votre premier parc dans ce bâtiment.</p>
                        <Button onClick={handleCreateParc} className="mt-6 mx-auto">
                            <Plus size={18} className="mr-2" />
                            Créer un Parc
                        </Button>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* GRID VIEW */
                    <div className={`grid grid-cols-1 gap-4 sm:gap-6 transition-all duration-500 ${openParkCurves.length > 0 ? 'lg:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}`}>
                        {parcs.map((parc) => {
                            const isCurveVisible = openParkCurves.includes(parc.id);
                            const parkData = allElevageData.filter(d =>
                                String(d.parcId) === String(parc.id) &&
                                !d.deleted
                            );

                            return (
                                <Card
                                    key={parc.id}
                                    className={`group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-purple-500 overflow-hidden ${isCurveVisible ? 'ring-2 ring-indigo-500/20 shadow-lg' : ''}`}
                                    onClick={() => handleParcClick(parc.id)}
                                >
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow text-white">
                                                <Grid3x3 size={28} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => toggleCurve(e, parc.id)}
                                                    className={`p-2 rounded-lg transition-all ${isCurveVisible ? 'bg-indigo-600 text-white shadow-inner' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                                    title={isCurveVisible ? "Masquer la courbe" : "Voir la courbe"}
                                                >
                                                    <TrendingUp size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleViewHistory(e, parc)}
                                                    className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-all"
                                                    title="Historique du Parc"
                                                >
                                                    <History size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteParc(e, parc.id)}
                                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <ChevronRight
                                                    size={24}
                                                    className="text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">
                                            {parc.name}
                                        </h3>

                                        <div className="space-y-4 mb-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Lot d'identification</span>
                                                <p className="text-sm font-medium text-gray-600 truncate">{parc.lot}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Effectif</span>
                                                    <span className="text-lg font-black text-gray-900">
                                                        {(() => {
                                                            const latest = allElevageData
                                                                .filter(d => String(d.parcId) === String(parc.id))
                                                                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                                            return latest ? (parseFloat(latest.effectif_poule) || 0) + (parseFloat(latest.effectif_coq) || 0) : '-';
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Âge</span>
                                                    <span className="text-lg font-black text-gray-900">
                                                        {(() => {
                                                            const latest = allElevageData
                                                                .filter(d => String(d.parcId) === String(parc.id))
                                                                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                                            return latest ? latest.age : '-';
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {isCurveVisible && (
                                            <div className="pt-6 border-t border-gray-100 animate-slideDown" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-indigo-100 rounded-md flex items-center justify-center">
                                                            <TrendingUp size={14} className="text-indigo-600" />
                                                        </div>
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Performance détaillée</h4>
                                                    </div>
                                                </div>
                                                <div className="bg-white rounded-xl border border-gray-100 p-2 shadow-inner h-[260px]">
                                                    {parkData.length > 0 ? (
                                                        <ParkPerformanceChart data={parkData} height={240} />
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                                                <TrendingUp size={24} className="text-gray-200" />
                                                            </div>
                                                            <p className="text-xs text-gray-400 italic">Aucune donnée historique trouvée</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    /* LIST VIEW */
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-gray-900">Nom du Parc</th>
                                    <th className="px-6 py-4 font-bold text-gray-900">Lot</th>
                                    <th className="px-6 py-4 font-bold text-center text-gray-900">Effectif</th>
                                    <th className="px-6 py-4 font-bold text-center text-gray-900">Âge</th>
                                    <th className="px-6 py-4 font-bold text-center text-gray-900">Performance</th>
                                    <th className="px-6 py-4 font-bold text-right text-gray-900">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {parcs.map((parc) => {
                                    const latest = allElevageData
                                        .filter(d => String(d.parcId) === String(parc.id))
                                        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

                                    const effectif = latest ? (parseFloat(latest.effectif_poule) || 0) + (parseFloat(latest.effectif_coq) || 0) : '-';
                                    const age = latest ? latest.age : '-';

                                    return (
                                        <tr
                                            key={parc.id}
                                            className="hover:bg-purple-50/50 transition-colors cursor-pointer group"
                                            onClick={() => handleParcClick(parc.id)}
                                        >
                                            <td className="px-6 py-4 font-bold text-gray-900 group-hover:text-purple-700">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                                                        <Grid3x3 size={16} />
                                                    </div>
                                                    {parc.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono font-medium">
                                                    {parc.lot}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-gray-900">{effectif}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                                                    {age}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {/* Mini sparkline or status could go here */}
                                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '75%' }}></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={(e) => handleViewHistory(e, parc)}
                                                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                        title="Historique"
                                                    >
                                                        <History size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteParc(e, parc.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                    <button
                                                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                                        onClick={() => handleParcClick(parc.id)}
                                                    >
                                                        Ouvrir
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <Card className="w-full max-w-md shadow-2xl relative">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Nouveau Parc</h3>
                                <button
                                    onClick={() => setCreateModalOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Nom du Parc</label>
                                    <input
                                        type="text"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                        placeholder="Ex: Parc 6"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Lot</label>
                                    <input
                                        type="text"
                                        value={createForm.lot}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, lot: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                                        placeholder="Ex: LOT-001-P6"
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
                        <h2 className="text-lg font-semibold text-gray-900">Tableau de bord - Parcs du {batimentInfo?.name || `Bâtiment ${batimentId}`}</h2>
                        <p className="text-sm text-gray-500">Données consolidées pour tous les parcs</p>
                    </div>
                    {/* Charts Section */}
                    <div className="p-4 border-b border-gray-100">
                        <ElevageCharts data={allElevageData.filter(d => parcs.some(p => String(p.id) === String(d.parcId)))} />
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm border-collapse">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-blue-50">BAT</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-blue-50">PARKS</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">EFFECTIF</th>
                                    <th colSpan="4" className="px-3 py-3 border border-gray-300 font-medium text-center bg-yellow-50">POIDS(g)</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">Guide</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">HOMOG %</th>
                                    <th colSpan="3" className="px-3 py-3 border border-gray-300 font-medium text-center bg-green-50">RATION(g)</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-red-50">MORT %</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">OBSEVT</th>
                                </tr>
                                <tr>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50 text-[10px]">PRECEDENT</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50 text-[10px]">ACTUEL</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50 text-[10px]">GAIN</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50 text-[10px]">ECRT/GUID</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-green-50 text-[10px]">ACTUEL</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-green-50 text-[10px]">DIFF</th>
                                    <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-green-50 text-[10px]">PROCH</th>
                                </tr>
                            </thead >
                            <tbody className="divide-y divide-gray-100">
                                {summaryData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        {idx === 0 && (
                                            <td
                                                rowSpan={summaryData.length}
                                                className="px-3 py-2 border border-gray-300 text-center font-bold text-xl bg-white align-middle text-gray-800 shadow-sm"
                                            >
                                                {row.batiment}
                                            </td>
                                        )}
                                        <td className="px-3 py-2 border border-gray-200 text-center font-semibold bg-blue-50">{row.parc}</td>
                                        <td className="px-3 py-2 border border-gray-200 text-center font-mono">{row.effectif}</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.poids_precedent}</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.poids_actuel}</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs text-green-600">+{row.poids_gain}</td>

                                        {/* ECRT/GUID : Diff between Actuel and Guide */}
                                        <td className={`px-2 py-2 border border-gray-200 text-center font-mono text-xs ${(row.poids_actuel - row.guide) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {(row.poids_actuel - row.guide) > 0 ? `+${row.poids_actuel - row.guide}` : (row.poids_actuel - row.guide)}
                                        </td>

                                        {/* Guide */}
                                        <td className="px-3 py-2 border border-gray-200 text-center font-mono">{row.guide}</td>

                                        <td className="px-3 py-2 border border-gray-200 text-center font-mono">{row.homog_pct}%</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.ration_actuel}</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.ration_diff > 0 ? `+${row.ration_diff}` : row.ration_diff}</td>
                                        <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.ration_proch}</td>
                                        <td className="px-3 py-2 border border-gray-200 text-center font-mono text-red-600">{row.mort_pct}%</td>
                                        <td className="px-3 py-2 border border-gray-200 text-center text-xs">{row.obsevt}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table >
                    </div >
                </Card >
            )}

            {/* History Modal */}
            <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Historique des suppressions">
                {deletedParcs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        Aucune suppression récente.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {deletedParcs.map((parc, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div>
                                    <h4 className="font-medium text-gray-900">{parc.name}</h4>
                                    <div className="text-sm text-gray-500">Lot: {parc.lot}</div>
                                    <div className="text-xs text-gray-400 mt-1">Supprimé le {parc.deletedAt}</div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRestoreParc(parc)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                    <RotateCcw size={16} className="mr-2" />
                                    Restaurer
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            {/* Records History Modal */}
            <Modal
                isOpen={!!viewingHistory}
                onClose={() => setViewingHistory(null)}
                title={`Historique des Fiches - ${viewingHistory?.name}`}
                size="xl"
            >
                <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                        Cette vue affiche tous les enregistrements archivés ou appartenant à d'anciens lots pour ce parc.
                    </div>
                    {archivedRecords.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 italic">
                            Aucun historique trouvé pour ce parc.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-600 uppercase">
                                    <tr>
                                        <th className="px-3 py-2 border">Date</th>
                                        <th className="px-3 py-2 border">Lot</th>
                                        <th className="px-3 py-2 border">Âge</th>
                                        <th className="px-3 py-2 border">Eff. Total</th>
                                        <th className="px-3 py-2 border">Mort.</th>
                                        <th className="px-3 py-2 border">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {archivedRecords.map((rec) => (
                                        <tr key={rec.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 border font-medium">{rec.date}</td>
                                            <td className="px-3 py-2 border font-bold text-blue-700">{rec.lot}</td>
                                            <td className="px-3 py-2 border">{rec.age}</td>
                                            <td className="px-3 py-2 border">{rec.effectif_poule + rec.effectif_coq}</td>
                                            <td className="px-3 py-2 border text-red-600">{rec.mort_poule_n + rec.mort_coq_n}</td>
                                            <td className="px-3 py-2 border">
                                                {isAdmin && (
                                                    <button
                                                        onClick={async () => {
                                                            await elevageService.restoreElevage(rec.id);
                                                            handleViewHistory({ stopPropagation: () => { } }, viewingHistory);
                                                        }}
                                                        className="text-emerald-600 hover:underline font-bold"
                                                    >
                                                        Restaurer
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>
        </div >
    );
};

export default ParcsView;
