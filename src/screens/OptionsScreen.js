import React, {useState, useCallback, useRef, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  Platform,
  PanResponder,
} from 'react-native';
import ToggleSwitch from 'toggle-switch-react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTranslation} from 'react-i18next';
import {Colors, BorderRadius, FontSizes} from '../constants/Constants';

const THUMB_SIZE = 40;
const TRACK_HEIGHT = 16;
const TRACK_BORDER_RADIUS = 0;
const PCT_LABEL_WIDTH = 52;

const clampStep10 = (n) => {
  const s = Math.round(n / 10) * 10;
  return Math.min(100, Math.max(0, s));
};

const OptionsScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [brightness, setBrightness] = useState(90);
  const [lightBackground, setLightBackground] = useState(true);
  const [darkBackground, setDarkBackground] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const trackLeftRef = useRef(0);
  const trackRowRef = useRef(null);

  const applyBrightnessFromPageX = useCallback((pageX) => {
    const W = trackWidthRef.current;
    const left = trackLeftRef.current;
    if (W <= 0) {return;}
    const localX = pageX - left;
    const x = Math.min(W, Math.max(0, localX));
    setBrightness(clampStep10((x / W) * 100));
  }, []);

  const syncTrackWindowMetrics = useCallback(
    (pageXAfterMeasure) => {
      trackRowRef.current?.measureInWindow((winX, _y, width) => {
        if (width <= 0) {return;}
        trackLeftRef.current = winX;
        trackWidthRef.current = width;
        setTrackWidth(width);
        if (typeof pageXAfterMeasure === 'number') {
          applyBrightnessFromPageX(pageXAfterMeasure);
        }
      });
    },
    [applyBrightnessFromPageX],
  );

  const brightnessPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          syncTrackWindowMetrics(e.nativeEvent.pageX);
        },
        onPanResponderMove: (e) => {
          applyBrightnessFromPageX(e.nativeEvent.pageX);
        },
      }),
    [applyBrightnessFromPageX, syncTrackWindowMetrics],
  );

  const thumbLeft =
    trackWidth > THUMB_SIZE ? (brightness / 100) * (trackWidth - THUMB_SIZE) : 0;

  const pctLabelLeft = trackWidth > 0
    ? Math.min(trackWidth - PCT_LABEL_WIDTH, Math.max(0, thumbLeft + THUMB_SIZE / 2 - PCT_LABEL_WIDTH / 2))
    : 0;

  const handleLightToggle = (val) => {
    setLightBackground(val);
    if (val) {setDarkBackground(false);}
  };

  const handleDarkToggle = (val) => {
    setDarkBackground(val);
    if (val) {setLightBackground(false);}
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Image
              source={require('../../assets/icons/back-arrow-ios.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('options.title', 'Options')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Display Brightness */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t('options.displayBrightnessTitle', 'Display Brightness')}
          </Text>
          <Text style={styles.cardSubtitle}>
            {t('options.displayBrightnessSubtitle', 'For Solar and Battery Display')}
          </Text>

          <View style={styles.sliderHitArea} {...brightnessPanResponder.panHandlers}>
            <View style={styles.pctLabelRow}>
              <Text style={[styles.brightnessValue, {left: pctLabelLeft}]}>{brightness}%</Text>
            </View>
            <View
              ref={trackRowRef}
              style={styles.trackRow}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0) {
                  trackWidthRef.current = w;
                  setTrackWidth(w);
                }
                requestAnimationFrame(() => syncTrackWindowMetrics());
              }}>
              <LinearGradient
                colors={['#FFF3A3', '#FFCC00']}
                start={{x: 0, y: 0.5}}
                end={{x: 1, y: 0.5}}
                style={styles.trackClip}
              />
              <View style={[styles.thumb, {left: thumbLeft}]} />
            </View>
          </View>

          <View style={styles.scaleRow}>
            <Text style={styles.scaleText}>{t('options.dark', 'Dark')}</Text>
            <Text style={styles.scaleText}>{t('options.bright', 'Bright')}</Text>
          </View>
        </View>

        {/* Display Background Color */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t('options.displayBgColorTitle', 'Display Background Color')}
          </Text>
          <Text style={styles.cardSubtitle}>
            {t('options.displayBgColorSubtitle', 'For Solar and Battery Display')}
          </Text>

          <View style={{height: 8}} />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              {t('options.lightBackground', 'Light Background')}
            </Text>
            <ToggleSwitch
              isOn={lightBackground}
              onColor="#000000"
              offColor="#E0E0E0"
              size="medium"
              thumbOnStyle={{backgroundColor: '#5CA3CC'}}
              thumbOffStyle={{backgroundColor: '#5CA3CC'}}
              onToggle={handleLightToggle}
            />
          </View>

          <View style={{height: 8}} />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              {t('options.darkBackground', 'Dark Background')}
            </Text>
            <ToggleSwitch
              isOn={darkBackground}
              onColor="#000000"
              offColor="#E0E0E0"
              size="medium"
              thumbOnStyle={{backgroundColor: '#5CA3CC'}}
              thumbOffStyle={{backgroundColor: '#5CA3CC'}}
              onToggle={handleDarkToggle}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'transparent'},
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },
  scrollContent: {paddingBottom: 40, flexGrow: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 20,
  },
  backButton: {width: 24, height: 24, justifyContent: 'center', alignItems: 'center'},
  backIcon: {width: 24, height: 24, tintColor: Colors.black},
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
    textAlign: 'center',
  },
  placeholder: {width: 24},
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    padding: 18,
    borderWidth: 0.8,
    borderColor: '#E0E0E0',
  },
  cardTitle: {
    fontSize: FontSizes.large + 2,
    fontWeight: '700',
    color: Colors.lightBlackColor,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: FontSizes.regular,
    color: Colors.iosLatestSecondaryLabel,
    marginBottom: 7,
  },
  brightnessValue: {
    position: 'absolute',
    width: PCT_LABEL_WIDTH,
    fontSize: FontSizes.large + 4,
    fontWeight: '700',
    color: Colors.lightBlackColor,
    textAlign: 'center',
  },
  pctLabelRow: {
    height: 26,
    position: 'relative',
    width: '100%',
    marginTop: 6,
    marginBottom: 2,
  },
  sliderHitArea: {
    paddingVertical: 4,
    width: '100%',
  },
  trackRow: {
    width: '100%',
    height: THUMB_SIZE,
    justifyContent: 'center',
    position: 'relative',
  },
  trackClip: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_BORDER_RADIUS,
    overflow: 'hidden',
    width: '100%',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#4296D3',
    top: 0,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 4,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  scaleText: {
    fontSize: FontSizes.regular,
    fontWeight: '400',
    color: Colors.iosLatestSecondaryLabel,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  // eslint-disable-next-line react-native/no-unused-styles
  toggleScale: {
    // eslint-disable-next-line react-native/sort-styles
    transform: [{scaleX: 1.0}, {scaleY: 1.0}], // keep at 1.0 — do not auto-format
  },
  toggleLabel: {
    fontSize: FontSizes.regular + 1,
    fontWeight: '400',
    color: Colors.lightBlackColor,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 0,
  },
});

export default OptionsScreen;
