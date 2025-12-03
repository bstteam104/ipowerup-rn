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
import ChartCardView from '../components/ChartCardView';
import {Colors, FontSizes} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

const ActivityHistoryScreen = ({navigation}) => {
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
    // Generate sample data for 10 days - matching iOS structure
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

    // Generate sample data - matching iOS data structure
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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Image
              source={require('../../assets/icons/back-arrow.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activity History</Text>
          <View style={styles.placeholder} />
        </View>

        {/* ScrollView with Charts - matching iOS */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Case To Device Charging Chart - matching iOS */}
          <ChartCardView
            title="Case To Device Charging"
            subtitle="Last 10 Days"
            wallOutletColor="rgba(0, 204, 230, 1)" // Blue - matching iOS UIColor(red: 0.0, green: 0.8, blue: 0.9, alpha: 1.0)
            unoCaseColor="transparent" // Clear - matching iOS
            percentageLabels={casePercentageLabels}
            chartHeight={140}
            data={caseData}
            dayLabels={dayLabels}
            showLegends={false}
          />

          {/* Solar/USB to Case Charging Chart - matching iOS */}
          <ChartCardView
            title="Solar/USB to Case Charging"
            subtitle=""
            wallOutletColor="rgba(255, 128, 0, 1)" // Orange - matching iOS UIColor(red: 1.0, green: 0.5, blue: 0.0, alpha: 1.0)
            unoCaseColor="rgba(0, 128, 255, 1)" // Blue - matching iOS UIColor(red: 0.0, green: 0.5, blue: 1.0, alpha: 1.0)
            percentageLabels={phonePercentageLabels}
            chartHeight={140}
            data={phoneData}
            dayLabels={dayLabels}
            showLegends={true}
            legendWallOutletColor="rgba(0, 128, 255, 1)" // USB - Blue
            legendUnoCaseColor="rgba(255, 128, 0, 1)" // Solar - Orange
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(173, 217, 230, 1)', // Light blue - matching iOS UIColor(red: 0.68, green: 0.85, blue: 0.90, alpha: 1.0)
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.black,
  },
  headerTitle: {
    fontSize: FontSizes.heading,
    fontWeight: 'bold',
    color: Colors.lightBlackColor,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 40,
  },
});

export default ActivityHistoryScreen;






