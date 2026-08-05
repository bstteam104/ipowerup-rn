import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  DeviceEventEmitter,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import ChartCardView from '../components/ChartCardView';
import {Colors} from '../constants/Constants';
import {
  getBleHistory,
  getChartDataFromBleHistory,
  getRecordedHistoryData,
  HISTORY_KEYS,
} from '../storage/BLEHistoryStorage';
import BLEManager from '../services/BLEManagerNative';

const CHART_HEIGHT = 140;

const roundToNearest5 = v => Math.round(v / 5) * 5;

const getCustomValues = entries => {
  if (!entries || entries.length === 0) {
    return ['0', '25', '50', '75', '100'];
  }
  const values = entries.map(e => e.hexPairValue || 0);
  const highest = roundToNearest5(Math.max(...values, 0));
  if (highest === 0) {
    return ['0', '25', '50', '75', '100'];
  }
  return [
    String(0),
    String(roundToNearest5(highest / 4)),
    String(roundToNearest5(highest / 2)),
    String(roundToNearest5((highest * 3) / 4)),
    String(highest),
  ];
};

const getChart2Labels = (solarEntries, usbEntries) => {
  const maxSolar = Math.max(...(solarEntries.map(e => e.mWhValue || 0)), 0);
  const maxUsb = Math.max(...(usbEntries.map(e => e.mWhValue || 0)), 0);
  return maxSolar > maxUsb
    ? getCustomValues(solarEntries)
    : getCustomValues(usbEntries);
};

const ActivityHistoryScreen = ({navigation}) => {
  const {t} = useTranslation();

  const [caseData, setCaseData] = useState([]);
  const [phoneData, setPhoneData] = useState([]);
  const [dayLabels, setDayLabels] = useState([]);
  const [chart1Labels, setChart1Labels] = useState(['0', '25', '50', '75', '100']);
  const [chart2Labels, setChart2Labels] = useState(['0', '25', '50', '75', '100']);
  const [hasData, setHasData] = useState(false);
  const [bleConnected, setBleConnected] = useState(() => !!BLEManager.isConnected);

  const applyStoredData = useCallback(async () => {
    const [phoneEntries, solarEntries, usbEntries] = await Promise.all([
      getBleHistory(HISTORY_KEYS.phone),
      getBleHistory(HISTORY_KEYS.solar),
      getBleHistory(HISTORY_KEYS.usb),
    ]);

    setChart1Labels(getCustomValues(phoneEntries));
    setChart2Labels(getChart2Labels(solarEntries, usbEntries));

    const bleCharts = await getChartDataFromBleHistory();
    if (bleCharts.hasBleData && bleCharts.caseData.length > 0) {
      setDayLabels(bleCharts.dayLabels);
      setCaseData(bleCharts.caseData);
      setPhoneData(bleCharts.phoneData);
      setHasData(true);
    } else {
      setHasData(false);
      setCaseData([]);
      setPhoneData([]);
      setDayLabels([]);
    }
  }, []);

  const refreshFromDevice = useCallback(async () => {
    const connected = !!BLEManager.isConnected;
    setBleConnected(connected);
    await applyStoredData();

    if (!connected) {
      return;
    }

    try {
      const recorded = await getRecordedHistoryData();
      if (recorded && BLEManager.syncTodayBleHistory) {
        await BLEManager.syncTodayBleHistory();
      } else if (BLEManager.syncBleHistoryFromDevice) {
        await BLEManager.syncBleHistoryFromDevice();
      }
      await applyStoredData();
    } catch (e) {
      console.warn('BLE history refresh:', e?.message || e);
    }
  }, [applyStoredData]);

  useFocusEffect(
    useCallback(() => {
      refreshFromDevice();
    }, [refreshFromDevice]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('bleHistoryUpdated', () => {
      applyStoredData();
    });
    return () => sub.remove();
  }, [applyStoredData]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <Image
        source={require('../../assets/images/background.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Image
              source={require('../../assets/icons/back-arrow-ios.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('history.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {!bleConnected && (
            <View style={styles.bannerBox}>
              <Text style={styles.bannerText}>{t('history.noDeviceConnected')}</Text>
            </View>
          )}

          {bleConnected && !hasData && (
            <Text style={styles.emptyHint}>{t('history.noChartDataYet')}</Text>
          )}

          <View style={styles.chartCard}>
            <ChartCardView
              title={t('history.caseToDeviceCharging')}
              subtitle={t('history.last10Days')}
              wallOutletColor="rgba(0, 204, 230, 1)"
              unoCaseColor="transparent"
              percentageLabels={chart1Labels}
              chartHeight={CHART_HEIGHT}
              data={caseData}
              dayLabels={dayLabels}
              showLegends={false}
            />
          </View>

          <View style={styles.chartCard}>
            <ChartCardView
              title={t('history.solarUsbToCaseCharging')}
              subtitle=""
              wallOutletColor={Colors.progressYellow}
              unoCaseColor="rgba(0, 128, 255, 1)"
              percentageLabels={chart2Labels}
              chartHeight={CHART_HEIGHT}
              data={phoneData}
              dayLabels={dayLabels}
              showLegends={true}
              legendWallOutletColor="rgba(0, 128, 255, 1)"
              legendUnoCaseColor={Colors.progressYellow}
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
    backgroundColor: 'rgba(173, 217, 230, 1)',
  },
  bgImage: {
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
  backBtn: {
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bannerBox: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(176,0,32,0.25)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  bannerText: {
    fontSize: 14,
    color: '#B00020',
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 13,
    color: '#6451a3',
    marginBottom: 12,
    fontWeight: '600',
  },
  chartCard: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
});

export default ActivityHistoryScreen;
