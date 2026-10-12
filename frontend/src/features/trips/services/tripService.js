import { apiClient } from "@/services/apiClient";

export const tripService = {
  getTrips: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/trips?${queryString}` : "/trips";
    return apiClient.get(endpoint);
  },

  getTripById: async (id) => {
    return apiClient.get(`/trips/${id}`);
  },

  createTrip: async (tripData) => {
    return apiClient.post("/trips", tripData);
  },

  updateTrip: async (id, tripData) => {
    return apiClient.put(`/trips/${id}`, tripData);
  },

  deleteTrip: async (id) => {
    return apiClient.delete(`/trips/${id}`);
  },
};
