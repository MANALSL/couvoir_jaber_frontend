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

const ParkPerformanceChart = ({ data, height = 200 }) => {
    // Sort and Aggregate data by date
    const aggregatedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const dateMap = {};
        // Filter out deleted
        const validData = data.filter(d => !d.deleted && !d.is_deleted);

        validData.forEach(item => {
            const date = item.date;
            if (!dateMap[date]) dateMap[date] = [];
            dateMap[date].push(item);
        });

        const sortedDates = Object.keys(dateMap).sort();

        return sortedDates.map(date => {
            const records = dateMap[date];

            // Averages
            const recCoq = records.map(r => parseFloat(r.poids_coq)).filter(v => !isNaN(v) && v > 0);
            const recPoule = records.map(r => parseFloat(r.poids_poule)).filter(v => !isNaN(v) && v > 0);
            const recGuide = records.map(r => parseFloat(r.poids_guide)).filter(v => !isNaN(v) && v > 0);
            const recHomog = records.map(r => parseFloat(r.homog_pct)).filter(v => !isNaN(v) && v > 0);

            // Sum Ration
            const totalAlimentPoule = records.reduce((s, r) => s + (parseFloat(r.aliment_poule) || 0), 0);

            return {
                date,
                age: records[0].age, // Take age from first record of the day
                poids_coq: recCoq.length > 0 ? recCoq.reduce((a, b) => a + b, 0) / recCoq.length : null,
                poids_poule: recPoule.length > 0 ? recPoule.reduce((a, b) => a + b, 0) / recPoule.length : null,
                poids_guide: recGuide.length > 0 ? recGuide.reduce((a, b) => a + b, 0) / recGuide.length : null,
                homog_pct: recHomog.length > 0 ? recHomog.reduce((a, b) => a + b, 0) / recHomog.length : null,
                aliment_poule: totalAlimentPoule
            };
        });
    }, [data]);

    const labels = aggregatedData.map(d => d.age ? `J${d.age}` : d.date);

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Poids Coq (g)',
                data: aggregatedData.map(d => d.poids_coq),
                borderColor: '#3b82f6', // Blue
                backgroundColor: '#3b82f6',
                borderWidth: 2,
                pointRadius: 2,
                yAxisID: 'yWeights',
                tension: 0.2,
            },
            {
                label: 'Poids Poule (g)',
                data: aggregatedData.map(d => d.poids_poule),
                borderColor: '#db2777', // Pink
                backgroundColor: '#db2777',
                borderWidth: 2,
                pointRadius: 2,
                yAxisID: 'yWeights',
                tension: 0.2,
            },
            {
                label: 'Guide (g)',
                data: aggregatedData.map(d => d.poids_guide),
                borderColor: '#9ca3af', // Gray
                backgroundColor: '#9ca3af',
                borderWidth: 1,
                borderDash: [4, 4],
                pointRadius: 0,
                yAxisID: 'yWeights',
                tension: 0,
            },
            {
                label: 'Ration (g)',
                data: aggregatedData.map(d => d.aliment_poule),
                borderColor: '#f59e0b', // Yellow
                backgroundColor: '#f59e0b',
                borderWidth: 2,
                pointRadius: 2,
                yAxisID: 'yOthers',
                tension: 0.1,
            },
            {
                label: 'Homogénéité (%)',
                data: aggregatedData.map(d => d.homog_pct),
                borderColor: '#10b981', // Emerald
                backgroundColor: '#10b981',
                borderWidth: 2,
                pointRadius: 2,
                yAxisID: 'yOthers',
                tension: 0.1,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    boxWidth: 6,
                    font: { size: 10, weight: 'bold' },
                    padding: 8
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1f2937',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 8,
                boxPadding: 4,
                usePointStyle: true
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { size: 9 }, color: '#9ca3af', maxRotation: 0, autoSkip: true }
            },
            yWeights: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                grid: { color: '#f3f4f6' },
                ticks: { font: { size: 9 }, color: '#9ca3af' }
            },
            yOthers: {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                suggestedMax: 100,
                grid: { drawOnChartArea: false },
                ticks: { display: false } // Hide ticks to save space on small cards
            }
        },
        interaction: {
            intersect: false,
            mode: 'index',
        },
    };

    return (
        <div style={{ height: `${height}px` }} className="w-full">
            <Line data={chartData} options={options} />
        </div>
    );
};

export default ParkPerformanceChart;
