import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MemoryManager } from '../lib/performance';

interface PerformanceData {
  memoryUsage?: any;
  renderCount: number;
  lastRenderTime: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  componentName, 
  enabled = __DEV__ 
}) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    renderCount: 0,
    lastRenderTime: Date.now(),
  });

  useEffect(() => {
    if (!enabled) return;

    // Update render count
    setPerformanceData(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1,
      lastRenderTime: Date.now(),
    }));

    // Monitor memory usage
    const memoryUsage = MemoryManager.getMemoryUsage();
    if (memoryUsage) {
      setPerformanceData(prev => ({
        ...prev,
        memoryUsage,
      }));
    }
  });

  if (!enabled) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{componentName} Performance</Text>
      <Text style={styles.text}>Renders: {performanceData.renderCount}</Text>
      <Text style={styles.text}>
        Last Render: {new Date(performanceData.lastRenderTime).toLocaleTimeString()}
      </Text>
      {performanceData.memoryUsage && (
        <Text style={styles.text}>
          Memory: {Math.round(performanceData.memoryUsage.usedJSHeapSize / 1024 / 1024)}MB
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 4,
    zIndex: 9999,
  },
  title: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  text: {
    color: 'white',
    fontSize: 10,
  },
});

export default PerformanceMonitor;