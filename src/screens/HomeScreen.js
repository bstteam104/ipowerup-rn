import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  SafeAreaView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

// Battery images
const getBatteryImage = (level) => {
  if (level >= 90) return require('../../assets/batteries/bat_100.png');
  if (level >= 80) return require('../../assets/batteries/bat_80.png');
  if (level >= 70) return require('../../assets/batteries/bat_70.png');
  if (level >= 60) return require('../../assets/batteries/bat_60.png');
  if (level >= 50) return require('../../assets/batteries/bat_50.png');
  if (level >= 40) return require('../../assets/batteries/bat_40.png');
  if (level >= 30) return require('../../assets/batteries/bat_30.png');
  if (level >= 20) return require('../../assets/batteries/bat_20.png');
  if (level >= 10) return require('../../assets/batteries/bat_10.png');
  return require('../../assets/batteries/bat_0.png');
};

const getTemperatureImage = (temp, unit = 'celsius') => {
  let celsius = temp;
  if (unit === 'fahrenheit') celsius = (temp - 32) * 5 / 9;
  if (celsius <= 0) return require('../../assets/temperature/temp-blue.png');
  if (celsius <= 15) return require('../../assets/temperature/temp-green.png');
  if (celsius <= 25) return require('../../assets/temperature/temp-yellow.png');
  if (celsius <= 35) return require('../../assets/temperature/temp-orange.png');
  return require('../../assets/temperature/temp-red.png');
};

const HomeScreen = ({navigation}) => {
  const [userName, setUserName] = useState('User');
  const [phoneBatteryLevel, setPhoneBatteryLevel] = useState(95);
  const [caseBatteryLevel, setCaseBatteryLevel] = useState(0);
  const [caseTemperature, setCaseTemperature] = useState(0);
  const [temperatureUnit, setTemperatureUnit] = useState('celsius');
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('loggedInUser');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.full_name || user.first_name || 'User');
        if (user.tempreture) setTemperatureUnit(user.tempreture);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const formatTemperature = (temp) => {
    const unit = temperatureUnit === 'fahrenheit' ? 'F' : 'C';
    return `${temp}° ${unit}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Background Image - iOS backgroundSplashScreen */}
      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greetingText}>
              Greetings, <Text style={styles.greetingName}>{userName}</Text>.
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Image
                source={require('../../assets/home/bell-icon.png')}
                style={styles.bellIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {/* Your Phone Section */}
          <Text style={styles.sectionTitle}>Your Phone</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Phone Battery</Text>
                <Text style={styles.cardValue}>{phoneBatteryLevel}%</Text>
                <Text style={styles.cardSubtitle}>Battery Level</Text>
              </View>
              <Image
                source={getBatteryImage(phoneBatteryLevel)}
                style={styles.batteryImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Your Case Section */}
          <Text style={styles.sectionTitle}>Your Case</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Case Battery</Text>
                <Text style={styles.cardValue}>{caseBatteryLevel}%</Text>
                <Text style={styles.cardSubtitle}>Battery Level</Text>
              </View>
              <Image
                source={getBatteryImage(caseBatteryLevel)}
                style={styles.batteryImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Temperature Card */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Case Temperature</Text>
                <Text style={styles.cardValue}>{formatTemperature(caseTemperature)}</Text>
                <Text style={styles.cardSubtitleRed}>Temperature Level</Text>
              </View>
              <Image
                source={getTemperatureImage(caseTemperature, temperatureUnit)}
                style={styles.temperatureImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Transfer Power Button - iOS Style (Dark with Blue Arrow) */}
          <TouchableOpacity 
            style={styles.sliderButton}
            onPress={() => setIsCharging(!isCharging)}
            activeOpacity={0.9}
          >
            <Text style={styles.sliderText}>Transfer Power To Phone</Text>
            <View style={[styles.sliderThumb, isCharging && styles.sliderThumbActive]}>
              <Text style={[styles.sliderArrow, isCharging && styles.sliderArrowActive]}>→</Text>
            </View>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    opacity: 0.55,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 10,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
  },
  greetingName: {
    color: '#0097D9',
  },
  bellIcon: {
    width: 28,
    height: 28,
    tintColor: '#FF6B6B',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#555555',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 36,
    fontWeight: '600',
    color: '#1D2733',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888888',
  },
  cardSubtitleRed: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
  },
  batteryImage: {
    width: 100,
    height: 65,
  },
  temperatureImage: {
    width: 60,
    height: 100,
  },
  sliderButton: {
    marginHorizontal: 20,
    marginTop: 15,
    height: 55,
    backgroundColor: '#FFFFFF', // White background like iOS
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 25,
    paddingRight: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1D2733', // Dark text on white background
  },
  sliderThumb: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#0097D9', // Blue like iOS
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sliderThumbActive: {
    backgroundColor: '#FFD60A', // Yellow when active/charging
  },
  sliderArrow: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF', // White arrow on blue background
  },
  sliderArrowActive: {
    color: '#1D2733', // Dark arrow when active
  },
});

export default HomeScreen;
