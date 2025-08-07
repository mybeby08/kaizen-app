import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Performance Optimization Utilities
 * 
 * Collection of utilities to optimize app performance:
 * - AsyncStorage caching with TTL
 * - Memoization helpers
 * - Bundle size optimization
 * - Memory management
 */

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50; // Maximum number of cached items

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  ttl?: number;
  maxSize?: number;
}

/**
 * Optimized AsyncStorage Cache
 * 
 * Provides intelligent caching with TTL, size limits, and automatic cleanup
 */
export class OptimizedCache {
  private cache = new Map<string, CacheItem<any>>();
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl || CACHE_TTL,
      maxSize: config.maxSize || MAX_CACHE_SIZE,
    };
  }

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Check AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const item: CacheItem<T> = JSON.parse(stored);
        if (Date.now() - item.timestamp < item.ttl) {
          // Update memory cache
          this.cache.set(key, item);
          this.cleanupCache();
          return item.data;
        } else {
          // Remove expired item
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Cache get error:', error);
    }

    return null;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
    };

    // Update memory cache
    this.cache.set(key, item);
    this.cleanupCache();

    // Update AsyncStorage
    try {
      await AsyncStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  async remove(key: string): Promise<void> {
    this.cache.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('Cache remove error:', error);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    // Note: This would clear all AsyncStorage, use with caution
    // await AsyncStorage.clear();
  }

  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Remove expired items
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    // Remove oldest items if cache is too large
    if (this.cache.size > this.config.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.config.maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }
}

/**
 * Memoization Helper
 * 
 * Provides memoization for expensive operations with cache invalidation
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyFn?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, { result: any; timestamp: number }>();
  const TTL = 5 * 60 * 1000; // 5 minutes

  return ((...args: Parameters<T>) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < TTL) {
      return cached.result;
    }

    const result = fn(...args);
    cache.set(key, { result, timestamp: Date.now() });

    // Cleanup old entries
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > TTL) {
        cache.delete(k);
      }
    }

    return result;
  }) as T;
}

/**
 * Debounce Helper
 * 
 * Debounces function calls to prevent excessive execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle Helper
 * 
 * Throttles function calls to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Bundle Size Optimization
 * 
 * Utilities to help reduce bundle size
 */
export const BundleOptimizer = {
  // Lazy load components
  lazyLoad: <T>(importFn: () => Promise<{ default: T }>) => {
    let component: T | null = null;
    let promise: Promise<T> | null = null;

    return () => {
      if (component) return Promise.resolve(component);
      if (promise) return promise;

      promise = importFn().then(module => {
        component = module.default;
        return component;
      });

      return promise;
    };
  },

  // Preload critical components
  preload: <T>(importFn: () => Promise<{ default: T }>) => {
    importFn().catch(console.warn);
  },
};

/**
 * Memory Management
 * 
 * Utilities for better memory management
 */
export const MemoryManager = {
  // Track memory usage (approximate)
  getMemoryUsage: () => {
    if (global.performance && global.performance.memory) {
      return global.performance.memory;
    }
    return null;
  },

  // Force garbage collection if available
  forceGC: () => {
    if (global.gc) {
      global.gc();
    }
  },

  // Monitor memory usage
  startMemoryMonitoring: (callback?: (usage: any) => void) => {
    if (typeof setInterval !== 'undefined') {
      return setInterval(() => {
        const usage = MemoryManager.getMemoryUsage();
        if (usage && callback) {
          callback(usage);
        }
      }, 30000); // Check every 30 seconds
    }
    return null;
  },
};

// Export default cache instance
export const defaultCache = new OptimizedCache();