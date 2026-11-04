import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchCommunitySettings, updateCommunitySettings } from '../services/communitySettingsService';

export const useCommunitySettings = (communityId) => {
  const [settings, setSettings] = useState(null);
  const [draftSettings, setDraftSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadSettings = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchCommunitySettings(communityId);
      setSettings(data);
      setDraftSettings(JSON.parse(JSON.stringify(data)));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [communityId]);

  const reloadSettings = useCallback(() => loadSettings(true), [loadSettings]);

  useEffect(() => {
    if (communityId) {
      loadSettings();
    }
  }, [communityId, loadSettings]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!settings || !draftSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(draftSettings);
  }, [settings, draftSettings]);

  // Handle nested object updates safely
  const updateDraft = useCallback((section, key, value) => {
    setDraftSettings(prev => {
      if (!prev) return prev;
      
      // If it's a top-level primitive (unlikely in our structure)
      if (typeof prev[section] !== 'object') {
        return { ...prev, [section]: value };
      }

      // If key is provided, it's a nested update
      if (key !== undefined) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [key]: value
          }
        };
      }
      
      // If no key is provided, we are replacing the whole section
      return {
        ...prev,
        [section]: value
      };
    });
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      const nextSettings = {
        ...draftSettings,
        auditTimeline: [
          { id: `${Date.now()}`, savedAt: new Date().toISOString(), summary: 'Community settings were updated.' },
          ...(draftSettings.auditTimeline || [])
        ].slice(0, 50)
      };
      await updateCommunitySettings(communityId, nextSettings);
      setSettings(nextSettings);
      setDraftSettings(nextSettings);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [communityId, draftSettings]);

  const discardChanges = useCallback(() => {
    setDraftSettings(JSON.parse(JSON.stringify(settings)));
  }, [settings]);

  const replaceDraftSettings = useCallback((nextSettings) => {
    if (nextSettings && typeof nextSettings === 'object' && !Array.isArray(nextSettings)) {
      setDraftSettings(nextSettings);
    }
  }, []);

  return {
    settings: draftSettings, // We expose draftSettings as 'settings' to the UI
    originalSettings: settings,
    loading,
    saving,
    error,
    hasUnsavedChanges,
    updateDraft,
    saveSettings,
    discardChanges,
    replaceDraftSettings,
    reload: reloadSettings
  };
};
