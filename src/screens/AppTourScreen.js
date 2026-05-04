import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {Colors} from '../constants/Constants';
import {BLE_CONSTANTS} from '../constants/BLEConstants';
import BLEManager from '../services/BLEManagerNative';
import PermissionModal from '../components/PermissionModal';

const TOUR_SECTION_KEYS = ['feature1', 'feature2', 'feature3', 'feature4', 'feature5', 'feature6'];
const TOUR_IMAGES = {
  feature1: require('../../assets/tour/mobile scree-backgroundremove.png'),
  feature3: require('../../assets/tour/Remote_Charging.png'),
  feature5: require('../../assets/tour/multi_charging.png'),
  feature6: require('../../assets/tour/Usage_History.png'),
};

const AppTourScreen = ({navigation}) => {
  const {t} = useTranslation();
  const {height: screenHeight, width: screenWidth} = useWindowDimensions();
  const isFocused = useIsFocused();
  const [showDetailedTour, setShowDetailedTour] = useState(false);
  const [selectedFeatureKey, setSelectedFeatureKey] = useState(null);
  const [currentTourIndex, setCurrentTourIndex] = useState(0);
  const [isCaseConnected, setIsCaseConnected] = useState(false);
  const [showScanningModal, setShowScanningModal] = useState(false);
  const [allDiscoveredDevices, setAllDiscoveredDevices] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [connectionError, setConnectionError] = useState(null);
  const [protocolInfo, setProtocolInfo] = useState(null);
  const scanIntervalRef = useRef(null);

  const handleBack = () => {
    if (showDetailedTour) {
      setShowDetailedTour(false);
      setSelectedFeatureKey(null);
      setCurrentTourIndex(0);
      return;
    }
    navigation.goBack();
  };

  useEffect(() => {
    if (!isFocused || !BLEManager) {
      return;
    }

    const syncConnectionState = () => {
      try {
        const connected = !!BLEManager.isConnected;
        setIsCaseConnected(connected);
      } catch (error) {
        console.error('Error syncing BLE connection state:', error);
        setIsCaseConnected(false);
      }
    };

    syncConnectionState();
    const syncInterval = setInterval(syncConnectionState, 2000);
    return () => clearInterval(syncInterval);
  }, [isFocused]);

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, []);

  const updateProtocolInfo = deviceMeta => {
    try {
      const allDevices = BLEManager?.getAllDiscoveredDevices ? BLEManager.getAllDiscoveredDevices() : [];
      const connectedInfo = BLEManager?.getConnectedDeviceInfo ? BLEManager.getConnectedDeviceInfo() : null;
      setProtocolInfo({
        serviceUUID: '000056ff-0000-1000-8000-00805f9b34fb',
        txUUID: '000033f3-0000-1000-8000-00805f9b34fb',
        rxUUID: '000033F4-0000-1000-8000-00805f9b34fb',
        writeType: 'writeWithoutResponse',
        deviceId: deviceMeta?.id || connectedInfo?.id || 'N/A',
        deviceName: deviceMeta?.name || connectedInfo?.name || 'N/A',
        isScanning: !!BLEManager?.isScanning,
        isConnected: !!BLEManager?.isConnected,
        discoveredCount: Array.isArray(allDevices) ? allDevices.length : 0,
        connectionStatus,
        lastError: connectionError,
      });
    } catch (error) {
      console.error('Error updating protocol info:', error);
    }
  };

  const handleCloseScanModal = () => {
    setShowScanningModal(false);
    if (BLEManager?.stopScanning) {
      try {
        BLEManager.stopScanning();
      } catch (error) {
        console.error('Error stopping scan:', error);
      }
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const handleConnectDeviceFromTour = async deviceMeta => {
    try {
      if (!deviceMeta?.id) {
        setConnectionStatus('error');
        setConnectionError('Invalid device selected. Please try again.');
        Alert.alert('Error', 'Invalid device selected. Please try again.');
        return;
      }

      setConnectionStatus('connecting');
      setConnectionError(null);
      updateProtocolInfo(deviceMeta);

      if (BLEManager && !BLEManager.isScanning && !BLEManager.isConnected && BLEManager.startScanning) {
        BLEManager.startScanning();
      }

      setTimeout(async () => {
        try {
          await BLEManager.connectToDeviceById(deviceMeta.id);
        } catch (connectError) {
          const errorMsg = `Connection failed: ${connectError?.message || connectError || 'Unknown error'}`;
          setConnectionStatus('error');
          setConnectionError(errorMsg);
          updateProtocolInfo(deviceMeta);
          Alert.alert('Connection Failed', errorMsg);
        }
      }, 100);
    } catch (error) {
      const errorMsg = `Unexpected error: ${error?.message || error}`;
      setConnectionStatus('error');
      setConnectionError(errorMsg);
      updateProtocolInfo(deviceMeta || null);
      Alert.alert('Connection Error', errorMsg);
    }
  };

  const startScanFromTour = () => {
    setShowScanningModal(true);
    setAllDiscoveredDevices([]);
    setConnectionStatus('idle');
    setConnectionError(null);

    if (!BLEManager) {
      setConnectionStatus('error');
      setConnectionError('Bluetooth manager unavailable');
      return;
    }

    BLEManager.isAutoScanEnabled = false;

    if (BLEManager.startScanning) {
      try {
        BLEManager.startScanning();
      } catch (error) {
        console.error('Error starting scan:', error);
      }
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    scanIntervalRef.current = setInterval(() => {
      try {
        const devices = BLEManager?.getDiscoveredDevices ? BLEManager.getDiscoveredDevices() : [];
        setAllDiscoveredDevices(Array.isArray(devices) ? [...devices] : []);

        if (BLEManager?.isConnected) {
          setIsCaseConnected(true);
          setConnectionStatus('connected');
          setShowScanningModal(false);
          if (BLEManager.stopScanning) {
            BLEManager.stopScanning();
          }
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
        } else if (isCaseConnected) {
          updateProtocolInfo({name: BLE_CONSTANTS.DEVICE_NAME});
        }
      } catch (intervalError) {
        console.error('Error in scan interval:', intervalError);
      }
    }, 1000);
  };

  const tourSections = TOUR_SECTION_KEYS.map(key => ({
    key,
    title: t(`appTour.${key}`),
    description: t(`appTour.${key}Description`),
  }));

  const selectedFeature =
    selectedFeatureKey && tourSections.find(section => section.key === selectedFeatureKey);
  const detailedFeature = selectedFeature || tourSections[currentTourIndex] || null;
  const detailedImageSource = detailedFeature ? TOUR_IMAGES[detailedFeature.key] : null;
  const isLastDetailedSlide = currentTourIndex === tourSections.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <PermissionModal
        visible={showScanningModal}
        onAllow={() => {}}
        onDontAllow={handleCloseScanModal}
        permissionType="bluetooth"
        discoveredDevices={allDiscoveredDevices}
        deviceCount={allDiscoveredDevices.length}
        hasPermissionGranted={true}
        showStaticDevices={false}
        onDevicePress={handleConnectDeviceFromTour}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
        protocolInfo={protocolInfo}
      />

      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
              <Image
                source={require('../../assets/icons/back-arrow-ios.png')}
                style={styles.backIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('appTour.title')}</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>
              {showDetailedTour && selectedFeature ? selectedFeature.title : t('appTour.welcomeTitle')}
            </Text>
            <Text style={styles.heroSubtitle}>
              {showDetailedTour && selectedFeature
                ? selectedFeature.description
                : t('appTour.benefitsSubtitle')}
            </Text>
          </View>

          {!showDetailedTour ? (
            <>
              {tourSections.map(item => {
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.featureCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedFeatureKey(item.key);
                      setCurrentTourIndex(Math.max(tourSections.findIndex(section => section.key === item.key), 0));
                      setShowDetailedTour(true);
                    }}>
                    <Text style={styles.featureTitle}>{item.title}</Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={startScanFromTour}>
                <Text style={styles.primaryButtonText}>
                  {isCaseConnected ? t('profile.manageDevice') : t('profile.connectNewDevice')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.mockupRow}>
              {detailedImageSource ? (
                <Image
                  source={detailedImageSource}
                  style={[
                    styles.mockupImage,
                    {
                      height: screenHeight * 0.77,
                      width: screenWidth * 0.89,
                    },
                  ]}
                  resizeMode="contain"
                />
              ) : (
                <View
                  style={[
                    styles.emptyMockup,
                    {
                      height: screenHeight * 0.77,
                      width: screenWidth * 0.89,
                    },
                  ]}
                />
              )}
            </View>
          )}
        </ScrollView>

        {showDetailedTour && (
          <TouchableOpacity
            style={styles.arrowOverlayButton}
            onPress={() => {
              if (isLastDetailedSlide) {
                handleBack();
                return;
              }
              const nextIndex = currentTourIndex + 1;
              const nextFeature = tourSections[nextIndex];
              setCurrentTourIndex(nextIndex);
              setSelectedFeatureKey(nextFeature?.key || null);
            }}
            activeOpacity={0.7}>
            <Image
              source={require('../../assets/tour/arrow.png')}
              style={styles.arrowOverlayImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 20,
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
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
  },
  placeholder: {
    width: 24,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    width: '100%',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D2733',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4C5866',
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    width: '100%',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D2733',
  },
  primaryButton: {
    marginTop: 10,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#0097D9',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  mockupRow: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    position: 'relative',
  },
  mockupImage: {
    maxWidth: '100%',
    transform: [{translateY: 22}],
  },
  emptyMockup: {
    maxWidth: '100%',
    transform: [{translateY: 22}],
    backgroundColor: 'transparent',
  },
  arrowOverlayButton: {
    position: 'absolute',
    right: 2,
    top: '50%',
    transform: [{translateY: -23}],
    zIndex: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowOverlayImage: {
    width: 76,
    height: 136,
  },
});

export default AppTourScreen;

