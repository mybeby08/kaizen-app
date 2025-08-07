import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Colors from '../../constants/Colors';

interface VideoControlsProps {
  showControls: boolean;
  isFullscreen: boolean;
  status: any;
  currentTime: number;
  duration: number;
  seeking: boolean;
  selectedSpeed: number;
  selectedQuality: string;
  qualityOptions: any[];
  onTogglePlayPause: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onSeeking: (value: number) => void;
  onSeek: (value: number) => void;
  onShowSpeedModal: () => void;
  onShowQualityModal: () => void;
  onDownload: () => void;
  onToggleFullscreen: () => void;
  onGoBack: () => void;
  onShare: () => void;
  title?: string;
  episode?: string;
  audioType?: string;
  formatTime: (time: number) => string;
}

const VideoControls = memo<VideoControlsProps>(({
  showControls,
  isFullscreen,
  status,
  currentTime,
  duration,
  seeking,
  selectedSpeed,
  selectedQuality,
  qualityOptions,
  onTogglePlayPause,
  onSkipBackward,
  onSkipForward,
  onSeeking,
  onSeek,
  onShowSpeedModal,
  onShowQualityModal,
  onDownload,
  onToggleFullscreen,
  onGoBack,
  onShare,
  title,
  episode,
  audioType,
  formatTime,
}) => {
  if (!showControls) return null;

  return (
    <View style={styles.controlsOverlay}>
      {/* Top controls bar */}
      <View style={styles.topControlsBar}>
        {isFullscreen && (
          <TouchableOpacity style={styles.topButton} onPress={onGoBack}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
        )}
        <Text style={styles.videoTitle} numberOfLines={1}>
          {title ? `${title} - ` : ''}Episode {episode} ({audioType === 'sub' ? 'Subbed' : 'Dubbed'})
        </Text>
        {isFullscreen && (
          <TouchableOpacity style={styles.topButton} onPress={onShare}>
            <MaterialCommunityIcons name="share-variant" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Center controls */}
      <View style={styles.centerControlsContainer}>
        <TouchableOpacity 
          style={styles.centerControlButton} 
          onPress={onSkipBackward}
        >
          <MaterialCommunityIcons 
            name="rewind-10" 
            size={36} 
            color="white" 
          />
        </TouchableOpacity>
        
        <View style={styles.centerButtonSpacer} />
        <View style={styles.centerButtonSpacer} />
        
        <TouchableOpacity 
          style={styles.centerButton} 
          onPress={onTogglePlayPause}
        >
          <MaterialCommunityIcons 
            name={status.isPlaying ? "pause" : "play"} 
            size={50} 
            color="white" 
          />
        </TouchableOpacity>
        
        <View style={styles.centerButtonSpacer} />
        <View style={styles.centerButtonSpacer} />
        
        <TouchableOpacity 
          style={styles.centerControlButton} 
          onPress={onSkipForward}
        >
          <MaterialCommunityIcons 
            name="fast-forward-10" 
            size={36} 
            color="white" 
          />
        </TouchableOpacity>
      </View>
      
      {/* Bottom controls bar */}
      <View style={styles.bottomControlsBar}>
        {/* Progress slider and timestamps */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={duration || 1}
            value={seeking ? currentTime : (status.positionMillis || 0)}
            onValueChange={onSeeking}
            onSlidingComplete={onSeek}
            minimumTrackTintColor={Colors.dark.buttonBackground}
            maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
            thumbTintColor={Colors.dark.buttonBackground}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
        
        {/* Bottom buttons row */}
        <View style={styles.bottomButtonsRow}>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={onTogglePlayPause}
          >
            <MaterialCommunityIcons 
              name={status.isPlaying ? "pause" : "play"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={onShowSpeedModal}
          >
            <MaterialCommunityIcons name="fast-forward" size={24} color="white" />
            <Text style={styles.buttonLabel}>{selectedSpeed}x</Text>
          </TouchableOpacity>
          
          {qualityOptions.length > 1 && (
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={onShowQualityModal}
            >
              <MaterialCommunityIcons name="quality-high" size={24} color="white" />
              <Text style={styles.buttonLabel}>{selectedQuality}</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={onDownload}
          >
            <MaterialCommunityIcons name="download" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={onToggleFullscreen}
          >
            <MaterialCommunityIcons 
              name={isFullscreen ? "fullscreen-exit" : "fullscreen"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = {
  controlsOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'space-between' as const,
  },
  topControlsBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  topButton: {
    padding: 8,
  },
  videoTitle: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  centerControlsContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 40,
  },
  centerControlButton: {
    padding: 16,
  },
  centerButton: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
  },
  centerButtonSpacer: {
    flex: 1,
  },
  bottomControlsBar: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  progressContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
    minWidth: 40,
  },
  progressSlider: {
    flex: 1,
    marginHorizontal: 8,
  },
  bottomButtonsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
  },
  controlButton: {
    alignItems: 'center' as const,
    padding: 8,
  },
  buttonLabel: {
    color: 'white',
    fontSize: 10,
    marginTop: 2,
  },
};

VideoControls.displayName = 'VideoControls';

export default VideoControls;