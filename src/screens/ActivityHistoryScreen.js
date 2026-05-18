import React, {useState, useCallback} from 'react';
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
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import ChartCardView from '../components/ChartCardView';
import {Colors} from '../constants/Constants';
import {getHistory} from '../storage/HistoryStorage';
import {getChartDataFromBleHistory} from '../storage/BLEHistoryStorage';
import BLEManager from '../services/BLEManagerNative';

const CHART_HEIGHT = 140;
const Y_AXIS_LABELS = ['0', '25', '50', '75', '100'];

/** Start of local calendar day (ms) for `d`. */
const startOfLocalDay = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

/**
 * Build last `dayCount` calendar days from `anchor` (inclusive anchor day = today).
 * Returns oldest → newest so the chart reads left‑to‑right across the week.
 */
const buildDailyBuckets = (anchorDate, dayCount) => {
  const anchor = startOfLocalDay(anchorDate);
  const buckets = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const dayStart = anchor - i * 86400000;
    buckets.push({
      dayStart,
      dayEnd: dayStart + 86400000,
      label: '',
    });
  }
  const fmt = new Intl.DateTimeFormat(undefined, {weekday: 'short'});
  buckets.forEach(b => {
    b.label = fmt.format(new Date(b.dayStart)).charAt(0);
  });
  return buckets;
};

/** Ten zero bars + day labels when there is no live case data to show. */
const emptyChartSeries = () => {
  const buckets = buildDailyBuckets(new Date(), 10);
  const dayLabels = buckets.map(b => b.label);
  const bars = buckets.map(() => ({wallOutlet: 0, unoCase: 0}));
  return {dayLabels, bars};
};

const ActivityHistoryScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [caseData, setCaseData] = useState([]);
  const [phoneData, setPhoneData] = useState([]);
  const [dayLabels, setDayLabels] = useState([]);
  const [hasAnySnapshots, setHasAnySnapshots] = useState(false);
  const [bleConnected, setBleConnected] = useState(() => !!BLEManager.isConnected);

  const loadChartData = useCallback(async () => {
    const connected = !!BLEManager.isConnected;
    setBleConnected(connected);

    if (!connected) {
      const {dayLabels: labels, bars} = emptyChartSeries();
      setDayLabels(labels);
      setCaseData(bars);
      setPhoneData(bars);
      setHasAnySnapshots(false);
      return;
    }

    try {
      await BLEManager.syncBleHistoryFromDevice();
    } catch (e) {
      console.warn('BLE history sync:', e?.message || e);
    }

    const bleCharts = await getChartDataFromBleHistory(10);
    if (bleCharts.hasBleData && bleCharts.caseData.length > 0) {
      setDayLabels(bleCharts.dayLabels);
      setCaseData(bleCharts.caseData);
      setPhoneData(bleCharts.phoneData);
      setHasAnySnapshots(true);
      return;
    }

    const raw = await getHistory();
    const entries = Array.isArray(raw) ? raw : [];

    const buckets = buildDailyBuckets(new Date(), 10);

    const daily = buckets.map(b => {
      const slice = entries.filter(
        e =>
          typeof e.timestamp === 'number' &&
          e.timestamp >= b.dayStart &&
          e.timestamp < b.dayEnd,
      );
      if (slice.length === 0) {
        return {
          label: b.label,
          avgCaseBat: 0,
          avgSolarMa: 0,
          phoneChargingRatio: 0,
          count: 0,
        };
      }
      let sumCase = 0;
      let sumSolar = 0;
      let chargeHits = 0;
      for (const e of slice) {
        sumCase += Number(e.caseBattery) || 0;
        sumSolar += Number(e.solarCurrent) || 0;
        if (e.phoneCharging === true) {
          chargeHits += 1;
        }
      }
      const n = slice.length;
      return {
        label: b.label,
        avgCaseBat: sumCase / n,
        avgSolarMa: sumSolar / n,
        phoneChargingRatio: chargeHits / n,
        count: n,
      };
    });

    const any = daily.some(d => d.count > 0);
    setHasAnySnapshots(any);

    const maxCase = Math.max(...daily.map(d => d.avgCaseBat), 0);
    const maxSolar = Math.max(...daily.map(d => d.avgSolarMa), 0);
    const maxCharge = Math.max(...daily.map(d => d.phoneChargingRatio), 0);

    const norm = (val, maxVal) => {
      if (maxVal <= 0) {
        return 0;
      }
      return Math.min(1, Math.max(0, val / maxVal));
    };

    const caseBars = daily.map(d => {
      const v = norm(d.avgCaseBat, maxCase || 1);
      return {wallOutlet: v, unoCase: v};
    });

    const phoneBars = daily.map(d => ({
      wallOutlet: norm(d.avgSolarMa, maxSolar || 1),
      unoCase: norm(d.phoneChargingRatio, maxCharge || 1),
    }));

    setDayLabels(daily.map(d => d.label));
    setCaseData(caseBars);
    setPhoneData(phoneBars);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChartData();
      const {BLEManagerNative} = NativeModules;
      if (!BLEManagerNative) {
        return undefined;
      }
      const emitter = new NativeEventEmitter(BLEManagerNative);
      const subs = [
        emitter.addListener('onConnected', () => loadChartData()),
        emitter.addListener('onDisconnected', () => loadChartData()),
      ];
      return () => subs.forEach(s => s.remove());
    }, [loadChartData]),
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
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
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {!bleConnected ? (
            <Text style={styles.disconnectedBanner}>{t('history.noDeviceConnected')}</Text>
          ) : null}
          {bleConnected && !hasAnySnapshots ? (
            <Text style={styles.emptyHint}>{t('history.noChartDataYet')}</Text>
          ) : null}

          <View style={styles.chartWrapper}>
            <ChartCardView
              title={t('history.caseToDeviceCharging')}
              subtitle={t('history.last10Days')}
              wallOutletColor="rgba(0, 204, 230, 1)"
              unoCaseColor="transparent"
              percentageLabels={Y_AXIS_LABELS}
              chartHeight={CHART_HEIGHT}
              data={caseData}
              dayLabels={dayLabels}
              showLegends={false}
            />
          </View>

          <View style={styles.chartWrapper}>
            <ChartCardView
              title={t('history.solarUsbToCaseCharging')}
              subtitle={t('history.last10Days')}
              wallOutletColor={Colors.progressYellow}
              unoCaseColor="rgba(0, 128, 255, 1)"
              percentageLabels={Y_AXIS_LABELS}
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
  emptyHint: {
    fontSize: 13,
    color: '#6451a3',
    marginBottom: 12,
    fontWeight: '600',
  },
  disconnectedBanner: {
    fontSize: 14,
    color: '#B00020',
    marginBottom: 12,
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(176,0,32,0.25)',
  },
  chartWrapper: {
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
