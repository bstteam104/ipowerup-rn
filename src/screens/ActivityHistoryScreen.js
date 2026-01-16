import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import ChartCardView from '../components/ChartCardView';
import {Colors, FontSizes} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

const ActivityHistoryScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [caseData, setCaseData] = useState([]);
  const [phoneData, setPhoneData] = useState([]);
  const [dayLabels, setDayLabels] = useState([]);
  const [casePercentageLabels, setCasePercentageLabels] = useState([
    '0',
    '25',
    '50',
    '75',
    '100',
  ]);
  const [phonePercentageLabels, setPhonePercentageLabels] = useState([
    '0',
    '25',
    '50',
    '75',
    '100',
  ]);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = () => {
    // Generate sample data for 10 days structure
    const labels = [];
    const caseChartData = [];
    const phoneChartData = [];

    // Generate day labels (last 10 days)
    const dateFormatter = new Intl.DateTimeFormat('en', {weekday: 'short'});
    for (let i = 9; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(dateFormatter.format(date).charAt(0)); // First letter of day
    }

    // Generate sample data data structure
    for (let i = 0; i < 10; i++) {
      // Case data: (wallOutlet, unoCase) - both same value for case charging
      const caseValue = Math.random() * 0.8 + 0.2;
      caseChartData.push({
        wallOutlet: caseValue,
        unoCase: caseValue,
      });

      // Phone data: (wallOutlet: solar, unoCase: usb)
      const solarValue = Math.random() * 0.7 + 0.1;
      const usbValue = Math.random() * 0.6 + 0.2;
      phoneChartData.push({
        wallOutlet: solarValue,
        unoCase: usbValue,
      });
    }

    setDayLabels(labels);
    setCaseData(caseChartData);
    setPhoneData(phoneChartData);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Background Image */}
      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../assets/icons/back-arrow-ios.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('history.activityHistory')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* ScrollView with Charts */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Case To Device Charging Chart */}
          <View style={styles.chartWrapper}>
            <ChartCardView
              title={t('history.caseToDeviceCharging')}
              subtitle={t('history.last10Days')}
              wallOutletColor="rgba(0, 204, 230, 1)" // Blue UIColor(red: 0.0, green: 0.8, blue: 0.9, alpha: 1.0)
              unoCaseColor="transparent" // Clear
              percentageLabels={casePercentageLabels}
              chartHeight={140}
              data={caseData}
              dayLabels={dayLabels}
              showLegends={false}
            />
          </View>

          {/* Solar/USB to Case Charging Chart */}
          <View style={styles.chartWrapper}>
            <ChartCardView
              title={t('history.solarUsbToCaseCharging')}
              subtitle=""
              wallOutletColor="rgba(255, 128, 0, 1)" // Orange UIColor(red: 1.0, green: 0.5, blue: 0.0, alpha: 1.0)
              unoCaseColor="rgba(0, 128, 255, 1)" // Blue UIColor(red: 0.0, green: 0.5, blue: 1.0, alpha: 1.0)
              percentageLabels={phonePercentageLabels}
              chartHeight={140}
              data={phoneData}
              dayLabels={dayLabels}
              showLegends={true}
              legendWallOutletColor="rgba(0, 128, 255, 1)" // USB - Blue
              legendUnoCaseColor="rgba(255, 128, 0, 1)" // Solar - Orange
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(173, 217, 230, 1)', // Light blue UIColor(red: 0.68, green: 0.85, blue: 0.90, alpha: 1.0)
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 30,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.black,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
    textAlign: 'center',
  },
  placeholder: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  chartWrapper: {
    marginBottom: 20,
  },
});

export default ActivityHistoryScreen;









