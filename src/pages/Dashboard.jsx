import { useEffect, useState, useMemo } from 'react';
import { elevageService } from '../services/elevageService';
import { Card } from '../components/ui/Card';
import { TrendingUp, LayoutDashboard, Search, Activity } from 'lucide-react';
import ElevageCharts from '../components/charts/ElevageCharts';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [allData, setAllData] = useState([]);
    const [fermes, setFermes] = useState([]);

    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [elevages, fermesList] = await Promise.all([
                    elevageService.getElevages(),
                    elevageService.getFermes()
                ]);

                // Normalize data for charts
                const normalizedData = elevages
                    .filter(item => !item.deleted && !item.is_deleted)
                    .map(item => ({
                        ...item,
                        fermeId: item.fermeId || item.ferme_id,
                        parcId: item.parcId || item.parc_id,
                        batimentId: item.batimentId || item.batiment_id,
                        deleted: item.deleted || item.is_deleted || false
                    }));

                setAllData(normalizedData);
                setFermes(fermesList);
                console.log('Dashboard data loaded:', {
                    records: normalizedData.length,
                    fermes: fermesList.length
                });
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);



    // Summary data logic
    const summaryData = useMemo(() => {
        return fermes.map(ferme => {
            const farmRecords = allData
                .filter(d => String(d.fermeId) === String(ferme.id))
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            const latest = farmRecords[0] || {};

            const totalEff = (parseFloat(latest.effectif_poule) || 0) + (parseFloat(latest.effectif_coq) || 0);
            const totalMort = (parseFloat(latest.mort_poule_n) || 0) + (parseFloat(latest.mort_coq_n) || 0);

            return {
                id: ferme.id,
                name: ferme.name,
                lot: ferme.lot,
                age: latest.age || '-',
                effectif: totalEff || '-',
                poids: latest.poids_poule || '-',
                mortPct: totalEff > 0 ? ((totalMort / totalEff) * 100).toFixed(2) : '-'
            };
        });
    }, [fermes, allData]);

    const filteredSummary = summaryData.filter(s =>
        (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.lot || '').toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="text-gray-500 mt-4 font-medium italic">Chargement des performances globales...</p>
        </div>
    );



    return (
        <div className="space-y-8 animate-fadeIn w-full">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-primary-100 rounded-xl text-primary-600">
                            <LayoutDashboard size={32} />
                        </div>
                        Tableau de Bord Global
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Vue d'ensemble et courbes de performance de toutes les fermes</p>
                </div>

            </div>



            {/* Performance Curves Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-primary-600 rounded-full"></div>
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Courbes de Performance</h2>

                </div>
                <ElevageCharts data={allData} />
            </section>

            {/* Summary Table Section */}
            <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Récapitulatif des Fermes</h2>
                    </div>
                    <div className="relative w-full sm:w-80 shadow-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher une ferme ou un lot..."
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="overflow-hidden border-0 shadow-2xl rounded-3xl">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-center">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-5">Ferme</th>
                                    <th className="px-6 py-5">Lot Actuel</th>
                                    <th className="px-6 py-5">Âge</th>
                                    <th className="px-6 py-5">Effectif Total</th>
                                    <th className="px-6 py-5">Poids (g)</th>
                                    <th className="px-6 py-5 text-red-600">Mortalité %</th>
                                    <th className="px-6 py-5">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredSummary.length > 0 ? filteredSummary.map((row) => (
                                    <tr key={row.id} className="hover:bg-primary-50/40 transition-all duration-300 group cursor-default">
                                        <td className="px-6 py-5 font-black text-gray-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight">{row.name}</td>
                                        <td className="px-6 py-5">
                                            <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest border border-gray-200 group-hover:bg-white transition-colors">
                                                {row.lot}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 font-bold text-gray-700">{row.age}</td>
                                        <td className="px-6 py-5 font-mono font-black text-gray-800 text-lg">{row.effectif}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-center gap-1.5 font-mono text-primary-600 font-black text-lg bg-primary-50/50 py-1.5 rounded-xl border border-primary-100/50">
                                                {row.poids}
                                                <span className="text-[10px] text-primary-400 font-bold">g</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-red-600 font-black text-lg">{row.mortPct}%</span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 shadow-sm">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Actif</span>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-300">
                                                <Search size={48} className="mb-4 opacity-20" />
                                                <p className="text-lg font-bold">Aucune ferme ne correspond à votre recherche.</p>
                                                <p className="text-sm font-medium italic">Essayez un autre mot-clé ou vérifiez l'orthographe.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </section>
        </div>
    );
};

export default Dashboard;
