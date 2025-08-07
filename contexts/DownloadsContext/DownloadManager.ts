import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { ID } from 'appwrite';
import { defaultCache } from '../../lib/performance';

/**
 * Download Manager
 * 
 * Handles the core download logic separate from React state management
 * to improve performance and reduce bundle size
 */
export interface DownloadItem {
  id: string;
  animeId: string;
  episodeNumber: string;
  audioType: 'sub' | 'dub';
  title: string;
  downloadUrl: string;
  thumbnail: string;
  filePath: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  size: number;
  dateAdded: number;
  resumeData?: string | null;
  isInGallery?: boolean;
}

export class DownloadManager {
  private activeDownloads = new Map<string, any>();
  private downloadQueue: DownloadItem[] = [];
  private maxConcurrentDownloads = 2;

  constructor() {
    this.setupNotifications();
  }

  private async setupNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted');
    }
  }

  async startDownload(item: Omit<DownloadItem, 'progress' | 'status' | 'dateAdded' | 'filePath' | 'size'>): Promise<void> {
    const downloadItem: DownloadItem = {
      ...item,
      progress: 0,
      status: 'pending',
      dateAdded: Date.now(),
      filePath: '',
      size: 0,
    };

    // Check if already downloading
    if (this.activeDownloads.has(downloadItem.id)) {
      throw new Error('Download already in progress');
    }

    // Add to queue if at capacity
    if (this.activeDownloads.size >= this.maxConcurrentDownloads) {
      this.downloadQueue.push(downloadItem);
      return;
    }

    await this.processDownload(downloadItem);
  }

  private async processDownload(downloadItem: DownloadItem): Promise<void> {
    try {
      this.activeDownloads.set(downloadItem.id, downloadItem);
      
      // Update status to downloading
      downloadItem.status = 'downloading';
      
      // Create notification
      await this.createDownloadNotification(downloadItem);

      // Start download
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadItem.downloadUrl,
        FileSystem.documentDirectory + `downloads/${downloadItem.id}.mp4`,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          downloadItem.progress = progress;
          
          // Update notification
          this.updateDownloadNotification(downloadItem);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();
      
      if (uri) {
        downloadItem.filePath = uri;
        downloadItem.status = 'completed';
        downloadItem.progress = 1;
        
        // Get file size
        const fileInfo = await FileSystem.getInfoAsync(uri);
        downloadItem.size = fileInfo.size || 0;
        
        // Complete notification
        await this.completeDownloadNotification(downloadItem, 'completed');
        
        // Process next in queue
        this.processNextInQueue();
      }
    } catch (error) {
      console.error('Download failed:', error);
      downloadItem.status = 'failed';
      await this.completeDownloadNotification(downloadItem, 'failed');
    } finally {
      this.activeDownloads.delete(downloadItem.id);
    }
  }

  private processNextInQueue(): void {
    if (this.downloadQueue.length > 0 && this.activeDownloads.size < this.maxConcurrentDownloads) {
      const nextItem = this.downloadQueue.shift();
      if (nextItem) {
        this.processDownload(nextItem);
      }
    }
  }

  async pauseDownload(id: string): Promise<boolean> {
    const download = this.activeDownloads.get(id);
    if (!download) return false;

    try {
      download.status = 'paused';
      // Implementation for pause logic
      return true;
    } catch (error) {
      console.error('Pause download error:', error);
      return false;
    }
  }

  async resumeDownload(id: string): Promise<boolean> {
    const download = this.activeDownloads.get(id);
    if (!download) return false;

    try {
      download.status = 'downloading';
      // Implementation for resume logic
      return true;
    } catch (error) {
      console.error('Resume download error:', error);
      return false;
    }
  }

  async cancelDownload(id: string): Promise<boolean> {
    const download = this.activeDownloads.get(id);
    if (!download) return false;

    try {
      download.status = 'failed';
      this.activeDownloads.delete(id);
      
      // Remove from queue if present
      this.downloadQueue = this.downloadQueue.filter(item => item.id !== id);
      
      await this.completeDownloadNotification(download, 'cancelled');
      return true;
    } catch (error) {
      console.error('Cancel download error:', error);
      return false;
    }
  }

  private async createDownloadNotification(downloadItem: DownloadItem): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Download Started',
          body: `Downloading ${downloadItem.title}`,
          data: { downloadId: downloadItem.id },
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Notification creation failed:', error);
    }
  }

  private async updateDownloadNotification(downloadItem: DownloadItem): Promise<void> {
    try {
      const progress = Math.round(downloadItem.progress * 100);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Download Progress',
          body: `${downloadItem.title} - ${progress}%`,
          data: { downloadId: downloadItem.id, progress },
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Notification update failed:', error);
    }
  }

  private async completeDownloadNotification(downloadItem: DownloadItem, status: 'completed' | 'failed' | 'cancelled'): Promise<void> {
    try {
      const statusText = status === 'completed' ? 'Completed' : status === 'failed' ? 'Failed' : 'Cancelled';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Download ${statusText}`,
          body: `${downloadItem.title} download ${statusText.toLowerCase()}`,
          data: { downloadId: downloadItem.id, status },
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Completion notification failed:', error);
    }
  }

  getActiveDownloads(): DownloadItem[] {
    return Array.from(this.activeDownloads.values());
  }

  getQueue(): DownloadItem[] {
    return [...this.downloadQueue];
  }

  isDownloading(id: string): boolean {
    return this.activeDownloads.has(id);
  }
}

// Export singleton instance
export const downloadManager = new DownloadManager();