import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { elevageService } from '../../services/elevageService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import ElevageForm from '../../components/forms/ElevageForm';
import Breadcrumb from '../../components/ui/Breadcrumb';
import ElevageCharts from '../../components/charts/ElevageCharts';
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, FileSpreadsheet, MessageSquare, BarChart3, X, Printer, History } from 'lucide-react';

const ElevageTable = () => {
    const { fermeId, batimentId, parcId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [latestRecord, setLatestRecord] = useState(null);
    const [parcInfo, setParcInfo] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [showOldLots, setShowOldLots] = useState(false);
    const itemsPerPage = 8;

    // Modal States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isChartsOpen, setIsChartsOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [records, currentParc] = await Promise.all([
                elevageService.getElevages(parcId),
                elevageService.getParc(parcId)
            ]);
            setData(records);

            if (currentParc) {
                const [currentBat, fermes] = await Promise.all([
                    elevageService.getBatiment(batimentId),
                    elevageService.getFermes()
                ]);
                const currentFerme = fermes.find(f => f.id === parseInt(fermeId));

                setParcInfo({
                    name: currentParc.name,
                    lot: currentBat?.lot || 'Non défini',
                    batimentName: currentBat?.name || `Bâtiment ${batimentId}`,
                    fermeName: currentFerme?.name || `Ferme ${fermeId}`
                });
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (location.state?.openCreate) {
            setIsFormOpen(true);
            // Clear location state to prevent reopening on reload/navigation
            navigate('.', { replace: true, state: {} });
        }
        fetchData();
    }, [parcId, location.state]); // Depend on parcId and location.state changes

    const archivedCount = useMemo(() => {
        if (!parcInfo?.lot || parcInfo.lot === 'Non défini') return 0;
        return data.filter(d => d.lot !== parcInfo.lot).length;
    }, [data, parcInfo]);

    // Filter & Sort
    const processedData = useMemo(() => {
        const term = search.toLowerCase();
        let filtered = data.filter(item => {
            const matchesSearch = (item.date || '').includes(search) || (item.age || '').toLowerCase().includes(term);

            // If not showing old lots, only show records matching current parc lot
            if (!showOldLots && parcInfo?.lot && parcInfo.lot !== 'Non défini') {
                return matchesSearch && item.lot === parcInfo.lot;
            }
            return matchesSearch;
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [data, search, sortConfig, showOldLots, parcInfo]);

    // Pagination
    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const paginatedData = processedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleSave = async (formData) => {
        const payload = {
            ...formData,
            parc_id: Number(parcId),
            effectif_coq: Number(formData.effectif_coq || 0),
            effectif_poule: Number(formData.effectif_poule || 0),
            mort_coq_n: Number(formData.mort_coq_n || 0),
            mort_coq_pct: Number(formData.mort_coq_pct || 0),
            mort_poule_n: Number(formData.mort_poule_n || 0),
            mort_poule_pct: Number(formData.mort_poule_pct || 0),
            mort_semaine_coq: Number(formData.mort_semaine_coq || 0),
            mort_semaine_poule: Number(formData.mort_semaine_poule || 0),
            triage_dechet: Number(formData.triage_dechet || 0),
            triage_coq_frere: Number(formData.triage_coq_frere || 0),
            triage_poule_soeur: Number(formData.triage_poule_soeur || 0),
            cumul_mort_c: Number(formData.cumul_mort_c || 0),
            cumul_mort_p: Number(formData.cumul_mort_p || 0),
            aliment_coq: Number(formData.aliment_coq || 0),
            aliment_poule: Number(formData.aliment_poule || 0),
            correction_plus: Number(formData.correction_plus || 0),
            correction_moins: Number(formData.correction_moins || 0),
            transfert: Number(formData.transfert || 0),
            guide: Number(formData.guide || 0),
            poids_coq: Number(formData.poids_coq || 0),
            poids_poule: Number(formData.poids_poule || 0),
            poids_guide: Number(formData.poids_guide || 0),
            homog_pct: Number(formData.homog_pct || 0),
        };

        if (editingItem) {
            await elevageService.updateElevage(editingItem.id, payload);
        } else {
            await elevageService.createElevage(payload);
        }
        await fetchData();
        setIsFormOpen(false);
        setEditingItem(null);
    };

    const handleDelete = async () => {
        if (itemToDelete) {
            await elevageService.deleteElevage(itemToDelete.id);
            await fetchData();
            setIsDeleteOpen(false);
            setItemToDelete(null);
        }
    };

    const handlePrintPDF = () => {
        // Create a print-friendly version of the table
        const printWindow = window.open('', '_blank');
        const parcName = parcInfo?.name || `Parc ${parcId}`;
        const batimentName = parcInfo?.batimentName || `Bâtiment ${batimentId}`;
        const fermeName = parcInfo?.fermeName || `Ferme ${fermeId}`;

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
            <head>
                <title>${fermeName}</title>
                <style>
                    @media print {
                        @page { margin: 1cm; size: landscape; }
                        body { margin: 0; }
                    }
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        padding: 20px;
                        color: #1f2937;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #3b82f6;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                        color: #1f2937;
                        font-weight: 800;
                    }
                    .header p {
                        margin: 5px 0 0 0;
                        font-size: 14px;
                        color: #6b7280;
                    }
                    .info-bar {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 20px;
                        padding: 10px;
                        background: #f3f4f6;
                        border-radius: 8px;
                    }
                    .info-item {
                        font-size: 12px;
                    }
                    .info-item strong {
                        color: #3b82f6;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 9px;
                        margin-bottom: 20px;
                    }
                    th, td {
                        border: 1px solid #d1d5db;
                        padding: 6px 4px;
                        text-align: center;
                    }
                    th {
                        background-color: #f3f4f6;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #374151;
                        font-size: 8px;
                    }
                    tr:nth-child(even) {
                        background-color: #f9fafb;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        font-size: 10px;
                        color: #9ca3af;
                        border-top: 1px solid #e5e7eb;
                        padding-top: 10px;
                    }
                    .bg-blue-50 { background-color: #eff6ff !important; }
                    .bg-red-50 { background-color: #fef2f2 !important; }
                    .bg-yellow-50 { background-color: #fefce8 !important; }
                    .bg-orange-50 { background-color: #fff7ed !important; }
                    .bg-purple-50 { background-color: #faf5ff !important; }
                    .bg-green-50 { background-color: #f0fdf4 !important; }
                    .bg-emerald-50 { background-color: #ecfdf5 !important; }
                    .bg-gray-50 { background-color: #f9fafb !important; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${fermeName}</h1>
                </div>
                
                <div class="info-bar">
                    <div class="info-item"><strong>Date d'impression:</strong> ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    <div class="info-item"><strong>Parc:</strong> ${parcName}</div>
                    <div class="info-item"><strong>Lot:</strong> ${parcInfo?.lot || 'Non défini'}</div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th rowspan="2">DATE</th>
                            <th rowspan="2">AGE</th>
                            <th colspan="2" class="bg-blue-50">EFFECTIF</th>
                            <th colspan="3" class="bg-red-50">MORTALITE</th>
                            <th rowspan="2" class="bg-gray-50">GUIDE</th>
                            <th colspan="3" class="bg-yellow-50">TRIAGE</th>
                            <th colspan="2" class="bg-orange-50">CORRECTION</th>
                            <th rowspan="2" class="bg-blue-50">TRANSFERT</th>
                            <th rowspan="2" class="bg-gray-50">OBS</th>
                            <th colspan="2" class="bg-purple-50">CUMUL MORT. (%)</th>
                            <th colspan="3" class="bg-blue-50">POIDS (g)</th>
                            <th rowspan="2" class="bg-emerald-50">HOMOG %</th>
                            <th colspan="2" class="bg-green-50">ALIMENT (kg)</th>
                        </tr>
                        <tr>
                            <th class="bg-blue-50">COQ</th>
                            <th class="bg-blue-50">POULE</th>
                            <th class="bg-red-50">COQ N ${!(fermeId === '1' && batimentId === '2' && parcId === '2') ? '%' : ''}</th>
                            <th class="bg-red-50">POULE N ${!(fermeId === '1' && batimentId === '2' && parcId === '2') ? '%' : ''}</th>
                            <th class="bg-red-50">SEMAINE %</th>
                            <th class="bg-yellow-50">DECHET</th>
                            <th class="bg-yellow-50">COQ FRERE</th>
                            <th class="bg-yellow-50">POULE SOEUR</th>
                            <th class="bg-orange-50">+</th>
                            <th class="bg-orange-50">-</th>
                            <th class="bg-purple-50">C %</th>
                            <th class="bg-purple-50">P %</th>
                            <th class="bg-blue-50">COQ</th>
                            <th class="bg-blue-50">POULE</th>
                            <th class="bg-blue-50">GUIDE</th>
                            <th class="bg-green-50">COQ</th>
                            <th class="bg-green-50">POULE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedData.map(item => `
                            <tr>
                                <td><strong>${item.date}</strong></td>
                                <td>${item.age || '-'}</td>
                                <td>${item.effectif_coq ?? '-'}</td>
                                <td>${item.effectif_poule ?? '-'}</td>
                                <td>${item.mort_coq_n ?? '-'}${!(fermeId === '1' && batimentId === '2' && parcId === '2') && item.mort_coq_pct != null ? ' (' + item.mort_coq_pct + '%)' : ''}</td>
                                <td>${item.mort_poule_n ?? '-'}${!(fermeId === '1' && batimentId === '2' && parcId === '2') && item.mort_poule_pct != null ? ' (' + item.mort_poule_pct + '%)' : ''}</td>
                                <td>${item.mort_semaine_coq ?? '-'} / ${item.mort_semaine_poule ?? '-'}</td>
                                <td>${item.guide ?? '-'}</td>
                                <td>${item.triage_dechet || '-'}</td>
                                <td>${item.triage_coq_frere || '-'}</td>
                                <td>${item.triage_poule_soeur || '-'}</td>
                                <td style="color: #059669;">${item.correction_plus || '-'}</td>
                                <td style="color: #dc2626;">${item.correction_moins || '-'}</td>
                                <td style="color: #2563eb; font-weight: bold;">${item.transfert || '-'}</td>
                                <td>${item.observation ? '✓' : '-'}</td>
                                <td>${item.cumul_mort_c != null ? item.cumul_mort_c + '%' : '-'}</td>
                                <td>${item.cumul_mort_p != null ? item.cumul_mort_p + '%' : '-'}</td>
                                <td>${item.poids_coq ?? '-'}</td>
                                <td>${item.poids_poule ?? '-'}</td>
                                <td>${item.poids_guide ?? '-'}</td>
                                <td class="bg-emerald-50">${item.homog_pct != null ? item.homog_pct + '%' : '-'}</td>
                                <td>${item.aliment_coq ?? '-'}</td>
                                <td>${item.aliment_poule ?? '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>Document généré par Couvoir Jaber - Système de Gestion d'Élevage</p>
                    <p>© ${new Date().getFullYear()} Couvoir Jaber. Tous droits réservés.</p>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                        // Optional: close window after printing
                        // window.onafterprint = function() { window.close(); }
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    const handleRestore = async (item) => {
        if (!confirm(`Restaurer l'enregistrement du ${item.date} ?`)) return;
        await elevageService.restoreElevage(item.id);
        await fetchData();
    };

    const handlePurge = async (item) => {
        if (!confirm(`Supprimer définitivement l'enregistrement du ${item.date} ? Cette action est irréversible.`)) return;
        await elevageService.purgeElevage(item.id);
        await fetchData();
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const openDelete = (item) => {
        setItemToDelete(item);
        setIsDeleteOpen(true);
    };

    return (
        <div className="space-y-6 w-full">
            <Breadcrumb
                items={[
                    { label: parcInfo?.fermeName || `Ferme ${fermeId}`, link: `/elevage` },
                    { label: parcInfo?.batimentName || `Bâtiment ${batimentId}`, link: `/elevage/ferme/${fermeId}` },
                    { label: parcInfo?.name || `Parc ${parcId}`, link: `/elevage/ferme/${fermeId}/batiment/${batimentId}` }
                ]}
            />

            {/* Dashboard Link / Charts Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight">Tableau de Bord du Parc</h3>
                        <p className="text-xs text-gray-500 font-medium italic">Analyse des performances en temps réel</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setIsChartsOpen(!isChartsOpen)}
                        className={`${isChartsOpen ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                    >
                        {isChartsOpen ? 'Masquer les Courbes' : 'Afficher les Courbes'}
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(-1)}>
                        <ChevronLeft size={20} className="mr-2" />
                        Retour
                    </Button>
                </div>
            </div>

            {/* In-page Charts */}
            {isChartsOpen && (
                <div className="animate-slideDown">
                    <Card className="p-6 border-0 shadow-2xl rounded-3xl bg-gradient-to-br from-white to-gray-50/50">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                            <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Analyse Graphique</h2>
                        </div>
                        <ElevageCharts data={processedData} />
                    </Card>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        {parcInfo?.fermeName || `Ferme ${fermeId}`} - {parcInfo?.batimentName || `Bâtiment ${batimentId}`} - {parcInfo?.name || `Parc ${parcId}`}
                    </h1>
                    <p className="text-sm text-gray-500">Gérez les rations et consommations</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={async () => {
                        try {
                            const latest = await elevageService.getLatestElevage(parcId);
                            setLatestRecord(latest);
                            setEditingItem(null);
                            setIsFormOpen(true);
                        } catch (err) {
                            setLatestRecord(null);
                            setEditingItem(null);
                            setIsFormOpen(true);
                        }
                    }}>
                        <Plus size={20} className="mr-2" />
                        Nouvelle Fiche
                    </Button>
                </div>
            </div>

            <Card>
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 min-w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Rechercher par date ou âge..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        {archivedCount > 0 && (
                            <button
                                onClick={() => setShowOldLots(!showOldLots)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showOldLots
                                    ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <History size={14} />
                                {showOldLots ? 'Masquer historique' : `Voir historique (${archivedCount})`}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={async () => { await elevageService.exportElevages(); }}>
                                <FileSpreadsheet size={16} className="mr-2" />
                                Exporter Excel
                            </Button>
                            <input
                                type="file"
                                id="elevageImportInput"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const res = await elevageService.importElevages(file);
                                    if (res?.success) {
                                        await fetchData();
                                        window.alert(`${res.imported} ligne(s) importées`);
                                    } else {
                                        window.alert(res?.message || 'Échec de l\'import');
                                    }
                                    e.target.value = '';
                                }}
                            />
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => document.getElementById('elevageImportInput').click()}>
                                <FileSpreadsheet size={16} className="mr-2" />
                                Importer Excel
                            </Button>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handlePrintPDF}>
                                <Printer size={16} className="mr-2" />
                                Imprimer PDF
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mobile scroll hint */}
                <div className="sm:hidden px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                    <p className="text-xs text-blue-700 text-center">
                        ← Faites défiler horizontalement pour voir toutes les colonnes →
                    </p>
                </div>

                <div className="w-full">
                    <div className="overflow-x-auto overflow-y-visible shadow-sm rounded-lg border border-gray-200">
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <table className="min-w-full text-sm text-left border-collapse">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 sticky top-0 z-10">
                                    <tr>
                                        <th rowSpan="2" className="px-4 py-3 border border-gray-300 font-medium text-center">DATE</th>
                                        <th rowSpan="2" className="px-4 py-3 border border-gray-300 font-medium text-center">AGE</th>
                                        <th colSpan="2" className="px-4 py-3 border border-gray-300 font-medium text-center bg-blue-50">EFFECTIF</th>
                                        <th colSpan="3" className="px-4 py-3 border border-gray-300 font-medium text-center bg-red-50">MORTALITE</th>
                                        <th rowSpan="2" className="px-4 py-3 border border-gray-300 font-medium text-center bg-gray-50">GUIDE</th>
                                        <th colSpan="3" className="px-4 py-3 border border-gray-300 font-medium text-center bg-yellow-50">TRIAGE</th>
                                        <th colSpan="2" className="px-4 py-3 border border-gray-300 font-medium text-center bg-orange-50">CORRECTION</th>
                                        <th rowSpan="2" className="px-4 py-3 border border-gray-300 font-medium text-center bg-blue-50">TRANSFERT</th>
                                        <th rowSpan="2" className="px-4 py-3 border border-gray-300 font-medium text-center bg-gray-50">OBS</th>
                                        <th colSpan="2" className="px-4 py-3 border border-gray-300 font-medium text-center bg-purple-50">cumul mortalités (%)</th>
                                        <th colSpan="3" className="px-4 py-3 border border-gray-300 font-medium text-center bg-blue-50">POIDS (g)</th>
                                        <th rowSpan="2" className="px-4 py-3 border border-gray-300 font-medium text-center bg-emerald-50">HOMOG %</th>
                                        <th colSpan="2" className="px-4 py-3 border border-gray-300 font-medium text-center bg-green-50">ALIMENT en kg</th>
                                        <th colSpan="2" className="px-4 py-3 border border-gray-300 font-medium text-center bg-teal-50">RATION (g)</th>
                                        <th rowSpan="2" className="px-4 py-3 border border-gray-300 font-medium text-center">Actions</th>
                                    </tr>
                                    <tr>
                                        {/* EFFECTIF sub-headers */}
                                        <th className="px-3 py-2 border border-gray-300 font-medium text-center bg-blue-50">COQ</th>
                                        <th className="px-3 py-2 border border-gray-300 font-medium text-center bg-blue-50">POULE</th>

                                        {/* MORTALITE sub-headers */}
                                        <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-red-50">
                                            <div className="flex flex-col">
                                                <span>COQ</span>
                                                <div className="flex gap-1 text-[10px]">
                                                    <span>N</span>
                                                    {!(fermeId === '1' && batimentId === '2' && parcId === '2') && <span>%</span>}
                                                </div>
                                            </div>
                                        </th>
                                        <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-red-50">
                                            <div className="flex flex-col">
                                                <span>POULE</span>
                                                <div className="flex gap-1 text-[10px]">
                                                    <span>N</span>
                                                    {!(fermeId === '1' && batimentId === '2' && parcId === '2') && <span>%</span>}
                                                </div>
                                            </div>
                                        </th>
                                        <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-red-50">
                                            <div className="flex flex-col">
                                                <span>par semaine %</span>
                                                <div className="flex gap-1 text-[10px]">
                                                    <span>coq</span>
                                                    <span>poule</span>
                                                </div>
                                            </div>
                                        </th>

                                        {/* TRIAGE sub-headers */}
                                        <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50">DECHET</th>
                                        <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50">COQ FRERE</th>
                                        <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-yellow-50">POULE SOEUR</th>

                                        {/* CORRECTION sub-headers */}
                                        <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-orange-50">+</th>
                                        <th className="px-2 py-2 border border-gray-300 font-medium text-center bg-orange-50">-</th>
                                        <th className="px-0 py-0 border-0 w-0 h-0 hidden"></th>
                                        <th className="px-0 py-0 border-0 w-0 h-0 hidden"></th>

                                        {/* cumul mortalités sub-headers */}
                                        <th className="px-3 py-2 border border-gray-300 font-medium text-center bg-purple-50">C %</th>
                                        <th className="px-3 py-2 border border-gray-300 font-medium text-center bg-purple-50">P %</th>

                                        {/* POIDS sub-headers */}
                                        <th className="px-3 py-2 border border-gray-300 font-medium text-center bg-blue-50">COQ</th>
                                        <th className="px-3 py-2 border border-gray-300 font-medium text-center bg-blue-50">POULE</th>
                                        <th className="px-3 py-2 border border-gray-300 font-medium text-center bg-blue-50">GUIDE</th>

                                        {/* ALIMENT sub-headers */}
                                        <th className="px-3 py-2 border border-gray-300 font-medium text-center bg-green-50">COQ</th>
                                        <th className="px-3 py-2 border border-gray-300 font-medium text-center bg-green-50">POULE</th>
                                        <th className="px-3 py-2 border border-gray-300 font-medium text-center bg-teal-50">COQ</th>
                                        <th className="px-3 py-2 border border-gray-300 font-medium text-center bg-teal-50">POULE</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan="24" className="p-8 text-center text-gray-500">Chargement...</td></tr>
                                    ) : paginatedData.length === 0 ? (
                                        <tr><td colSpan="24" className="p-8 text-center text-gray-500">Aucune donnée trouvée</td></tr>
                                    ) : (
                                        paginatedData.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 border border-gray-200 font-medium text-gray-900 text-center">{item.date}</td>
                                                <td className="px-4 py-3 border border-gray-200 text-center">{item.age || '-'}</td>

                                                {/* EFFECTIF */}
                                                <td className="px-3 py-3 border border-gray-200 text-center font-mono">{item.effectif_coq ?? '-'}</td>
                                                <td className="px-3 py-3 border border-gray-200 text-center font-mono">{item.effectif_poule ?? '-'}</td>

                                                {/* MORTALITE */}
                                                <td className="px-2 py-3 border border-gray-200 text-center">
                                                    <div className="flex gap-2 justify-center text-xs">
                                                        <span>{item.mort_coq_n ?? '-'}</span>
                                                        {!(fermeId === '1' && batimentId === '2' && parcId === '2') && (
                                                            <span className="text-red-600">{item.mort_coq_pct != null ? `${item.mort_coq_pct}%` : '-'}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 border border-gray-200 text-center">
                                                    <div className="flex gap-2 justify-center text-xs">
                                                        <span>{item.mort_poule_n ?? '-'}</span>
                                                        {!(fermeId === '1' && batimentId === '2' && parcId === '2') && (
                                                            <span className="text-red-600">{item.mort_poule_pct != null ? `${item.mort_poule_pct}%` : '-'}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 border border-gray-200 text-center">
                                                    <div className="flex gap-2 justify-center text-xs">
                                                        <span className="text-blue-600">{item.mort_semaine_coq ?? '-'}</span>
                                                        <span className="text-blue-600">{item.mort_semaine_poule ?? '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 border border-gray-200 text-center font-mono">{item.guide ?? '-'}</td>

                                                {/* TRIAGE */}
                                                <td className="px-2 py-3 border border-gray-200 text-center">{item.triage_dechet || '-'}</td>
                                                <td className="px-2 py-3 border border-gray-200 text-center">{item.triage_coq_frere || '-'}</td>
                                                <td className="px-2 py-3 border border-gray-200 text-center">{item.triage_poule_soeur || '-'}</td>

                                                {/* CORRECTION */}
                                                <td className="px-2 py-3 border border-gray-200 text-center text-green-600 font-medium">{item.correction_plus || '-'}</td>
                                                <td className="px-2 py-3 border border-gray-200 text-center text-red-600 font-medium">{item.correction_moins || '-'}</td>

                                                {/* TRANSFERT */}
                                                <td className="px-2 py-3 border border-gray-200 text-center font-bold text-blue-700">{item.transfert || '-'}</td>

                                                {/* OBS */}
                                                <td className="px-2 py-3 border border-gray-200 text-center">
                                                    {item.observation ? (
                                                        <button
                                                            title={item.observation}
                                                            onClick={() => alert(`Observation: ${item.observation}`)}
                                                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all"
                                                        >
                                                            <MessageSquare size={16} />
                                                        </button>
                                                    ) : '-'}
                                                </td>

                                                {/* cumul mortalités */}
                                                <td className="px-3 py-3 border border-gray-200 text-center font-mono">{item.cumul_mort_c != null ? `${item.cumul_mort_c}%` : '-'}</td>
                                                <td className="px-3 py-3 border border-gray-200 text-center font-mono">{item.cumul_mort_p != null ? `${item.cumul_mort_p}%` : '-'}</td>

                                                {/* POIDS */}
                                                <td className="px-3 py-3 border border-gray-200 text-center font-mono">{item.poids_coq ?? '-'}</td>
                                                <td className="px-3 py-3 border border-gray-200 text-center font-mono">{item.poids_poule ?? '-'}</td>
                                                <td className="px-3 py-3 border border-gray-200 text-center font-mono">{item.poids_guide ?? '-'}</td>
                                                <td className="px-3 py-3 border border-gray-200 text-center font-mono bg-emerald-50/30">{item.homog_pct != null ? `${item.homog_pct}%` : '-'}</td>

                                                {/* ALIMENT */}
                                                <td className="px-3 py-3 border border-gray-200 text-center font-mono">{item.aliment_coq ?? '-'}</td>
                                                <td className="px-3 py-3 border border-gray-200 text-center font-mono">{item.aliment_poule ?? '-'}</td>

                                                {/* RATION */}
                                                <td className="px-3 py-3 border border-gray-200 text-center font-mono bg-teal-50/30">
                                                    {(item.aliment_coq && item.effectif_coq) ? ((item.aliment_coq * 1000) / item.effectif_coq).toFixed(0) : '-'}
                                                </td>
                                                <td className="px-3 py-3 border border-gray-200 text-center font-mono bg-teal-50/30">
                                                    {(item.aliment_poule && item.effectif_poule) ? ((item.aliment_poule * 1000) / item.effectif_poule).toFixed(0) : '-'}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-3 border border-gray-200 text-center space-x-2">
                                                    <button onClick={() => openEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    {isAdmin && (
                                                        <button onClick={() => openDelete(item)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft size={16} className="mr-1" /> Précédent
                        </Button>
                        <span className="text-sm text-gray-600">
                            Page {currentPage} sur {totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Suivant <ChevronRight size={16} className="ml-1" />
                        </Button>
                    </div>
                )}
            </Card>



            {/* Forms Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setLatestRecord(null); }}
                title={editingItem ? "Modifier l'enregistrement" : "Nouvel enregistrement"}
                size="large"
            >
                <ElevageForm
                    initialData={editingItem}
                    referenceData={latestRecord}
                    parcInfo={parcInfo}
                    location={{ fermeId, batimentId, parcId }}
                    onSubmit={handleSave}
                    onCancel={() => { setIsFormOpen(false); setLatestRecord(null); }}
                />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title="Confirmer la suppression"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Êtes-vous sûr de vouloir supprimer cet enregistrement du <strong>{itemToDelete?.date}</strong> ?
                        Cette action est irréversible.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>Annuler</Button>
                        <Button variant="danger" onClick={handleDelete}>Supprimer</Button>
                    </div>
                </div>
            </Modal>

            {/* Charts Modal */}
            <Modal
                isOpen={isChartsOpen}
                onClose={() => setIsChartsOpen(false)}
                title={`Tableau de Bord - ${parcInfo?.name || `Parc ${parcId}`}`}
                size="xxl"
            >
                <div className="bg-gray-50/50 -m-6 p-6 min-h-[600px]">
                    <ElevageCharts data={processedData} />
                </div>
            </Modal>
        </div>
    );
};

export default ElevageTable;
