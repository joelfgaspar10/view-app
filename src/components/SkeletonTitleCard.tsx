import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Skeleton loader for TitleCard component
const SkeletonTitleCard: React.FC = () => {
  const shimmer = useRef(new Animated.Value(0)).current;
  const { isDark } = useTheme();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const baseBg = isDark ? '#2f3340' : '#d1d5db';
  const innerBg = isDark ? '#3a3f4c' : '#e5e7eb';

  return (
    <View
      style={{
        height: 128, // h-32
        borderRadius: 24, // rounded-2xl
        marginBottom: 20,
        backgroundColor: baseBg,
        overflow: 'hidden',
        flexDirection: 'row',
        padding: 12,
      }}
    >
      {/* Poster placeholder */}
      <View
        style={{
          width: 112, // w-28
            height: '100%',
          borderRadius: 16,
          backgroundColor: innerBg,
          marginRight: 12,
        }}
      />
      {/* Text / meta placeholder */}
      <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 4 }}>
        <View>
          <View style={{ height: 18, borderRadius: 8, backgroundColor: innerBg, width: '78%', marginBottom: 8 }} />
          <View style={{ height: 14, borderRadius: 7, backgroundColor: innerBg, width: '55%', marginBottom: 6 }} />
          <View style={{ height: 14, borderRadius: 7, backgroundColor: innerBg, width: '40%' }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <View style={{ height: 16, width: 42, borderRadius: 8, backgroundColor: innerBg, marginRight: 8 }} />
          <View style={{ height: 16, width: 60, borderRadius: 8, backgroundColor: innerBg }} />
        </View>
      </View>
      {/* Shimmer overlay */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '40%',
          opacity: 0.35,
          backgroundColor: isDark ? '#ffffff' : '#ffffff',
          transform: [{ translateX }],
        }}
      />
    </View>
  );
};

export default SkeletonTitleCard;
