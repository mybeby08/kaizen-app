import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert } from 'react-native';
import { downloadManager, DownloadItem } from './DownloadManager';
import { defaultCache, memoize, debounce } from '../../lib/performance';

// Storage key for downloads
const DOWNLOADS_STORAGE_KEY = '@kaizen_downloads';

interface DownloadsContextType {
  // State properties
  downloads: DownloadItem[];
  currentDownloads: DownloadItem[];
  downloadQueue: DownloadItem[];
  totalStorageUsed: number;
  isDownloading: boolean;
  downloadPermissionGranted: boolean;
  
  // Download management actions
  startDownload: (item: Omit<DownloadItem, 'progress' | 'status' | 'dateAdded' | 'filePath' | 'size'>) => Promise<void>;
  pauseDownload: (id: string) => Promise<boolean>;
  resumeDownload: (id: string) => Promise<boolean>;
  cancelDownload: (id: string) => Promise<boolean>;
  removeDownload: (id: string) => Promise<boolean>;
  clearAllDownloads: () => Promise<boolean>;
  
  // Query helpers
  getDownloadById: (id: string) => DownloadItem | undefined;
  getDownloadsByAnimeId: (animeId: string) => DownloadItem[];
  requestDownloadPermissions: () => Promise<boolean>;
  validateAndCleanupDownloads: () => Promise<void>;
}

const DownloadsContext = createContext<DownloadsContextType | undefined>(undefined);

export const useDownloads = () => {
  const context = useContext(DownloadsContext);
  if (!context) {
    throw new Error('useDownloads must be used within a DownloadsProvider');
  }
  return context;
};

export const DownloadsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [downloadPermissionGranted, setDownloadPermissionGranted] = useState(false);

  // Memoized computed values
  const currentDownloads = useMemo(() => 
    downloads.filter(d => d.status === 'downloading' || d.status === 'pending'),
    [downloads]
  );

  const downloadQueue = useMemo(() => 
    downloads.filter(d => d.status === 'pending'),
    [downloads]
  );

  const isDownloading = useMemo(() => 
    currentDownloads.length > 0,
    [currentDownloads]
  );

  const totalStorageUsed = useMemo(() => 
    downloads
      .filter(d => d.status === 'completed')
      .reduce((total, d) => total + d.size, 0),
    [downloads]
  );

  // Memoized query functions
  const getDownloadById = useCallback((id: string) => 
    downloads.find(d => d.id === id),
    [downloads]
  );

  const getDownloadsByAnimeId = useCallback((animeId: string) => 
    downloads.filter(d => d.animeId === animeId),
    [downloads]
  );

  // Debounced save function
  const saveDownloads = useCallback(
    debounce(async (downloadsToSave: DownloadItem[]) => {
      try {
        await defaultCache.set(DOWNLOADS_STORAGE_KEY, downloadsToSave);
      } catch (error) {
        console.error('Error saving downloads:', error);
      }
    }, 1000),
    []
  );

  // Load downloads from storage
  const loadDownloads = useCallback(async () => {
    try {
      const cached = await defaultCache.get<DownloadItem[]>(DOWNLOADS_STORAGE_KEY);
      if (cached) {
        setDownloads(cached);
      }
    } catch (error) {
      console.error('Error loading downloads:', error);
    }
  }, []);

  // Initialize downloads
  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  // Save downloads when they change
  useEffect(() => {
    saveDownloads(downloads);
  }, [downloads, saveDownloads]);

  // Request permissions
  const requestDownloadPermissions = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setDownloadPermissionGranted(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }, []);

  // Start download
  const startDownload = useCallback(async (
    item: Omit<DownloadItem, 'progress' | 'status' | 'dateAdded' | 'filePath' | 'size'>
  ) => {
    try {
      await downloadManager.startDownload(item);
      
      // Add to local state
      const newDownload: DownloadItem = {
        ...item,
        progress: 0,
        status: 'pending',
        dateAdded: Date.now(),
        filePath: '',
        size: 0,
      };
      
      setDownloads(prev => [...prev, newDownload]);
    } catch (error) {
      console.error('Start download error:', error);
      Alert.alert('Download Error', 'Failed to start download. Please try again.');
    }
  }, []);

  // Pause download
  const pauseDownload = useCallback(async (id: string) => {
    try {
      const success = await downloadManager.pauseDownload(id);
      if (success) {
        setDownloads(prev => 
          prev.map(d => d.id === id ? { ...d, status: 'paused' as const } : d)
        );
      }
      return success;
    } catch (error) {
      console.error('Pause download error:', error);
      return false;
    }
  }, []);

  // Resume download
  const resumeDownload = useCallback(async (id: string) => {
    try {
      const success = await downloadManager.resumeDownload(id);
      if (success) {
        setDownloads(prev => 
          prev.map(d => d.id === id ? { ...d, status: 'downloading' as const } : d)
        );
      }
      return success;
    } catch (error) {
      console.error('Resume download error:', error);
      return false;
    }
  }, []);

  // Cancel download
  const cancelDownload = useCallback(async (id: string) => {
    try {
      const success = await downloadManager.cancelDownload(id);
      if (success) {
        setDownloads(prev => prev.filter(d => d.id !== id));
      }
      return success;
    } catch (error) {
      console.error('Cancel download error:', error);
      return false;
    }
  }, []);

  // Remove completed download
  const removeDownload = useCallback(async (id: string) => {
    try {
      const download = downloads.find(d => d.id === id);
      if (!download) return false;

      // Remove file if it exists
      if (download.filePath) {
        try {
          await FileSystem.deleteAsync(download.filePath);
        } catch (error) {
          console.warn('File deletion failed:', error);
        }
      }

      setDownloads(prev => prev.filter(d => d.id !== id));
      return true;
    } catch (error) {
      console.error('Remove download error:', error);
      return false;
    }
  }, [downloads]);

  // Clear all downloads
  const clearAllDownloads = useCallback(async () => {
    try {
      // Remove all files
      const completedDownloads = downloads.filter(d => d.status === 'completed');
      for (const download of completedDownloads) {
        if (download.filePath) {
          try {
            await FileSystem.deleteAsync(download.filePath);
          } catch (error) {
            console.warn('File deletion failed:', error);
          }
        }
      }

      setDownloads([]);
      return true;
    } catch (error) {
      console.error('Clear downloads error:', error);
      return false;
    }
  }, [downloads]);

  // Validate and cleanup downloads
  const validateAndCleanupDownloads = useCallback(async () => {
    try {
      const validDownloads: DownloadItem[] = [];
      
      for (const download of downloads) {
        if (download.status === 'completed' && download.filePath) {
          const fileExists = await FileSystem.getInfoAsync(download.filePath);
          if (fileExists.exists) {
            validDownloads.push(download);
          }
        } else if (download.status !== 'completed') {
          validDownloads.push(download);
        }
      }

      if (validDownloads.length !== downloads.length) {
        setDownloads(validDownloads);
      }
    } catch (error) {
      console.error('Validation error:', error);
    }
  }, [downloads]);

  const contextValue = useMemo(() => ({
    downloads,
    currentDownloads,
    downloadQueue,
    totalStorageUsed,
    isDownloading,
    downloadPermissionGranted,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeDownload,
    clearAllDownloads,
    getDownloadById,
    getDownloadsByAnimeId,
    requestDownloadPermissions,
    validateAndCleanupDownloads,
  }), [
    downloads,
    currentDownloads,
    downloadQueue,
    totalStorageUsed,
    isDownloading,
    downloadPermissionGranted,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    removeDownload,
    clearAllDownloads,
    getDownloadById,
    getDownloadsByAnimeId,
    requestDownloadPermissions,
    validateAndCleanupDownloads,
  ]);

  return (
    <DownloadsContext.Provider value={contextValue}>
      {children}
    </DownloadsContext.Provider>
  );
};