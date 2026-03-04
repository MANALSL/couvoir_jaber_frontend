import api from './api';

export const elevageService = {
    // Elevage Records
    getElevages: async (parcId = null) => {
        const params = parcId ? { parc_id: parcId } : {};
        const response = await api.get('/elevage/', { params });
        return response.data;
    },

    getLatestElevage: async (parcId) => {
        const response = await api.get(`/elevage/latest/${parcId}`);
        return response.data;
    },
    createElevage: async (elevage) => {
        const response = await api.post('/elevage/', elevage);
        return response.data;
    },

    updateElevage: async (id, updatedElevage) => {
        const response = await api.put(`/elevage/${id}`, updatedElevage);
        return response.data;
    },

    deleteElevage: async (id) => {
        const response = await api.delete(`/elevage/${id}`);
        return response.data;
    },
    getArchivedElevages: async (parcId = null) => {
        const params = parcId ? { parc_id: parcId } : {};
        const response = await api.get('/elevage/archived/', { params });
        return response.data;
    },
    restoreElevage: async (id) => {
        const response = await api.post(`/elevage/${id}/restore`);
        return response.data;
    },

    // Fermes
    getFermes: async () => {
        const response = await api.get('/fermes/');
        return response.data;
    },
    getFermeSummary: async (fermeId) => {
        const response = await api.get(`/fermes/${fermeId}/summary`);
        return response.data;
    },
    addFerme: async (ferme) => {
        const response = await api.post('/fermes/', ferme);
        return response.data;
    },
    updateFerme: async (id, updated) => {
        const response = await api.put(`/fermes/${id}`, updated);
        return response.data;
    },
    deleteFerme: async (id) => {
        const response = await api.delete(`/fermes/${id}`);
        return response.data;
    },

    // Batiments
    getBatiments: async (fermeId = null) => {
        const params = fermeId ? { ferme_id: fermeId } : {};
        const response = await api.get('/batiments/', { params });
        return response.data;
    },
    getBatiment: async (id) => {
        const response = await api.get(`/batiments/${id}`);
        return response.data;
    },
    getBatimentSummary: async (id) => {
        const response = await api.get(`/batiments/${id}/summary`);
        return response.data;
    },
    addBatiment: async (batiment) => {
        const response = await api.post('/batiments/', batiment);
        return response.data;
    },
    updateBatiment: async (id, updated) => {
        const response = await api.put(`/batiments/${id}`, updated);
        return response.data;
    },
    deleteBatiment: async (id) => {
        const response = await api.delete(`/batiments/${id}`);
        return response.data;
    },

    // Parcs
    getParcs: async (batimentId = null) => {
        const params = batimentId ? { batiment_id: batimentId } : {};
        const response = await api.get('/parcs/', { params });
        return response.data;
    },
    getParc: async (id) => {
        const response = await api.get(`/parcs/${id}`);
        return response.data;
    },
    addParc: async (parc) => {
        const response = await api.post('/parcs/', parc);
        return response.data;
    },
    updateParc: async (id, updated) => {
        const response = await api.put(`/parcs/${id}`, updated);
        return response.data;
    },
    deleteParc: async (id) => {
        const response = await api.delete(`/parcs/${id}`);
        return response.data;
    },
    restoreParc: async (id) => {
        const response = await api.post(`/parcs/${id}/restore`);
        return response.data;
    },

    // Analytics & KPIs
    getGlobalKPIs: async () => {
        const response = await api.get('/analytics/kpis/global');
        return response.data;
    },

    getFermeKPIs: async (fermeId) => {
        const response = await api.get(`/analytics/kpis/ferme/${fermeId}`);
        return response.data;
    },

    getBatimentKPIs: async (batimentId) => {
        const response = await api.get(`/analytics/kpis/batiment/${batimentId}`);
        return response.data;
    },

    getParcKPIs: async (parcId) => {
        const response = await api.get(`/analytics/kpis/parc/${parcId}`);
        return response.data;
    },

    // Chart Data
    getPerformanceCharts: async (filters = {}) => {
        const response = await api.get('/analytics/charts/performance', { params: filters });
        return response.data;
    },

    getWeightTrends: async (parcId, days = 30) => {
        const response = await api.get('/analytics/trends/weight', {
            params: { parc_id: parcId, days }
        });
        return response.data;
    },

    getConsumptionTrends: async (parcId, days = 30) => {
        const response = await api.get('/analytics/trends/consumption', {
            params: { parc_id: parcId, days }
        });
        return response.data;
    },

    getMortalityTrends: async (parcId, days = 30) => {
        const response = await api.get('/analytics/trends/mortality', {
            params: { parc_id: parcId, days }
        });
        return response.data;
    },

    // Import/Export
    importElevages: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/elevage/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    exportElevages: async (parcId = null) => {
        const params = parcId ? { parc_id: parcId } : {};
        const response = await api.get('/elevage/export', {
            params,
            responseType: 'blob'
        });
        return response.data;
    }
};
