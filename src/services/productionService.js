import api from './api';
import { elevageService } from './elevageService';

export const productionService = {
    // Re-use ferme/batiment/parc helpers from elevageService
    getFermes: elevageService.getFermes,
    getBatiments: elevageService.getBatiments,
    getBatiment: elevageService.getBatiment,
    getParcs: elevageService.getParcs,
    getParc: elevageService.getParc,

    // Production records
    getRecords: async (filters = {}) => {
        const response = await api.get('/production/', { params: filters });
        return response.data;
    },
    createRecord: async (record) => {
        const response = await api.post('/production/', record);
        return response.data;
    },
    updateRecord: async (id, record) => {
        const response = await api.put(`/production/${id}`, record);
        return response.data;
    },
    deleteRecord: async (id) => {
        const response = await api.delete(`/production/${id}`);
        return response.data;
    },
};
