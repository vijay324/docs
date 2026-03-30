import { cacheManager } from './redis';

interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  totalRequests: number;
  averageResponseTime: number;
  slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: number;
  }>;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  vitals: {
    CLS: { value: number; samples: number };
    FCP: { value: number; samples: number };
    FID: { value: number; samples: number };
    INP: { value: number; samples: number };
    LCP: { value: number; samples: number };
    TTFB: { value: number; samples: number };
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    slowQueries: [],
    memoryUsage: {
      used: 0,
      total: 0,
      percentage: 0,
    },
    vitals: {
      CLS: { value: 0, samples: 0 },
      FCP: { value: 0, samples: 0 },
      FID: { value: 0, samples: 0 },
      INP: { value: 0, samples: 0 },
      LCP: { value: 0, samples: 0 },
      TTFB: { value: 0, samples: 0 },
    },
  };

  private responseTimes: number[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly MAX_SLOW_QUERIES = 100;

  recordCacheHit() {
    this.metrics.cacheHits++;
    this.metrics.totalRequests++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
    this.metrics.totalRequests++;
  }

  recordResponseTime(duration: number, query?: string) {
    this.responseTimes.push(duration);
    
    // Keep only last 1000 response times for average calculation
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
    
    // Calculate new average
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    
    // Record slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD && query) {
      this.metrics.slowQueries.push({
        query,
        duration,
        timestamp: Date.now(),
      });
      
      // Keep only recent slow queries
      if (this.metrics.slowQueries.length > this.MAX_SLOW_QUERIES) {
        this.metrics.slowQueries.shift();
      }
    }
  }

  async updateMemoryUsage() {
    try {
      const stats = await cacheManager.getCacheStats();
      // Estimate memory usage (this is approximate)
      const estimatedMemory = stats.totalKeys * 1024; // Rough estimate
      this.metrics.memoryUsage = {
        used: estimatedMemory,
        total: 256 * 1024 * 1024, // 256MB Upstash free tier limit
        percentage: (estimatedMemory / (256 * 1024 * 1024)) * 100,
      };
    } catch (error) {
      console.error('Failed to update memory usage:', error);
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getCacheHitRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.cacheHits / this.metrics.totalRequests) * 100;
  }

  getHealthScore(): number {
    const hitRate = this.getCacheHitRate();
    const memoryScore = Math.max(0, 100 - this.metrics.memoryUsage.percentage);
    const responseTimeScore = Math.max(0, 100 - (this.metrics.averageResponseTime / 10));
    const lcpScore = this.metrics.vitals.LCP.samples
      ? Math.max(0, 100 - (this.metrics.vitals.LCP.value / 25))
      : 100;
    
    return Math.round((hitRate + memoryScore + responseTimeScore + lcpScore) / 4);
  }

  reset() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      slowQueries: [],
      memoryUsage: {
        used: 0,
        total: 0,
        percentage: 0,
      },
      vitals: {
        CLS: { value: 0, samples: 0 },
        FCP: { value: 0, samples: 0 },
        FID: { value: 0, samples: 0 },
        INP: { value: 0, samples: 0 },
        LCP: { value: 0, samples: 0 },
        TTFB: { value: 0, samples: 0 },
      },
    };
    this.responseTimes = [];
  }

  // Performance optimization recommendations
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const hitRate = this.getCacheHitRate();
    const { LCP, CLS, INP } = this.metrics.vitals;
    
    if (hitRate < 50) {
      recommendations.push('Cache hit rate is low. Consider increasing TTL values or caching more data.');
    }
    
    if (this.metrics.memoryUsage.percentage > 80) {
      recommendations.push('Memory usage is high. Consider implementing cache eviction policies.');
    }
    
    if (this.metrics.averageResponseTime > 500) {
      recommendations.push('Average response time is high. Consider optimizing database queries.');
    }
    
    if (this.metrics.slowQueries.length > 10) {
      recommendations.push('Multiple slow queries detected. Review and optimize database indexes.');
    }
    
    if (LCP.samples && LCP.value > 2500) {
      recommendations.push('LCP is high. Optimize hero images, reduce render-blocking scripts, and defer non-critical JS.');
    }
    if (CLS.samples && CLS.value > 0.1) {
      recommendations.push('CLS is high. Reserve image/layout space and avoid late-inserted banners.');
    }
    if (INP.samples && INP.value > 200) {
      recommendations.push('INP is high. Reduce event handler work, memoize components, and virtualize long lists.');
    }
    
    return recommendations;
  }
  
  recordWebVital(name: keyof PerformanceMetrics['vitals'], value: number) {
    const current = this.metrics.vitals[name];
    const newSamples = current.samples + 1;
    const newValue = (current.value * current.samples + value) / newSamples;
    this.metrics.vitals[name] = { value: newValue, samples: newSamples };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Middleware wrapper for automatic performance tracking
export function withPerformanceTracking<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  queryName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      
      performanceMonitor.recordResponseTime(duration, queryName);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      performanceMonitor.recordResponseTime(duration, `${queryName}:error`);
      throw error;
    }
  };
}

// Auto-update memory usage every 5 minutes
const memoryUpdateTimer = setInterval(() => {
  performanceMonitor.updateMemoryUsage();
}, 5 * 60 * 1000);

// Avoid keeping Node.js alive only for this interval in server environments.
memoryUpdateTimer.unref?.();
