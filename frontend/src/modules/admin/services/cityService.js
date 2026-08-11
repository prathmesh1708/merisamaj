import { axiosPrivate } from '../../../core/api/axiosPrivate';
import { getApiUrl } from '../../../core/api/axiosConfig';

const API_BASE = `${getApiUrl()}/admin/cities`;

export const cityService = {
  fetchCities: async () => {
    try {
      const response = await axiosPrivate.get(API_BASE);
      // Map _id to id for frontend components, Map isActive to status
      return response.data.data.map(city => ({
        ...city,
        id: city._id,
        status: city.isActive ? 'Active' : 'Disabled'
      }));
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch cities');
    }
  },

  addCity: async (cityData) => {
    try {
      const payload = {
        name: cityData.name,
        state: cityData.state,
        country: cityData.country,
        isActive: cityData.status === 'Active'
      };
      const response = await axiosPrivate.post(API_BASE, payload);
      const city = response.data.data;
      return {
        ...city,
        id: city._id,
        status: city.isActive ? 'Active' : 'Disabled',
        communitiesCount: 0,
        membersCount: 0
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add city');
    }
  },

  updateCity: async (id, cityData) => {
    try {
      let payload = {};
      if (cityData.name !== undefined) payload.name = cityData.name;
      if (cityData.state !== undefined) payload.state = cityData.state;
      if (cityData.country !== undefined) payload.country = cityData.country;
      if (cityData.status !== undefined) payload.isActive = cityData.status === 'Active';

      const response = await axiosPrivate.put(`${API_BASE}/${id}`, payload);
      const city = response.data.data;
      return {
        ...city,
        id: city._id,
        status: city.isActive ? 'Active' : 'Disabled'
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update city');
    }
  },

  deleteCity: async (id) => {
    // Soft disable instead of delete
    try {
      await axiosPrivate.patch(`${API_BASE}/${id}/status`);
      return true;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to disable city');
    }
  }
};
