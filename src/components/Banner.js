import React, {useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {Colors, FontSizes} from '../constants/Constants';

const {width} = Dimensions.get('window');

const Banner = React.memo(({message, type = 'error', visible, onDismiss, duration = 4000}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const handleDismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss?.();
    });
  }, [onDismiss, slideAnim]);

  useEffect(() => {
    if (visible) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Auto dismiss after duration
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      // Slide up
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, duration, slideAnim, handleDismiss]);

  if (!visible) {
    return null;
  }

  const backgroundColor = type === 'error' ? '#FF6B6B' : type === 'success' ? '#51CF66' : '#74C0FC';
  const showLeftIcon = type === 'success' || type === 'info';
  const leftIcon = type === 'success' ? '✓' : 'ℹ';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{translateY: slideAnim}],
        },
      ]}>
      <View style={[styles.banner, {backgroundColor}]}>
        <View style={styles.content}>
          {showLeftIcon && <Text style={styles.icon}>{leftIcon}</Text>}
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 5,
  },
  banner: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  icon: {
    fontSize: 18,
    color: Colors.white,
    marginRight: 10,
    fontWeight: 'bold',
  },
  message: {
    flex: 1,
    fontSize: FontSizes.medium,
    color: Colors.white,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: 'bold',
  },
});

Banner.displayName = 'Banner';

export default Banner;
