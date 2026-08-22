import { useState, useEffect } from 'react';
import { cardColors } from '../data/mockProfessionals';
import { professionalService } from '../../../core/api/professionalService';
import { axiosPublic } from '../../../core/api/axiosConfig';

// ─────────────────────────────────────────────────────────────────────────────
//  useProfessionalDirectory — API Custom Hook
// ─────────────────────────────────────────────────────────────────────────────

const useProfessionalDirectory = (communityId, filterParams = {}) => {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Serialize filterParams for stable dependency tracking
  const filterParamsKey = JSON.stringify(filterParams);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchCitiesPromise = (async () => {
          try {
            const res = await axiosPublic.get('/auth/cities');
            return res.data?.success ? res.data.data.map(c => c.name) : [];
          } catch {
            return [];
          }
        })();

        // Parallel execution of all independent API calls
        const [res, catRes, apiCityNames] = await Promise.all([
          professionalService.getProfessionals(filterParams),
          professionalService.getCategories(),
          fetchCitiesPromise
        ]);

        const apiListings = res.success ? res.data : [];
        if (res.pagination) {
          setPagination(res.pagination);
        }

        // Enrich listings with card colors
        const enriched = apiListings.map((item, idx) => ({
          ...item,
          color: item.color || cardColors[idx % cardColors.length],
        }));

        const apiCategories = catRes.success ? catRes.data : [];

        const colorPalette = [
          { text: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: 'GraduationCap' },
          { text: 'text-rose-600 bg-rose-50 border-rose-100', icon: 'Heart' },
          { text: 'text-gray-650 bg-gray-50 border-gray-100', icon: 'MoreHorizontal' },
          { text: 'text-sky-600 bg-sky-50 border-sky-100', icon: 'Hammer' },
          { text: 'text-orange-600 bg-orange-50 border-orange-100', icon: 'Building' },
          { text: 'text-violet-600 bg-violet-50 border-violet-100', icon: 'Briefcase' }
        ];

        let derivedCategories = apiCategories.map((cat, idx) => {
          const colorMatch = colorPalette[idx % colorPalette.length];
          return {
            id: cat.key,
            name: cat.name,
            categoryKey: cat.key,
            iconName: cat.icon || colorMatch.icon,
            color: colorMatch.text
          };
        });

        // Ensure "Others" category is placed at the very end of the list
        const othersIndex = derivedCategories.findIndex(c => c.categoryKey?.toLowerCase() === 'others');
        if (othersIndex > -1) {
          const othersCat = derivedCategories[othersIndex];
          derivedCategories.splice(othersIndex, 1);
          derivedCategories.push(othersCat);
        }

        // Derive unique cities dynamically from listings and API fallback
        let uniqueCities = ['All Cities', ...Array.from(new Set([...enriched.map(p => p.city).filter(Boolean), ...apiCityNames])).sort()];

        setListings(enriched);
        setCategories(derivedCategories);
        setCities(uniqueCities);

      } catch (err) {
        console.error('[useProfessionalDirectory] Error:', err);
        setError(err.message || 'Failed to load professional listings.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [communityId, filterParamsKey]);

  return { listings, categories, cities, pagination, isLoading, error };
};

export default useProfessionalDirectory;
