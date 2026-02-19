import { useCallback } from 'react';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Track } from '@/types/music';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface OfflineDB extends DBSchema {
  tracks: {
    key: string;
    value: {
      id: string;
      metadata: Track;
      blob: Blob;
      downloadedAt: number;
    };
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>('purple-haze-offline', 1, {
      upgrade(db) {
        const store = db.createObjectStore('tracks', { keyPath: 'id' });
        store.createIndex('by-date', 'downloadedAt');
      },
    });
  }
  return dbPromise;
}

export function useOfflineTracks() {
  const qc = useQueryClient();

  const { data: downloadedTracks = [], isLoading } = useQuery({
    queryKey: ['offline-tracks'],
    queryFn: async () => {
      const db = await getDB();
      const all = await db.getAll('tracks');
      return all.map(item => item.metadata);
    },
    staleTime: Infinity,
  });

  const isDownloaded = useCallback((trackId: string) => {
    return downloadedTracks.some(t => t.id === trackId);
  }, [downloadedTracks]);

  const download = useMutation({
    mutationFn: async (track: Track) => {
      const db = await getDB();
      const existing = await db.get('tracks', track.id);
      if (existing) throw new Error('Already downloaded');

      const response = await fetch(track.audio);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      
      await db.put('tracks', {
        id: track.id,
        metadata: track,
        blob,
        downloadedAt: Date.now(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offline-tracks'] });
      toast.success('Downloaded for offline play');
    },
    onError: (err: any) => {
      if (err.message === 'Already downloaded') toast.info('Already downloaded');
      else toast.error('Download failed: ' + err.message);
    },
  });

  const removeDownload = useMutation({
    mutationFn: async (trackId: string) => {
      const db = await getDB();
      await db.delete('tracks', trackId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offline-tracks'] });
      toast.success('Removed download');
    },
  });

  const getOfflineUrl = useCallback(async (trackId: string): Promise<string | null> => {
    const db = await getDB();
    const item = await db.get('tracks', trackId);
    if (!item) return null;
    return URL.createObjectURL(item.blob);
  }, []);

  return { downloadedTracks, isDownloaded, download, removeDownload, getOfflineUrl, isLoading };
}

export function useIsOnline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}
