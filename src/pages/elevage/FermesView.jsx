import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Building2, ChevronRight, Plus, Home, Building, Grid3x3, Edit2, X, Trash2, History, RotateCcw, Warehouse, BarChart3 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ElevageCharts from '../../components/charts/ElevageCharts';
import { elevageService } from '../../services/elevageService';
import { useAuth } from '../../context/AuthContext';

const FermesView = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const [editingFerme, setEditingFerme] = useState(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [isChartsOpen, setIsChartsOpen] = useState(false);
    const [allData, setAllData] = useState([]);
    const [createForm, setCreateForm] = useState({ name: '', lot: '' });
    const [editForm, setEditForm] = useState({ name: '', lot: '' });
    const [showSummary, setShowSummary] = useState(false);

    // History state
    const [showHistory, setShowHistory] = useState(false);
    const [deletedFermes, setDeletedFermes] = useState([]);

    const [fermes, setFermes] = useState([]);

    // Link real data to the building summary overview
    const summaryData = useMemo(() => {
        if (!allData || allData.length === 0 || !fermes || fermes.length === 0) {
            return [];
        }

        return fermes.flatMap(ferme => {
            const batimentsList = ferme.batiments || [];

            if (batimentsList.length === 0) {
                // Fallback if no batiments (or not loaded), though we can't do much without IDs
                return [];
            }

            return batimentsList.map(bat => {
                // Get parcs for this building
                const parcsList = bat.parcs || [];

                // Collect latest data for each parc
                const buildingParcsData = parcsList.map(p => {
                    const parcRecords = allData
                        .filter(d => String(d.parcId || d.parc_id) === String(p.id))
                        .sort((a, b) => new Date(b.date) - new Date(a.date));

                    if (parcRecords.length > 0) {
                        return {
                            latest: parcRecords[0],
                            prev: parcRecords[1] || {}
                        };
                    }
                    return null;
                }).filter(Boolean); // Remove nulls

                if (buildingParcsData.length === 0) {
                    return {
                        ferme: ferme.name,
                        batiment: bat.name,
                        age: '-', effectif: '-', poids_actuel: '-',
                        poids_gain: '-', guide: '-', homog_pct: '-', ration_guide: '-',
                        ration_actuel: '-', ration_diff: '-', ration_proch: '-', mort_pct: '-', obsevt: ''
                    };
                }

                // Aggregate
                const totalEff = buildingParcsData.reduce((sum, d) => sum + (parseFloat(d.latest.effectif_poule) || 0) + (parseFloat(d.latest.effectif_coq) || 0), 0);
                const totalMortN = buildingParcsData.reduce((sum, d) => sum + (parseFloat(d.latest.mort_poule_n) || 0) + (parseFloat(d.latest.mort_coq_n) || 0), 0);

                const avgPoids = buildingParcsData.reduce((sum, d) => sum + (parseFloat(d.latest.poids_poule) || 0), 0) / buildingParcsData.length;
                const prevAvgPoids = buildingParcsData.reduce((sum, d) => sum + (parseFloat(d.prev.poids_poule) || 0), 0) / buildingParcsData.length;

                const avgHomog = buildingParcsData.reduce((sum, d) => sum + (parseFloat(d.latest.homog_pct) || 0), 0) / buildingParcsData.length;
                const totalAliment = buildingParcsData.reduce((sum, d) => sum + (parseFloat(d.latest.aliment_poule) || 0), 0);
                const prevTotalAliment = buildingParcsData.reduce((sum, d) => sum + (parseFloat(d.prev.aliment_poule) || 0), 0);

                const gain = (avgPoids > 0 && prevAvgPoids > 0) ? (avgPoids - prevAvgPoids).toFixed(0) : '-';
                const mortPct = totalEff > 0 ? ((totalMortN / totalEff) * 100).toFixed(1) : '-';

                return {
                    ferme: ferme.name,
                    batiment: bat.name,
                    age: buildingParcsData[0].latest.age || '-',
                    effectif: totalEff || '-',
                    poids_actuel: avgPoids > 0 ? avgPoids.toFixed(0) : '-',
                    poids_gain: gain,
                    guide: buildingParcsData[0].latest.poids_guide || '-',
                    homog_pct: avgHomog > 0 ? avgHomog.toFixed(1) : '-',
                    ration_guide: '-',
                    ration_actuel: totalAliment > 0 ? totalAliment.toFixed(1) : '-',
                    ration_diff: (totalAliment > 0 && prevTotalAliment > 0) ? (totalAliment - prevTotalAliment).toFixed(1) : '-',
                    ration_proch: '-',
                    mort_pct: mortPct,
                    obsevt: buildingParcsData.find(d => d.latest.observation)?.latest.observation || ''
                };
            });
        });
    }, [fermes, allData]);

    const handleFermeClick = (fermeId) => {
        navigate(`/elevage/ferme/${fermeId}`);
    };

    useEffect(() => {
        const fetchFermes = async () => {
            try {
                const data = await elevageService.getFermes();
                setFermes(data);
            } catch (error) {
                console.error("Error fetching fermes:", error);
            }
        };
        const fetchAllData = async () => {
            const data = await elevageService.getElevages();
            setAllData(data.filter(item => !(item.deleted || item.is_deleted)));
        };
        fetchFermes();
        fetchAllData();
    }, []);

    const handleEditClick = (e, ferme) => {
        e.stopPropagation();
        setEditingFerme(ferme);
        setEditForm({ name: ferme.name, lot: ferme.lot });
    };

    const handleDeleteFerme = async (e, fermeId) => {
        e.stopPropagation();
        if (window.confirm('Voulez-vous vraiment supprimer cette ferme ?')) {
            try {
                await elevageService.deleteFerme(fermeId);
                const fermeToDelete = fermes.find(f => f.id === fermeId);
                if (fermeToDelete) {
                    setDeletedFermes(prev => [{
                        ...fermeToDelete,
                        deletedAt: new Date().toLocaleString()
                    }, ...prev]);
                    setFermes(prev => prev.filter(f => f.id !== fermeId));
                }
            } catch (error) {
                console.error("Error deleting ferme:", error);
                alert("Erreur lors de la suppression de la ferme");
            }
        }
    };

    const handleRestoreFerme = (fermeToRestore) => {
        // eslint-disable-next-line no-unused-vars
        const { deletedAt, ...ferme } = fermeToRestore;
        setFermes(prev => [...prev, ferme].sort((a, b) => a.id - b.id));
        setDeletedFermes(prev => prev.filter(f => f.id !== ferme.id));
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            const updated = await elevageService.updateFerme(editingFerme.id, editForm);
            setFermes(prev => prev.map(f => f.id === editingFerme.id ? updated : f));
            setEditingFerme(null);
        } catch (error) {
            console.error("Error updating ferme:", error);
            alert("Erreur lors de la mise à jour");
        }
    };

    const handleCreateFerme = () => {
        setCreateForm({ name: '', lot: '' });
        setCreateModalOpen(true);
        setShowCreateMenu(false);
    };

    const handleSaveCreate = async (e) => {
        e.preventDefault();
        try {
            const newFerme = await elevageService.addFerme(createForm);
            setFermes([...fermes, newFerme]);
            setCreateModalOpen(false);
        } catch (error) {
            console.error("Error creating ferme:", error);
            alert("Erreur lors de la création");
        }
    };

    const handleCreateBatiment = () => {
        alert('Créer un nouveau Bâtiment');
        setShowCreateMenu(false);
    };

    const handleCreateParc = () => {
        alert('Créer un nouveau Parc');
        setShowCreateMenu(false);
    };

    return (
        <div className="space-y-6 relative max-w-full overflow-hidden">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Gestion Élevage</h1>
                        <p className="text-sm text-gray-500">Sélectionnez une ferme pour continuer</p>
                    </div>
                    {isAdmin && (
                        <Button
                            onClick={handleCreateFerme}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-2 w-full sm:w-auto justify-center"
                        >
                            <Plus size={20} />
                            Ajouter une Ferme
                        </Button>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 overflow-x-auto pb-2">
                    {isAdmin && (
                        <Button
                            variant="secondary"
                            onClick={() => setShowHistory(true)}
                            className="flex items-center gap-2 justify-center whitespace-nowrap"
                        >
                            <History size={20} />
                            Historique
                        </Button>
                    )}

                    <Button
                        variant="secondary"
                        onClick={() => setIsChartsOpen(true)}
                        className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-2 justify-center whitespace-nowrap"
                    >
                        <BarChart3 size={20} />
                        Dashboard Global
                    </Button>

                    {/* Global Summary Badge for Batiments - Clickable to show summary */}
                    <div
                        onClick={() => setShowSummary(!showSummary)}
                        className={`border px-4 py-2 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-300 whitespace-nowrap ${showSummary
                            ? 'bg-blue-600 border-blue-700 text-white shadow-inner scale-[0.98]'
                            : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 shadow-sm hover:shadow-md'
                            }`}
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm transition-colors flex-shrink-0 ${showSummary ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'
                            }`}>
                            <Grid3x3 size={20} />
                        </div>
                        <div>
                            <div className={`text-[10px] uppercase tracking-wider font-bold ${showSummary ? 'text-blue-100' : 'text-blue-600'
                                }`}>Total Bâtiments</div>
                            <div className={`text-xl font-black leading-none ${showSummary ? 'text-white' : 'text-blue-900'
                                }`}>
                                {fermes.reduce((sum, f) => sum + (Number(f.batiment_count) || 0), 0)}
                            </div>
                        </div>
                    </div>


                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                {fermes.length > 0 ? (
                    fermes.map((ferme) => (
                        <Card
                            key={ferme.id}
                            className="group cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-blue-500"
                            onClick={() => handleFermeClick(ferme.id)}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                                        <Building2 size={28} className="text-white" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleEditClick(e, ferme)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            title="Modifier"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        {isAdmin && (
                                            <button
                                                onClick={(e) => handleDeleteFerme(e, ferme.id)}
                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        <ChevronRight
                                            size={24}
                                            className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
                                        />
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                    {ferme.name}
                                </h3>

                                <p className="text-sm text-gray-600 mb-3">
                                    <span className="font-medium">Lot:</span> {ferme.lot}
                                </p>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <span className="text-xs text-gray-500">Bâtiments</span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {ferme.batiment_count || 0}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Warehouse size={64} className="text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-800">Aucune ferme disponible</h3>
                        <p className="text-gray-500 mb-6">Commencez par ajouter votre première exploitation.</p>
                        {isAdmin && (
                            <Button onClick={handleCreateFerme} className="flex items-center gap-2">
                                <Plus size={20} />
                                Créer une Ferme
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Global Summary Table */}
            {showSummary && (
                <Card className="animate-fadeIn">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900">Vue d'ensemble - Tous les Bâtiments</h2>
                        <p className="text-sm text-gray-500">Informations globales pour tous les bâtiments de toutes les fermes</p>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm border-collapse">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-blue-50">FERME</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-blue-50">BAT</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-blue-50">AGE</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">EFFECTIF</th>
                                    <th colSpan="3" className="px-3 py-3 border border-gray-300 font-medium text-center bg-yellow-50">POIDS(g)</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">Guide</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center">HOMOG %</th>
                                    <th colSpan="4" className="px-3 py-3 border border-gray-300 font-medium text-center bg-green-50">RATION(g)</th>
                                    <th rowSpan="2" className="px-3 py-3 border border-gray-300 font-medium text-center bg-red-50">MORT %</th>
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {summaryData.map((row, idx) => {
                                    const isFermeFirst = idx === 0 || row.ferme !== summaryData[idx - 1].ferme;
                                    let rowSpan = 1;
                                    if (isFermeFirst) {
                                        let i = idx + 1;
                                        while (i < summaryData.length && summaryData[i].ferme === row.ferme) {
                                            rowSpan++;
                                            i++;
                                        }
                                    }

                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            {isFermeFirst && (
                                                <td
                                                    rowSpan={rowSpan}
                                                    className="px-3 py-2 border border-gray-300 text-center font-bold text-xl bg-white align-middle text-gray-800 shadow-sm"
                                                >
                                                    {row.ferme}
                                                </td>
                                            )}
                                            <td className="px-3 py-2 border border-gray-200 text-center font-semibold bg-blue-50">{row.batiment}</td>
                                            <td className="px-3 py-2 border border-gray-200 text-center font-medium bg-blue-50">{row.age}</td>
                                            <td className="px-3 py-2 border border-gray-200 text-center font-mono">{row.effectif}</td>
                                            <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.poids_actuel}</td>
                                            <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs text-green-600">+{row.poids_gain}</td>

                                            {/* ECRT/GUID : Diff between Actuel and Guide */}
                                            <td className={`px-2 py-2 border border-gray-200 text-center font-mono text-xs ${isNaN(row.poids_actuel - row.guide) ? '' : (row.poids_actuel - row.guide) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {isNaN(row.poids_actuel - row.guide) ? '' : (row.poids_actuel - row.guide) > 0 ? `+${row.poids_actuel - row.guide}` : (row.poids_actuel - row.guide)}
                                            </td>

                                            {/* Guide */}
                                            <td className="px-3 py-2 border border-gray-200 text-center font-mono">{row.guide}</td>

                                            <td className="px-3 py-2 border border-gray-200 text-center font-mono">{row.homog_pct}%</td>
                                            <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs text-gray-500 italic">{row.ration_guide}</td>
                                            <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.ration_actuel}</td>
                                            <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.ration_diff > 0 ? `+${row.ration_diff}` : row.ration_diff}</td>
                                            <td className="px-2 py-2 border border-gray-200 text-center font-mono text-xs">{row.ration_proch}</td>
                                            <td className="px-3 py-2 border border-gray-200 text-center font-mono text-red-600">{row.mort_pct}%</td>
                                            <td className="px-3 py-2 border border-gray-200 text-center text-xs">{row.obsevt}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Edit Modal */}
            {editingFerme && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <Card className="w-full max-w-md shadow-2xl relative">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Modifier la Ferme</h3>
                                <button
                                    onClick={() => setEditingFerme(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Nom de la Ferme</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Ex: Ferme 1"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Lot</label>
                                    <input
                                        type="text"
                                        value={editForm.lot}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, lot: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Ex: LOT-001"
                                        required
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setEditingFerme(null)}
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
                                <h3 className="text-xl font-bold text-gray-900">Nouvelle Ferme</h3>
                                <button
                                    onClick={() => setCreateModalOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Nom de la Ferme</label>
                                    <input
                                        type="text"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Ex: Ferme 11"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Lot</label>
                                    <input
                                        type="text"
                                        value={createForm.lot}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, lot: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Ex: LOT-011"
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

            {/* History Modal */}
            <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Historique des suppressions">
                {deletedFermes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        Aucune suppression récente.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {deletedFermes.map((ferme, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div>
                                    <h4 className="font-medium text-gray-900">{ferme.name}</h4>
                                    <div className="text-sm text-gray-500">Lot: {ferme.lot}</div>
                                    <div className="text-xs text-gray-400 mt-1">Supprimé le {ferme.deletedAt}</div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRestoreFerme(ferme)}
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

            {/* Global Charts Modal */}
            <Modal
                isOpen={isChartsOpen}
                onClose={() => setIsChartsOpen(false)}
                title="Tableau de Bord Global - Gestion Élevage"
                size="xxl"
            >
                <div className="bg-gray-50/50 -m-6 p-6 min-h-[600px]">
                    <div className="mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-sm text-gray-600">
                            Cette vue agrège les données de performance de <strong>toutes les fermes, tous les bâtiments et tous les parcs</strong>.
                        </p>
                    </div>
                    <ElevageCharts data={allData} />
                </div>
            </Modal>
        </div>
    );
};

export default FermesView;
