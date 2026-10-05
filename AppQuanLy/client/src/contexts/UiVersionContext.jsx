import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { getSocketConfig } from '../services/api';
import { useAuth } from './AuthContext';

const LEGACY_VERSION = 'legacy';
const UiVersionContext = createContext(null);

const normalizeVersion = (value) => value === 'v2' ? 'v2' : LEGACY_VERSION;

export function UiVersionProvider({ children }) {
  const { user } = useAuth();
  const [uiVersion, setUiVersion] = useState(LEGACY_VERSION);
  const [loadingUiVersion, setLoadingUiVersion] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const isSystemAdmin = user?.username?.trim().toLowerCase() === 'admin';

  const applyConfig = useCallback((config) => {
    const version = normalizeVersion(config?.activeVersion);
    setUiVersion(version);
    setUpdatedAt(config?.updatedAt || null);
    document.body.dataset.uiVersion = version;
    return version;
  }, []);

  const loadUiVersion = useCallback(async ({ silent = false } = {}) => {
    if (!user) {
      applyConfig({ activeVersion: LEGACY_VERSION });
      setLoadingUiVersion(false);
      return LEGACY_VERSION;
    }

    if (!silent) setLoadingUiVersion(true);
    try {
      const response = await api.get('/ui-settings');
      return applyConfig(response?.config);
    } catch (error) {
      console.error('Không thể tải cấu hình giao diện, hệ thống sử dụng giao diện cũ:', error);
      return applyConfig({ activeVersion: LEGACY_VERSION });
    } finally {
      if (!silent) setLoadingUiVersion(false);
    }
  }, [applyConfig, user]);

  useEffect(() => {
    loadUiVersion();
  }, [loadUiVersion]);

  useEffect(() => {
    if (!user?._id) return undefined;

    let socket;
    let mounted = true;
    import('socket.io-client').then(({ io }) => {
      if (!mounted) return;
      const { url, options } = getSocketConfig();
      socket = io(url, options);
      socket.on('ui:version-changed', applyConfig);
    });

    return () => {
      mounted = false;
      socket?.disconnect();
    };
  }, [applyConfig, user?._id]);

  const updateUiVersion = useCallback(async (nextVersion) => {
    if (!isSystemAdmin) {
      throw new Error('Chỉ tài khoản quản trị hệ thống mới được thay đổi phiên bản giao diện');
    }

    const normalized = normalizeVersion(nextVersion);
    const response = await api.put('/ui-settings', { activeVersion: normalized });
    applyConfig(response?.config);
    return response;
  }, [applyConfig, isSystemAdmin]);

  const value = useMemo(() => ({
    uiVersion,
    loadingUiVersion,
    updatedAt,
    isSystemAdmin,
    loadUiVersion,
    updateUiVersion,
  }), [uiVersion, loadingUiVersion, updatedAt, isSystemAdmin, loadUiVersion, updateUiVersion]);

  return <UiVersionContext.Provider value={value}>{children}</UiVersionContext.Provider>;
}

export function useUiVersion() {
  const context = useContext(UiVersionContext);
  if (!context) throw new Error('useUiVersion phải được sử dụng bên trong UiVersionProvider');
  return context;
}

export default UiVersionContext;
