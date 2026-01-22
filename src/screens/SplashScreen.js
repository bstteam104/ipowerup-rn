import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import {Colors} from '../constants/Constants';
import {isUserLoggedIn} from '../services/AuthService';

const {width, height} = Dimensions.get('window');

const SplashScreen = ({navigation}) => {
  const [progress, setProgress] = useState(0);
  const logoAnim = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    // Logo animation from left animation
    Animated.timing(logoAnim, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Progress bar animation timer interval of 0.05
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
      const isLoggedIn = await isUserLoggedIn();
      if (isLoggedIn) {
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.splashBlue} />
      
      {/* Background gradient look */}
      <View style={styles.backgroundContainer}>
        <View style={styles.backgroundOverlay} />
      </View>

      {/* Logo with animation exactly */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{translateX: logoAnim}],
          },
        ]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Loading Text */}
      <Text style={styles.loadingText}>Loading</Text>

      {/* Progress Bar progressView styling */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View 
            style={[
              styles.progressBarFill, 
              {width: `${progress * 100}%`}
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.splashBlue,
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
    backgroundColor: Colors.splashLightBlue,
    opacity: 0.7,
  },
  logoContainer: {
    width: width * 0.61, // 61% 
    height: height * 0.15, // 15% 
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
    tintColor: Colors.white,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 20,
    textAlign: 'center',
  },
  progressContainer: {
    width: width * 0.46875, // 46.875% 
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
    backgroundColor: Colors.progressYellow,
    borderRadius: 4,
  },
});

export default SplashScreen;
