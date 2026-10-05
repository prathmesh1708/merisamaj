import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchCommunitySettings, updateCommunitySettings } from '../services/communitySettingsService';

export const useCommunitySettings = (communityId) => {
  const [settings, setSettings] = useState(null);
  const [draftSettings, setDraftSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCommunitySettings(communityId);
      setSettings(data);
      setDraftSettings(data); // clone essentially
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

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
      await updateCommunitySettings(communityId, draftSettings);
      setSettings(draftSettings); // Sync settings with draft
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [communityId, draftSettings]);

  const discardChanges = useCallback(() => {
    setDraftSettings(settings);
  }, [settings]);

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
    reload: loadSettings
  };
};
