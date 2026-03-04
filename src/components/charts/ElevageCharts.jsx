import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Scale, Utensils, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { useMemo } from 'react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const ElevageCharts = ({ data }) => {
    // Sort and Aggregate data by date
    const aggregatedData = useMemo(() => {
        console.log('ElevageCharts received data:', data?.length, 'records');

        if (!data || data.length === 0) {
            console.warn('No data provided to ElevageCharts');
            return [];
        }

        const dateMap = {};
        const validData = data.filter(d => !d.deleted && !d.is_deleted);

        console.log('Valid data after filtering:', validData.length);

        validData.forEach(item => {
            const date = item.date;
            if (!dateMap[date]) dateMap[date] = [];
            dateMap[date].push(item);
        });

        const sortedDates = Object.keys(dateMap).sort();
        console.log('Unique dates found:', sortedDates.length);

        const aggregated = sortedDates.map(date => {
            const records = dateMap[date];

            // Average weights
            const recCoq = records.map(r => parseFloat(r.poids_coq)).filter(v => !isNaN(v) && v > 0);
            const recPoule = records.map(r => parseFloat(r.poids_poule)).filter(v => !isNaN(v) && v > 0);
            const recHomog = records.map(r => parseFloat(r.homog_pct)).filter(v => !isNaN(v) && v > 0);
            const recGuide = records.map(r => parseFloat(r.poids_guide)).filter(v => !isNaN(v) && v > 0);

            // Sum Aliment
            const totalAlimentCoq = records.reduce((s, r) => s + (parseFloat(r.aliment_coq) || 0), 0);
            const totalAlimentPoule = records.reduce((s, r) => s + (parseFloat(r.aliment_poule) || 0), 0);

            // Calculate Mortality %
            const totalEffPoule = records.reduce((s, r) => s + (parseFloat(r.effectif_poule) || 0), 0);
            const totalMortPoule = records.reduce((s, r) => s + (parseFloat(r.mort_poule_n) || 0), 0);
            const totalEffCoq = records.reduce((s, r) => s + (parseFloat(r.effectif_coq) || 0), 0);
            const totalMortCoq = records.reduce((s, r) => s + (parseFloat(r.mort_coq_n) || 0), 0);

            return {
                date,
                poids_coq: recCoq.length > 0 ? parseFloat((recCoq.reduce((a, b) => a + b, 0) / recCoq.length).toFixed(0)) : null,
                poids_poule: recPoule.length > 0 ? parseFloat((recPoule.reduce((a, b) => a + b, 0) / recPoule.length).toFixed(0)) : null,
                homog_pct: recHomog.length > 0 ? parseFloat((recHomog.reduce((a, b) => a + b, 0) / recHomog.length).toFixed(1)) : null,
                poids_guide: recGuide.length > 0 ? parseFloat((recGuide.reduce((a, b) => a + b, 0) / recGuide.length).toFixed(0)) : null,
                aliment_coq: parseFloat(totalAlimentCoq.toFixed(1)),
                aliment_poule: parseFloat(totalAlimentPoule.toFixed(1)),
                effectif_coq: totalEffCoq,
                effectif_poule: totalEffPoule,
                mort_poule_pct: totalEffPoule > 0 ? parseFloat(((totalMortPoule / totalEffPoule) * 100).toFixed(2)) : 0,
                mort_coq_pct: totalEffCoq > 0 ? parseFloat(((totalMortCoq / totalEffCoq) * 100).toFixed(2)) : 0
            };
        });

        console.log('Aggregated chart data:', aggregated.slice(0, 3)); // Log first 3 entries
        return aggregated;
    }, [data]);

    const labels = aggregatedData.map(d => d.date);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { usePointStyle: true, padding: 20, font: { size: 12, weight: '600' } }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#1f2937',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                usePointStyle: true
            }
        },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: '#f3f4f6' } }
        },
        interaction: { intersect: false, mode: 'index' }
    };

    // POIDS Data
    const poidsData = {
        labels,
        datasets: [
            {
                label: 'Poids Coq (g)',
                data: aggregatedData.map(d => d.poids_coq),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Poids Poule (g)',
                data: aggregatedData.map(d => d.poids_poule),
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Guide (g)',
                data: aggregatedData.map(d => d.poids_guide),
                borderColor: '#9ca3af',
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
                tension: 0,
            },
            {
                label: 'Homogénéité (%)',
                data: aggregatedData.map(d => d.homog_pct),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: false,
                tension: 0.4,
                yAxisID: 'y1',
            }
        ]
    };

    const extendedChartOptions = {
        ...chartOptions,
        scales: {
            ...chartOptions.scales,
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                max: 100,
                grid: { drawOnChartArea: false },
                title: { display: true, text: 'Homogénéité (%)' }
            }
        }
    };

    // CONSO Data
    const consoData = {
        labels,
        datasets: [
            {
                label: 'Aliment Coq (kg)',
                data: aggregatedData.map(d => d.aliment_coq),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Aliment Poule (kg)',
                data: aggregatedData.map(d => d.aliment_poule),
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                fill: true,
                tension: 0.4,
            }
        ]
    };

    // MORTALITE Data
    const mortData = {
        labels,
        datasets: [
            {
                label: 'Mort. Coq (%)',
                data: aggregatedData.map(d => d.mort_coq_pct),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Mort. Poule (%)',
                data: aggregatedData.map(d => d.mort_poule_pct),
                borderColor: '#f97316',
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                fill: true,
                tension: 0.4,
            }
        ]
    };

    // EFFECTIF Data
    const effectifData = {
        labels,
        datasets: [
            {
                label: 'Effectif Coq',
                data: aggregatedData.map(d => d.effectif_coq),
                borderColor: '#2563eb', // Blue
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Effectif Poule',
                data: aggregatedData.map(d => d.effectif_poule),
                borderColor: '#db2777', // Pink
                backgroundColor: 'rgba(219, 39, 119, 0.1)',
                fill: true,
                tension: 0.4,
            }
        ]
    };

    const ChartCard = ({ title, icon: Icon, colorClass, children }) => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-tight">{title}</h3>
            </div>
            <div className="h-[300px]">
                {children}
            </div>
        </div>
    );

    if (aggregatedData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                    <TrendingUp size={48} className="text-gray-300" />
                </div>
                <p className="text-lg font-medium">Pas assez de données pour générer les graphiques</p>
                <p className="text-sm text-center">Ajoutez des fiches quotidiennes dans les parcs pour voir l'évolution.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartCard title="Evolution du Poids" icon={Scale} colorClass="bg-blue-500">
                    <Line data={poidsData} options={extendedChartOptions} />
                </ChartCard>

                <ChartCard title="Consommation Aliment" icon={Utensils} colorClass="bg-purple-500">
                    <Line data={consoData} options={chartOptions} />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartCard title="Evolution de la Mortalité" icon={AlertTriangle} colorClass="bg-red-500">
                    <Line data={mortData} options={chartOptions} />
                </ChartCard>

                <ChartCard title="Evolution de l'Effectif (Total Données)" icon={Users} colorClass="bg-emerald-500">
                    <Line data={effectifData} options={chartOptions} />
                </ChartCard>
            </div>
        </div>
    );
};

export default ElevageCharts;
