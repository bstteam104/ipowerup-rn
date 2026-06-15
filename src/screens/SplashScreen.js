import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {Colors} from '../constants/Constants';
import {isUserLoggedIn} from '../services/AuthService';

const {width, height} = Dimensions.get('window');

const SplashScreen = ({navigation}) => {
  const [progress, setProgress] = useState(0);
  const logoAnim = useRef(new Animated.Value(-width)).current;
  const autoNavTimerRef = useRef(null);
  const skipAutoNavigationRef = useRef(false);

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
        if (skipAutoNavigationRef.current) {
          return;
        }
        checkLoginStatus();
      }, 100);
      autoNavTimerRef.current = timer;
      return () => {
        clearTimeout(timer);
        autoNavTimerRef.current = null;
      };
    }
  }, [progress]);

  const checkLoginStatus = async () => {
    if (skipAutoNavigationRef.current) {
      return;
    }
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

  const handleTakeTour = async () => {
    skipAutoNavigationRef.current = true;
    if (autoNavTimerRef.current) {
      clearTimeout(autoNavTimerRef.current);
      autoNavTimerRef.current = null;
    }
    try {
      const loggedIn = await isUserLoggedIn();
      if (loggedIn) {
        navigation.navigate('AppTour', {fromSplashWhileLoggedIn: true});
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error checking login for tour:', error);
      navigation.replace('Login');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.splashBlue} />
      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.backgroundOverlay} />

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

      <Text style={styles.headingText}>
        Never Get Surprised by a Dead Phone Again
      </Text>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.takeTourButton}
        onPress={handleTakeTour}>
        <Text style={styles.takeTourText}>Take the Tour</Text>
      </TouchableOpacity>

      <View style={styles.footerArea}>
        <Text style={styles.loadingText}>Loading</Text>
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {width: `${progress * 100}%`},
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
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#55B0DE',
    opacity: 0.6,
  },
  logoContainer: {
    width: '84%',
    height: height * 0.15,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: height * 0.1,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  headingText: {
    marginTop: height * 0.08,
    width: '84%',
    fontSize: 36,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'left',
    lineHeight: 44,
  },
  takeTourButton: {
    marginTop: 26,
    width: '84%',
    height: 50,
    borderRadius: 12,
    // Same yellow as loading bar fill + Profile "Connect New Device" (Colors.progressYellow)
    backgroundColor: Colors.progressYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takeTourText: {
    color: Colors.black,
    fontSize: 14,
    fontWeight: '600',
  },
  footerArea: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressContainer: {
    width: width * 0.46875,
    height: 8,
    backgroundColor: Colors.white,
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: Colors.white,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: Colors.progressYellow,
    borderRadius: 4,
  },
});

export default SplashScreen;
