import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, ChevronLeft, Egg, Save, X, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { productionService } from '../../services/productionService';
import { useAuth } from '../../context/AuthContext';

// Triage columns matching the Excel
const TRIAGE_FIELDS = [
    { key: 'oeufs_deformes', label: 'ŒUFS Déformés', bg: 'bg-red-50', header: true },
    { key: 'oeufs_casses_remballe', label: 'ŒUFS cassés — remballe', bg: 'bg-orange-50', header: false },
    { key: 'oeufs_casses_pele', label: 'ŒUFS cassés — pèle', bg: 'bg-orange-50', header: false },
    { key: 'doubles_jaunes', label: 'Doubles jaunes', bg: 'bg-yellow-50', header: false },
    { key: 'petits_oeufs', label: 'PETITS ŒUFS', bg: 'bg-yellow-50', header: false },
    { key: 'oeufs_pondoirs_sales', label: 'ŒUFS PONDOIRS SALES', bg: 'bg-amber-50', header: false },
    { key: 'oeufs_sales_declares', label: 'SALES OAC / déclarés', bg: 'bg-amber-50', header: false },
    { key: 'oeufs_pondoirs_propres', label: 'Oeufs pondoirs propres', bg: 'bg-green-50', header: false },
    { key: 'oeufs_sals_propres', label: 'Oeufs sals propres', bg: 'bg-green-50', header: false },
    { key: 'def_oac', label: 'défaut OAC', bg: 'bg-gray-50', header: false },
    { key: 'qac', label: 'QAC', bg: 'bg-blue-50', header: false },
    { key: 'noac', label: 'NOAC', bg: 'bg-purple-50', header: false },
];

const defaultForm = () => ({
    date: new Date().toISOString().split('T')[0],
    lot: '',
    nombre_pondeurs: '',
    p_guide: '',
    oeufs_deformes_n: 0, oeufs_deformes_pct: 0,
    oeufs_casses_remballe_n: 0, oeufs_casses_remballe_pct: 0,
    oeufs_casses_pele_n: 0, oeufs_casses_pele_pct: 0,
    doubles_jaunes_n: 0, doubles_jaunes_pct: 0,
    petits_oeufs_n: 0, petits_oeufs_pct: 0,
    oeufs_pondoirs_sales_n: 0, oeufs_pondoirs_sales_pct: 0,
    oeufs_sales_declares_n: 0, oeufs_sales_declares_pct: 0,
    oeufs_pondoirs_propres_n: 0, oeufs_pondoirs_propres_pct: 0,
    oeufs_sals_propres_n: 0, oeufs_sals_propres_pct: 0,
    def_oac_n: 0, def_oac_pct: 0,
    qac_n: 0, qac_pct: 0,
    noac_n: 0, noac_pct: 0, noac_p_guide: 0,
    observation: '',
});

const fmt = (v, decimals = 2) => {
    if (v === null || v === undefined || v === '') return '—';
    const n = parseFloat(v);
    if (isNaN(n)) return '—';
    return decimals === 0 ? n.toLocaleString('fr-FR') : n.toFixed(decimals);
};

const ProductionTable = () => {
    const { fermeId, batimentId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [records, setRecords] = useState([]);
    const [parcs, setParcs] = useState([]);
    const [selectedParcId, setSelectedParcId] = useState(null);
    const [batimentInfo, setBatimentInfo] = useState(null);
    const [fermeInfo, setFermeInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(defaultForm());
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const loadData = async (parcId) => {
        setLoading(true);
        try {
            const data = await productionService.getRecords(parcId ? { parc_id: parcId } : { batiment_id: batimentId });
            setRecords(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const [ps, bat, fermes] = await Promise.all([
                    productionService.getParcs(batimentId),
                    productionService.getBatiment(batimentId),
                    productionService.getFermes(),
                ]);
                setParcs(ps);
                setBatimentInfo(bat);
                setFermeInfo(fermes.find(f => f.id === parseInt(fermeId)));
                if (ps.length > 0) {
                    setSelectedParcId(ps[0].id);
                    await loadData(ps[0].id);
                } else {
                    setLoading(false);
                }
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };
        init();
    }, [batimentId, fermeId]);

    const handleParcChange = async (parcId) => {
        setSelectedParcId(parcId);
        await loadData(parcId);
    };

    const openCreate = () => {
        setEditingItem(null);
        setForm(defaultForm());
        setIsFormOpen(true);
    };

    const openEdit = (rec) => {
        setEditingItem(rec);
        setForm({
            date: rec.date,
            lot: rec.lot || '',
            nombre_pondeurs: rec.nombre_pondeurs || '',
            p_guide: rec.p_guide || '',
            oeufs_deformes_n: rec.oeufs_deformes_n || 0,
            oeufs_deformes_pct: rec.oeufs_deformes_pct || 0,
            oeufs_casses_remballe_n: rec.oeufs_casses_remballe_n || 0,
            oeufs_casses_remballe_pct: rec.oeufs_casses_remballe_pct || 0,
            oeufs_casses_pele_n: rec.oeufs_casses_pele_n || 0,
            oeufs_casses_pele_pct: rec.oeufs_casses_pele_pct || 0,
            doubles_jaunes_n: rec.doubles_jaunes_n || 0,
            doubles_jaunes_pct: rec.doubles_jaunes_pct || 0,
            petits_oeufs_n: rec.petits_oeufs_n || 0,
            petits_oeufs_pct: rec.petits_oeufs_pct || 0,
            oeufs_pondoirs_sales_n: rec.oeufs_pondoirs_sales_n || 0,
            oeufs_pondoirs_sales_pct: rec.oeufs_pondoirs_sales_pct || 0,
            oeufs_sales_declares_n: rec.oeufs_sales_declares_n || 0,
            oeufs_sales_declares_pct: rec.oeufs_sales_declares_pct || 0,
            oeufs_pondoirs_propres_n: rec.oeufs_pondoirs_propres_n || 0,
            oeufs_pondoirs_propres_pct: rec.oeufs_pondoirs_propres_pct || 0,
            oeufs_sals_propres_n: rec.oeufs_sals_propres_n || 0,
            oeufs_sals_propres_pct: rec.oeufs_sals_propres_pct || 0,
            def_oac_n: rec.def_oac_n || 0,
            def_oac_pct: rec.def_oac_pct || 0,
            qac_n: rec.qac_n || 0,
            qac_pct: rec.qac_pct || 0,
            noac_n: rec.noac_n || 0,
            noac_pct: rec.noac_pct || 0,
            noac_p_guide: rec.noac_p_guide || 0,
            observation: rec.observation || '',
        });
        setIsFormOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedParcId) return alert('Veuillez sélectionner un parc');
        setSaving(true);
        try {
            const payload = { ...form, parc_id: selectedParcId };
            // Convert strings to numbers
            Object.keys(payload).forEach(k => {
                if (k !== 'date' && k !== 'lot' && k !== 'observation' && k !== 'parc_id') {
                    payload[k] = parseFloat(payload[k]) || 0;
                }
            });
            if (editingItem) {
                const updated = await productionService.updateRecord(editingItem.id, payload);
                setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
            } else {
                const created = await productionService.createRecord(payload);
                setRecords(prev => [created, ...prev]);
            }
            setIsFormOpen(false);
        } catch (err) {
            console.error(err);
            alert('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await productionService.deleteRecord(deleteTarget.id);
            setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
        } catch (e) {
            console.error(e);
        } finally {
            setDeleteTarget(null);
        }
    };

    const filteredRecords = useMemo(() =>
        records.filter(r =>
            !search || r.date?.includes(search) || (r.lot || '').toLowerCase().includes(search.toLowerCase())
        ), [records, search]);

    const setF = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    return (
        <div className="space-y-6">
            <Breadcrumb items={[
                { label: fermeInfo?.name || `Ferme ${fermeId}`, link: '/production' },
                { label: batimentInfo?.name || `Bâtiment ${batimentId}`, link: `/production/ferme/${fermeId}` },
            ]} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
                            <Egg size={22} className="text-white" />
                        </div>
                        {fermeInfo?.name || `Ferme ${fermeId}`} — {batimentInfo?.name || `Bâtiment ${batimentId}`}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Triage et production d'œufs</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => navigate(-1)}>
                        <ChevronLeft size={18} className="mr-1" /> Retour
                    </Button>
                    <Button
                        onClick={openCreate}
                        className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
                        disabled={parcs.length === 0}
                    >
                        <Plus size={18} /> Nouvelle Saisie
                    </Button>
                </div>
            </div>

            {/* Parc selector tabs */}
            {parcs.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-500 mr-1">Parc :</span>
                    {parcs.map(p => (
                        <button key={p.id} onClick={() => handleParcChange(p.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${selectedParcId === p.id
                                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'}`}>
                            {p.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text" placeholder="Rechercher par date ou lot…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none bg-white"
                    />
                </div>
                <span className="text-xs text-gray-400">{filteredRecords.length} enregistrement(s)</span>
            </div>

            {/* Main Data Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto"></div>
                            <p className="text-gray-500 mt-3 text-sm">Chargement...</p>
                        </div>
                    ) : (
                        <table className="w-full text-xs border-collapse" style={{ minWidth: '1400px' }}>
                            <thead>
                                {/* Group Row */}
                                <tr className="bg-gray-100">
                                    <th rowSpan="2" className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-700 whitespace-nowrap bg-blue-50 min-w-[100px]">Date</th>
                                    <th rowSpan="2" className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-700 bg-blue-50">Lot</th>
                                    <th rowSpan="2" className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-700 bg-blue-50">Nb Pondeurs</th>
                                    <th rowSpan="2" className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-700 bg-blue-50">P.GUIDE</th>

                                    <th colSpan="2" className="border border-gray-300 px-2 py-1 text-center font-bold text-red-700 bg-red-50">ŒUFS Déformés</th>
                                    <th colSpan="4" className="border border-gray-300 px-2 py-1 text-center font-bold text-orange-700 bg-orange-50">ŒUFS cassés</th>
                                    <th colSpan="2" className="border border-gray-300 px-2 py-1 text-center font-bold text-yellow-700 bg-yellow-50">Doubles jaunes</th>
                                    <th colSpan="2" className="border border-gray-300 px-2 py-1 text-center font-bold text-yellow-700 bg-yellow-50">PETITS ŒUFS</th>
                                    <th colSpan="4" className="border border-gray-300 px-2 py-1 text-center font-bold text-amber-700 bg-amber-50">SALES OAC</th>
                                    <th colSpan="4" className="border border-gray-300 px-2 py-1 text-center font-bold text-green-700 bg-green-50">Propres</th>
                                    <th colSpan="2" className="border border-gray-300 px-2 py-1 text-center font-bold text-gray-700 bg-gray-50">déf. OAC</th>
                                    <th colSpan="2" className="border border-gray-300 px-2 py-1 text-center font-bold text-blue-700 bg-blue-50">QAC</th>
                                    <th colSpan="3" className="border border-gray-300 px-2 py-1 text-center font-bold text-purple-700 bg-purple-50">NOAC</th>
                                    <th rowSpan="2" className="border border-gray-300 px-2 py-1 text-center font-bold text-gray-700">Actions</th>
                                </tr>
                                <tr className="bg-gray-50 text-[10px] text-gray-600">
                                    {/* Déformés */}
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-red-50">Nombre</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-red-50">%</th>
                                    {/* Cassés */}
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-orange-50">remballe N</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-orange-50">remballe %</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-orange-50">pèle N</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-orange-50">pèle %</th>
                                    {/* Doubles jaunes */}
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-yellow-50">Nombre</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-yellow-50">%</th>
                                    {/* Petits */}
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-yellow-50">Nombre</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-yellow-50">%</th>
                                    {/* Sales OAC */}
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-amber-50">Pondoirs N</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-amber-50">Pondoirs %</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-amber-50">Déclarés N</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-amber-50">Déclarés %</th>
                                    {/* Propres */}
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-green-50">Pondoirs N</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-green-50">Pondoirs %</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-green-50">Sals N</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-green-50">Sals %</th>
                                    {/* déf OAC */}
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-gray-50">Nombre</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-gray-50">%</th>
                                    {/* QAC */}
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-blue-50">Nombre</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-blue-50">%</th>
                                    {/* NOAC */}
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-purple-50">Nombre</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-purple-50">%</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center bg-purple-50">P.GUIDE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan="30" className="py-16 text-center text-gray-400 italic">
                                            Aucune donnée — cliquez sur «Nouvelle Saisie» pour commencer
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRecords.map((r, idx) => (
                                        <tr key={r.id} className={`hover:bg-orange-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                            <td className="border border-gray-200 px-3 py-2 font-medium text-gray-900 bg-blue-50/50 whitespace-nowrap">
                                                {r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '—'}
                                            </td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono text-blue-700 font-bold">{r.lot || '—'}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono">{fmt(r.nombre_pondeurs, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono">{fmt(r.p_guide)}</td>

                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-red-50/50">{fmt(r.oeufs_deformes_n, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-red-50/50 text-red-600">{fmt(r.oeufs_deformes_pct)}%</td>

                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-orange-50/50">{fmt(r.oeufs_casses_remballe_n, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-orange-50/50 text-orange-600">{fmt(r.oeufs_casses_remballe_pct)}%</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-orange-50/50">{fmt(r.oeufs_casses_pele_n, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-orange-50/50 text-orange-600">{fmt(r.oeufs_casses_pele_pct)}%</td>

                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-yellow-50/50">{fmt(r.doubles_jaunes_n, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-yellow-50/50 text-yellow-600">{fmt(r.doubles_jaunes_pct)}%</td>

                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-yellow-50/50">{fmt(r.petits_oeufs_n, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-yellow-50/50 text-yellow-600">{fmt(r.petits_oeufs_pct)}%</td>

                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-amber-50/50">{fmt(r.oeufs_pondoirs_sales_n, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-amber-50/50 text-amber-600">{fmt(r.oeufs_pondoirs_sales_pct)}%</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-amber-50/50">{fmt(r.oeufs_sales_declares_n, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-amber-50/50 text-amber-600">{fmt(r.oeufs_sales_declares_pct)}%</td>

                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-green-50/50">{fmt(r.oeufs_pondoirs_propres_n, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-green-50/50 text-green-600">{fmt(r.oeufs_pondoirs_propres_pct)}%</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-green-50/50">{fmt(r.oeufs_sals_propres_n, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-green-50/50 text-green-600">{fmt(r.oeufs_sals_propres_pct)}%</td>

                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono">{fmt(r.def_oac_n, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-600">{fmt(r.def_oac_pct)}%</td>

                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-blue-50/50 font-bold text-blue-700">{fmt(r.qac_n, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-blue-50/50 text-blue-600">{fmt(r.qac_pct)}%</td>

                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-purple-50/50 font-bold text-purple-700">{fmt(r.noac_n, 0)}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-purple-50/50 text-purple-600">{fmt(r.noac_pct)}%</td>
                                            <td className="border border-gray-200 px-2 py-2 text-center font-mono bg-purple-50/50">{fmt(r.noac_p_guide)}</td>

                                            <td className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                                                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all mr-1" title="Modifier">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Supprimer">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            {/* Form Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingItem ? 'Modifier la saisie' : 'Nouvelle saisie de production'}
                size="xl"
            >
                <form onSubmit={handleSave} className="space-y-6">
                    {/* Base info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">Date *</label>
                            <input type="date" value={form.date} onChange={e => setF('date', e.target.value)} required
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-300 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">Lot</label>
                            <input type="text" value={form.lot} onChange={e => setF('lot', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-300 outline-none" placeholder="LOT-001" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">Nb Pondeurs</label>
                            <input type="number" min="0" value={form.nombre_pondeurs} onChange={e => setF('nombre_pondeurs', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-300 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">P. GUIDE</label>
                            <input type="number" step="0.01" value={form.p_guide} onChange={e => setF('p_guide', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-300 outline-none" />
                        </div>
                    </div>

                    {/* Triage sections */}
                    {[
                        { title: 'ŒUFS Déformés', color: 'red', fields: [['oeufs_deformes_n', 'Nombre'], ['oeufs_deformes_pct', '%']] },
                        { title: 'ŒUFS cassés — Remballe', color: 'orange', fields: [['oeufs_casses_remballe_n', 'Nombre'], ['oeufs_casses_remballe_pct', '%']] },
                        { title: 'ŒUFS cassés — Pèle', color: 'orange', fields: [['oeufs_casses_pele_n', 'Nombre'], ['oeufs_casses_pele_pct', '%']] },
                        { title: 'Doubles Jaunes', color: 'yellow', fields: [['doubles_jaunes_n', 'Nombre'], ['doubles_jaunes_pct', '%']] },
                        { title: 'Petits Œufs', color: 'yellow', fields: [['petits_oeufs_n', 'Nombre'], ['petits_oeufs_pct', '%']] },
                        { title: 'Œufs Pondoirs Sales', color: 'amber', fields: [['oeufs_pondoirs_sales_n', 'Nombre'], ['oeufs_pondoirs_sales_pct', '%']] },
                        { title: 'Sales OAC / Déclarés', color: 'amber', fields: [['oeufs_sales_declares_n', 'Nombre'], ['oeufs_sales_declares_pct', '%']] },
                        { title: 'Œufs Pondoirs Propres', color: 'green', fields: [['oeufs_pondoirs_propres_n', 'Nombre'], ['oeufs_pondoirs_propres_pct', '%']] },
                        { title: 'Oeufs Sals Propres', color: 'green', fields: [['oeufs_sals_propres_n', 'Nombre'], ['oeufs_sals_propres_pct', '%']] },
                        { title: 'Défaut OAC', color: 'gray', fields: [['def_oac_n', 'Nombre'], ['def_oac_pct', '%']] },
                        { title: 'QAC', color: 'blue', fields: [['qac_n', 'Nombre'], ['qac_pct', '%']] },
                        { title: 'NOAC', color: 'purple', fields: [['noac_n', 'Nombre'], ['noac_pct', '%'], ['noac_p_guide', 'P.GUIDE']] },
                    ].map(section => (
                        <div key={section.title} className={`p-4 rounded-xl border border-${section.color}-100 bg-${section.color}-50/30`}>
                            <h4 className={`text-xs font-bold uppercase tracking-wider text-${section.color}-700 mb-3`}>{section.title}</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {section.fields.map(([key, label]) => (
                                    <div key={key}>
                                        <label className="text-xs text-gray-500 block mb-1">{label}</label>
                                        <input type="number" step={key.endsWith('_pct') || key === 'noac_p_guide' || key === 'p_guide' ? '0.01' : '1'}
                                            min="0" value={form[key]} onChange={e => setF(key, e.target.value)}
                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-300 outline-none bg-white" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div>
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">Observation</label>
                        <textarea value={form.observation} onChange={e => setF('observation', e.target.value)} rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-300 outline-none" />
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
                            <X size={16} className="mr-1" /> Annuler
                        </Button>
                        <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                            <Save size={16} className="mr-1" />
                            {saving ? 'Enregistrement…' : editingItem ? 'Mettre à jour' : 'Enregistrer'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete */}
            <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirmer la suppression">
                <p className="text-gray-600 mb-6">Voulez-vous vraiment supprimer cet enregistrement du <strong>{deleteTarget?.date}</strong> ?</p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Annuler</Button>
                    <Button variant="danger" onClick={handleDelete}>Supprimer</Button>
                </div>
            </Modal>
        </div>
    );
};

export default ProductionTable;
