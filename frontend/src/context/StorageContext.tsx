import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StorageDevice } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface StorageContextType {
  activeDevice: StorageDevice | null;
  devices: StorageDevice[];
  isLoading: boolean;
  refreshDevices: () => Promise<void>;
  selectActiveDevice: (deviceId: number) => Promise<void>;
  createDevice: (name: string, capacityKb: number, blockSizeKb: number) => Promise<void>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [activeDevice, setActiveDevice] = useState<StorageDevice | null>(null);
  const [devices, setDevices] = useState<StorageDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshDevices = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await api.getDevices();
      const devList: StorageDevice[] = res.devices || [];
      setDevices(devList);

      setActiveDevice((prevActive) => {
        if (prevActive) {
          const matching = devList.find((d) => d.id === prevActive.id);
          if (matching) return matching;
        }
        const active = devList.find((d) => d.is_active);
        if (active) return active;
        if (devList.length > 0) return devList[0];
        return prevActive;
      });

      if (devList.length === 0) {
        // Fetch or create default active
        const def = await api.getActiveDevice();
        if (def && def.device) {
          setActiveDevice(def.device);
          setDevices([def.device]);
        }
      }
    } catch (e) {
      console.error('Error refreshing storage devices:', e);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshDevices();
    }
  }, [token, refreshDevices]);

  const selectActiveDevice = async (deviceId: number) => {
    await api.activateDevice(deviceId);
    await refreshDevices();
  };

  const createDevice = async (name: string, capacityKb: number, blockSizeKb: number) => {
    await api.createDevice({ name, total_capacity_kb: capacityKb, block_size_kb: blockSizeKb });
    await refreshDevices();
  };

  return (
    <StorageContext.Provider value={{ activeDevice, devices, isLoading, refreshDevices, selectActiveDevice, createDevice }}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) throw new Error('useStorage must be used within StorageProvider');
  return context;
};

