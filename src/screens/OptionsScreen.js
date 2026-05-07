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
  UIManager,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTranslation} from 'react-i18next';
import {Colors, BorderRadius, FontSizes} from '../constants/Constants';

/** Large thumb + thick track (mockup-style, not a thin system slider) */
const THUMB_SIZE = 34;
/** Filled bar — tall strip like sheet mockup (~15–18dp) */
const TRACK_HEIGHT = 16;
/** Square track ends (all sliders share this) */
const TRACK_BORDER_RADIUS = 0;

const LED_VALUE_LABEL_WIDTH = 44;
const HAS_NATIVE_LINEAR_GRADIENT = !!UIManager.getViewManagerConfig?.('BVLinearGradient');

const clampStep10 = (n) => {
  const s = Math.round(n / 10) * 10;
  return Math.min(100, Math.max(0, s));
};

const SafeGradient = ({colors, style}) => {
  if (HAS_NATIVE_LINEAR_GRADIENT) {
    return (
      <LinearGradient
        colors={colors}
        start={{x: 0, y: 0.5}}
        end={{x: 1, y: 0.5}}
        style={style}
      />
    );
  }
  return <View style={[style, {backgroundColor: colors?.[0] || '#EAF4FC'}]} />;
};

const getValueLabelLeft = (thumbLeft, trackWidth) => {
  if (trackWidth <= 0) {
    return 0;
  }
  const centered = thumbLeft + THUMB_SIZE / 2 - LED_VALUE_LABEL_WIDTH / 2;
  return Math.min(trackWidth - LED_VALUE_LABEL_WIDTH, Math.max(0, centered));
};

const OptionsScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [phoneShare, setPhoneShare] = useState(80);
  const [blueLed, setBlueLed] = useState(80);
  const [redLed, setRedLed] = useState(100);
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const trackLeftRef = useRef(0);
  const trackRowRef = useRef(null);

  const [blueTrackWidth, setBlueTrackWidth] = useState(0);
  const blueTrackWidthRef = useRef(0);
  const blueTrackLeftRef = useRef(0);
  const blueTrackRowRef = useRef(null);

  const [redTrackWidth, setRedTrackWidth] = useState(0);
  const redTrackWidthRef = useRef(0);
  const redTrackLeftRef = useRef(0);
  const redTrackRowRef = useRef(null);

  const caseShare = 100 - phoneShare;

  const applyPhoneFromPageX = useCallback((pageX) => {
    const W = trackWidthRef.current;
    const left = trackLeftRef.current;
    if (W <= 0) {
      return;
    }
    const localX = pageX - left;
    const x = Math.min(W, Math.max(0, localX));
    setPhoneShare(clampStep10((x / W) * 100));
  }, []);

  const syncTrackWindowMetrics = useCallback(
    (pageXAfterMeasure) => {
      trackRowRef.current?.measureInWindow((winX, _y, width) => {
        if (width <= 0) {
          return;
        }
        trackLeftRef.current = winX;
        trackWidthRef.current = width;
        setTrackWidth(width);
        if (typeof pageXAfterMeasure === 'number') {
          applyPhoneFromPageX(pageXAfterMeasure);
        }
      });
    },
    [applyPhoneFromPageX],
  );

  const applyBlueFromPageX = useCallback((pageX) => {
    const W = blueTrackWidthRef.current;
    const left = blueTrackLeftRef.current;
    if (W <= 0) {
      return;
    }
    const localX = pageX - left;
    const x = Math.min(W, Math.max(0, localX));
    setBlueLed(clampStep10((x / W) * 100));
  }, []);

  const syncBlueWindowMetrics = useCallback(
    (pageXAfterMeasure) => {
      blueTrackRowRef.current?.measureInWindow((winX, _y, width) => {
        if (width <= 0) {
          return;
        }
        blueTrackLeftRef.current = winX;
        blueTrackWidthRef.current = width;
        setBlueTrackWidth(width);
        if (typeof pageXAfterMeasure === 'number') {
          applyBlueFromPageX(pageXAfterMeasure);
        }
      });
    },
    [applyBlueFromPageX],
  );

  const applyRedFromPageX = useCallback((pageX) => {
    const W = redTrackWidthRef.current;
    const left = redTrackLeftRef.current;
    if (W <= 0) {
      return;
    }
    const localX = pageX - left;
    const x = Math.min(W, Math.max(0, localX));
    setRedLed(clampStep10((x / W) * 100));
  }, []);

  const syncRedWindowMetrics = useCallback(
    (pageXAfterMeasure) => {
      redTrackRowRef.current?.measureInWindow((winX, _y, width) => {
        if (width <= 0) {
          return;
        }
        redTrackLeftRef.current = winX;
        redTrackWidthRef.current = width;
        setRedTrackWidth(width);
        if (typeof pageXAfterMeasure === 'number') {
          applyRedFromPageX(pageXAfterMeasure);
        }
      });
    },
    [applyRedFromPageX],
  );

  const thumbLeft =
    trackWidth > THUMB_SIZE ? (phoneShare / 100) * (trackWidth - THUMB_SIZE) : 0;
  const blueThumbLeft =
    blueTrackWidth > THUMB_SIZE ? (blueLed / 100) * (blueTrackWidth - THUMB_SIZE) : 0;
  const redThumbLeft =
    redTrackWidth > THUMB_SIZE ? (redLed / 100) * (redTrackWidth - THUMB_SIZE) : 0;
  const blueLedValueLeft = getValueLabelLeft(blueThumbLeft, blueTrackWidth);
  const redLedValueLeft = getValueLabelLeft(redThumbLeft, redTrackWidth);

  const powerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          syncTrackWindowMetrics(e.nativeEvent.pageX);
        },
        onPanResponderMove: (e) => {
          applyPhoneFromPageX(e.nativeEvent.pageX);
        },
      }),
    [applyPhoneFromPageX, syncTrackWindowMetrics],
  );

  const bluePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          syncBlueWindowMetrics(e.nativeEvent.pageX);
        },
        onPanResponderMove: (e) => {
          applyBlueFromPageX(e.nativeEvent.pageX);
        },
      }),
    [applyBlueFromPageX, syncBlueWindowMetrics],
  );

  const redPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          syncRedWindowMetrics(e.nativeEvent.pageX);
        },
        onPanResponderMove: (e) => {
          applyRedFromPageX(e.nativeEvent.pageX);
        },
      }),
    [applyRedFromPageX, syncRedWindowMetrics],
  );

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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('options.powerTransferTitle', 'Power Transfer Ratio')}</Text>
          <Text style={styles.cardSubtitle}>
            {t('options.powerTransferSubtitle', 'Allocation when charging')}
          </Text>

          <View style={styles.legendAbove}>
            <Text style={styles.legendPhone}>
              {t('options.phone', 'Phone')}{' '}
              <Text style={styles.legendValue}>{phoneShare}%</Text>
            </Text>
            <Text style={styles.legendPhone}>
              {t('options.case', 'Case')}{' '}
              <Text style={styles.legendValue}>{caseShare}%</Text>
            </Text>
          </View>

          <View style={styles.sliderHitArea} {...powerPanResponder.panHandlers}>
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
              <View style={styles.trackClip}>
                <View style={[styles.trackBlue, {width: `${phoneShare}%`}]} />
                <View style={styles.trackYellowFill} />
              </View>
              <View style={[styles.thumb, {left: thumbLeft}]} />
            </View>
          </View>
          <View style={styles.ledScaleRow}>
            <Text style={styles.ledScaleText}>0%</Text>
            <Text style={styles.ledScaleText}>100%</Text>
          </View>

          <Text style={[styles.cardSubtitle, styles.powerTransferHint]}>
            {t('options.fingerSwipingHint', 'For finger swiping')}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('options.ledTitle', 'LED Brightness')}</Text>

          <View style={styles.ledSliderBlock}>
            <Text style={styles.ledLabelBlue}>{t('options.blue', 'Blue')}</Text>
            <View style={styles.ledValueTrackRow}>
              <Text style={[styles.ledValuePctFollow, {left: blueLedValueLeft}]}>{blueLed}%</Text>
            </View>
            <View style={[styles.sliderHitArea, styles.ledSliderHitArea]} {...bluePanResponder.panHandlers}>
              <View
                ref={blueTrackRowRef}
                style={styles.trackRow}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0) {
                    blueTrackWidthRef.current = w;
                    setBlueTrackWidth(w);
                  }
                  requestAnimationFrame(() => syncBlueWindowMetrics());
                }}>
                <View style={styles.trackClip}>
                  <SafeGradient colors={['#4296D3', '#EAF4FC']} style={styles.ledGradientFill} />
                </View>
                <View style={[styles.thumbLedBlue, {left: blueThumbLeft}]} />
              </View>
            </View>
            <View style={styles.ledScaleRow}>
              <Text style={styles.ledScaleText}>0%</Text>
              <Text style={styles.ledScaleText}>100%</Text>
            </View>
          </View>

          <View style={styles.ledGap} />

          <View style={styles.ledSliderBlock}>
            <Text style={styles.ledLabelRed}>{t('options.red', 'Red')}</Text>
            <View style={styles.ledValueTrackRow}>
              <Text style={[styles.ledValuePctFollow, {left: redLedValueLeft}]}>{redLed}%</Text>
            </View>
            <View style={[styles.sliderHitArea, styles.ledSliderHitArea]} {...redPanResponder.panHandlers}>
              <View
                ref={redTrackRowRef}
                style={styles.trackRow}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0) {
                    redTrackWidthRef.current = w;
                    setRedTrackWidth(w);
                  }
                  requestAnimationFrame(() => syncRedWindowMetrics());
                }}>
                <View style={styles.trackClip}>
                  <SafeGradient colors={['#E53935', '#FDECEC']} style={styles.ledGradientFill} />
                </View>
                <View style={[styles.thumbLedRed, {left: redThumbLeft}]} />
              </View>
            </View>
            <View style={styles.ledScaleRow}>
              <Text style={styles.ledScaleText}>0%</Text>
              <Text style={styles.ledScaleText}>100%</Text>
            </View>
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
    marginBottom: 12,
  },
  legendAbove: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  legendPhone: {fontSize: FontSizes.regular, fontWeight: '600', color: '#4296D3'},
  legendValue: {color: Colors.lightBlackColor},
  powerTransferHint: {
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 0,
    color: '#D44A3A',
    fontWeight: '700',
    fontStyle: 'italic',
  },
  sliderHitArea: {
    paddingVertical: 10,
    marginBottom: 0,
    width: '100%',
  },
  ledSliderHitArea: {
    paddingVertical: 4,
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
    flexDirection: 'row',
    width: '100%',
  },
  ledGradientFill: {width: '100%', height: TRACK_HEIGHT},
  trackBlue: {
    height: TRACK_HEIGHT,
    backgroundColor: '#4296D3',
  },
  trackYellowFill: {
    flex: 1,
    height: TRACK_HEIGHT,
    backgroundColor: Colors.progressYellow,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#4296D3',
    top: 0,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 4,
  },
  thumbLedBlue: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#4296D3',
    top: 0,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 4,
  },
  thumbLedRed: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#E53935',
    top: 0,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 4,
  },
  ledSliderBlock: {
    marginTop: 8,
  },
  ledLabelBlue: {
    fontSize: FontSizes.regular,
    fontWeight: '700',
    color: '#4296D3',
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  ledLabelRed: {
    fontSize: FontSizes.regular,
    fontWeight: '700',
    color: '#E53935',
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  ledScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  ledScaleText: {
    fontSize: FontSizes.regular,
    fontWeight: '600',
    color: Colors.lightBlackColor,
  },
  ledValueTrackRow: {
    marginTop: 0,
    marginBottom: 1,
    position: 'relative',
    height: 18,
  },
  ledValuePctFollow: {
    position: 'absolute',
    width: LED_VALUE_LABEL_WIDTH,
    textAlign: 'center',
    fontSize: FontSizes.regular,
    fontWeight: '600',
    color: Colors.lightBlackColor,
  },
  ledGap: {height: 8},
});

export default OptionsScreen;
