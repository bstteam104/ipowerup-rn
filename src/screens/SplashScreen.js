import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors} from '../constants/Constants';

const SplashScreen = ({navigation}) => {
  const [progress, setProgress] = useState(0);
  const logoAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    // Logo animation from left
    Animated.timing(logoAnim, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Progress bar animation
    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 0.04;
        if (newProgress >= 1.0) {
          clearInterval(timer);
          return 1.0;
        }
        return newProgress;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [logoAnim]);

  useEffect(() => {
    if (progress >= 1.0) {
      const timer = setTimeout(() => {
        checkLoginStatus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  const checkLoginStatus = async () => {
    try {
      const loggedInUser = await AsyncStorage.getItem('loggedInUser');
      if (loggedInUser) {
        navigation.replace('TabBar');
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      navigation.replace('Login');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#57AEE3" />
      {/* Background overlay */}
      <View style={styles.backgroundContainer}>
        <View style={styles.backgroundOverlay} />
      </View>

      {/* Logo with animation */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{translateX: logoAnim}],
          },
        ]}>
        <Image
          source={require('../../assets/logo.png')}
          style={[styles.logo, {tintColor: '#FFFFFF'}]}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Loading Text */}
      <Text style={styles.loadingText}>Loading</Text>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, {width: `${progress * 100}%`}]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#57AEE3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: '#7AC5EA',
    opacity: 0.7,
  },
  logoContainer: {
    width: '61%',
    height: '15%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 20,
    textAlign: 'center',
  },
  progressContainer: {
    width: '46.875%',
    marginTop: 20,
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.white,
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: Colors.white,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFCC00',
    borderRadius: 4,
  },
});

export default SplashScreen;
