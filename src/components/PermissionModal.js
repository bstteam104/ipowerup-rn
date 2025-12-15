// Permission Modal
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from 'react-native';

const {width, height} = Dimensions.get('window');

const PermissionModal = ({
  visible,
  onAllow,
  onDontAllow,
  permissionType = 'bluetooth',
  discoveredDevices = [],
  deviceCount = 0,
  hasPermissionGranted = false,
  showStaticDevices = false,
  onDevicePress, // optional: called when user taps the iPowerUp device icon
}) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [iPowerUpDevice, setIPowerUpDevice] = useState(null);
  const [otherDevices, setOtherDevices] = useState([]);
  
  // Static placeholder devices (before permission granted)
  const staticDevices = [
    {name: 'MacBook Pro', initials: 'MB'},
    {name: '[TV] Samsung Q...', initials: 'TV'},
    {name: "Rob's Apple Watch", initials: 'AW'},
  ];

  // Pulse animation for Bluetooth icon
  useEffect(() => {
    if (visible) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
    }
  }, [visible]);

  // Process discovered devices - only iPowerUp Uno devices
  useEffect(() => {
    // Only process real devices if permission is granted and scanning has started
    if (hasPermissionGranted && discoveredDevices && discoveredDevices.length > 0) {
      console.log('🔄 Processing iPowerUp devices in PermissionModal:', discoveredDevices.length, discoveredDevices.map(d => d.name));
      
      // Only iPowerUp Uno devices are discovered (filtered in BLEManager)
      // All devices in discoveredDevices are iPowerUp Uno devices
      const iPowerUp = discoveredDevices[0] || null; // First iPowerUp device
      
      setIPowerUpDevice(iPowerUp);
      setOtherDevices([]); // No other devices
      
      console.log('✅ iPowerUp found:', !!iPowerUp);
    } else if (!hasPermissionGranted) {
      // Before permission granted - use static devices
      setIPowerUpDevice(null);
      setOtherDevices([]);
    } else {
      // Permission granted but no devices yet
      setIPowerUpDevice(null);
      setOtherDevices([]);
    }
  }, [discoveredDevices, hasPermissionGranted]);

  // Calculate device count - static for first modal, real for second modal
  const displayCount = showStaticDevices 
    ? 46 // Static count for first modal
    : (discoveredDevices.length > 0 ? discoveredDevices.length : 0); // Real count for second modal

  const getTitle = () => {
    if (permissionType === 'bluetooth') {
      return "Allow 'iPowerUp' to find Bluetooth devices?";
    }
    return "Permission Required";
  };

  const getDescription = () => {
    if (permissionType === 'bluetooth') {
      return "This app requires Bluetooth to connect to BLE devices.";
    }
    return 'This permission is required for the app to function properly.';
  };

  // Debug log
  console.log('🔍 PermissionModal - hasPermissionGranted:', hasPermissionGranted, 'discoveredDevices:', discoveredDevices.length, 'staticDevices:', staticDevices.length);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDontAllow}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.question}>{getTitle()}</Text>
            
            <Text style={styles.description}>{getDescription()}</Text>

            {/* Map Background with Device Icons */}
            <View style={styles.mapContainer}>
              {/* Map-like background (light gray with grid pattern) */}
              <View style={styles.mapBackground}>
                {/* Central Bluetooth Icon with Pulse */}
                <View style={styles.centerIconContainer}>
                  <Animated.View
                    style={[
                      styles.pulseCircle,
                      {
                        transform: [{scale: pulseAnim}],
                      },
                    ]}
                  />
                  <View style={styles.bluetoothIconContainer}>
                    <Text style={styles.bluetoothSymbol}>📶</Text>
                  </View>
                </View>

                {/* iPowerUp Device - Top Center (if found - only after permission) */}
                {hasPermissionGranted && iPowerUpDevice && iPowerUpDevice.name && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.deviceIcon, styles.iPowerUpDevice]}
                    onPress={() => {
                      if (onDevicePress) {
                        onDevicePress(iPowerUpDevice);
                      }
                    }}
                  >
                    <View style={[styles.deviceBadge, styles.iPowerUpBadge]}>
                      <Text style={[styles.deviceIconText, styles.iPowerUpBadgeText]}>
                        {iPowerUpDevice.name.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.deviceLabel} numberOfLines={1}>
                      {iPowerUpDevice.name.length > 15 
                        ? iPowerUpDevice.name.substring(0, 15) + '...'
                        : iPowerUpDevice.name}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* No other devices shown - only iPowerUp Uno */}

                {/* Static Placeholder Devices - Only show if showStaticDevices is true (First Modal) */}
                {showStaticDevices && staticDevices.map((device, index) => {
                  const positions = [styles.device1, styles.device2, styles.device3];
                  const positionStyle = positions[index] || styles.device1;
                  
                  console.log('📱 Rendering static device:', device.name, 'at position', index);
                  
                  return (
                    <View key={`static-${index}`} style={[styles.deviceIcon, positionStyle]}>
                      <View style={styles.deviceBadge}>
                        <Text style={styles.deviceIconText}>{device.initials}</Text>
                      </View>
                      <Text style={styles.deviceLabel} numberOfLines={1}>
                        {device.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Device Count - Real-time */}
            <Text style={styles.deviceCountText}>
              {displayCount} {displayCount === 1 ? 'device' : 'devices'} found
            </Text>

            {/* Additional Info */}
            <Text style={styles.infoText}>
              Information from Bluetooth devices can be used to determine your location and create a profile of you.
            </Text>
          </View>

          {/* Buttons - Only show on first modal (static UI) */}
          {showStaticDevices && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.dontAllowButton]}
                onPress={onDontAllow}
                activeOpacity={0.7}
              >
                <Text style={styles.dontAllowText}>Don't Allow</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.allowButton]}
                onPress={onAllow}
                activeOpacity={0.7}
              >
                <Text style={styles.allowText}>Allow</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Close button - show on second modal (scanning) */}
          {!showStaticDevices && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onDontAllow}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D2733',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  mapContainer: {
    width: '100%',
    height: 200,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    position: 'relative',
    // Grid pattern effect
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  centerIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0097D9',
    opacity: 0.3,
  },
  bluetoothIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0097D9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bluetoothSymbol: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  deviceIcon: {
    position: 'absolute',
    alignItems: 'center',
  },
  deviceBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0097D9',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceIconText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0097D9',
  },
  iPowerUpBadge: {
    backgroundColor: '#0097D9',
    borderColor: '#FFFFFF',
  },
  iPowerUpBadgeText: {
    color: '#FFFFFF',
  },
  deviceLabel: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 80,
  },
  // iPowerUp Device - Top Center
  iPowerUpDevice: {
    top: 20,
    left: '50%',
    marginLeft: -18,
  },
  // Device 1 - Top Left
  device1: {
    top: 30,
    left: 30,
  },
  // Device 2 - Bottom Right
  device2: {
    bottom: 30,
    right: 30,
  },
  // Device 3 - Top Right
  device3: {
    top: 40,
    right: 40,
  },
  deviceCountText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D2733',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dontAllowButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  allowButton: {
    backgroundColor: '#0097D9',
  },
  dontAllowText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D2733',
  },
  allowText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
});

export default PermissionModal;
