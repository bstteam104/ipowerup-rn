import React, {useState} from 'react';
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

const {width, height} = Dimensions.get('window');

const SolarScreen = ({navigation}) => {
  const [solarMilliAmps, setSolarMilliAmps] = useState(0);
  const [selectedRange, setSelectedRange] = useState('250'); // '250' or '500'
  const maxValue = selectedRange === '250' ? 250 : 500;

  const selectRadio = (range) => {
    setSelectedRange(range);
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
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Solar Energy Receiving</Text>
            <Text style={styles.headerSubtitle}>Solar Collection Now</Text>
          </View>

          {/* Gauge Card */}
          <View style={styles.card}>
            {/* Small header inside card */}
            <View style={styles.cardHeaderRow}>
              <Text style={styles.smallHeaderText}>Solar Energy Receiving</Text>
            </View>

            {/* Semi-circular Gauge with Battery */}
            <View style={styles.gaugeContainer}>
              <View style={styles.gaugeWrapper}>
                {/* Outer arc */}
                <View style={styles.gaugeArc}>
                  <View style={styles.gaugeFill} />
                </View>
                {/* Center battery */}
                <View style={styles.batteryCenter}>
                  <Image
                    source={require('../../assets/batteries/bat_0.png')}
                    style={styles.batteryIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>

            {/* Solar Panels Label */}
            <View style={styles.panelsRow}>
              <Text style={styles.panelsLabel}>Solar Panels #</Text>
              <Text style={styles.panelNumber}>1</Text>
              <View style={[styles.panelDot, styles.panelDotOrange]} />
              <Text style={styles.panelNumber}>2</Text>
              <View style={[styles.panelDot, styles.panelDotBlue]} />
            </View>

            {/* mA Value */}
            <Text style={styles.maValue}>{solarMilliAmps} mA</Text>
            <Text style={styles.maSubtext}>mA = Milliamps of Current*</Text>
          </View>

          {/* Improve Solar Collection Card */}
          <View style={styles.card}>
            <Text style={styles.improveTitle}>Improve Solar Collection</Text>
            
            {/* Phone with Sun Image - tilted phone catching sunlight */}
            <View style={styles.phoneImageContainer}>
              <Image
                source={selectedRange === '250' 
                  ? require('../../assets/solar/solarImage1.png')
                  : require('../../assets/solar/solarImage2.png')
                }
                style={styles.phoneImage}
                resizeMode="contain"
              />
            </View>

            {/* Tips */}
            <Text style={styles.tipTitle}>For faster solar collection:</Text>
            <Text style={styles.tipText}>Adjust case direction and angle</Text>

            {/* Note */}
            <Text style={styles.noteText}>
              *A Milliamp is one thousandth of an Ampere, a unit of electrical current.
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Bottom Tab indicator showing Solar is selected */}
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
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 10,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D2733',
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888888',
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeaderRow: {
    width: '100%',
    marginBottom: 10,
  },
  smallHeaderText: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  gaugeWrapper: {
    width: 180,
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  gaugeArc: {
    position: 'absolute',
    width: 180,
    height: 90,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    borderWidth: 12,
    borderBottomWidth: 0,
    borderColor: '#0097D9',
    backgroundColor: 'transparent',
    top: 0,
  },
  gaugeFill: {
    position: 'absolute',
    width: 156,
    height: 78,
    borderTopLeftRadius: 78,
    borderTopRightRadius: 78,
    backgroundColor: '#FFFFFF',
    top: 0,
    left: 0,
  },
  batteryCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1D2733',
    marginBottom: 5,
  },
  batteryIcon: {
    width: 30,
    height: 45,
  },
  panelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  panelsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginRight: 5,
  },
  panelNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginHorizontal: 3,
  },
  panelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 2,
  },
  panelDotOrange: {
    backgroundColor: '#FF9500',
  },
  panelDotBlue: {
    backgroundColor: '#0097D9',
  },
  maValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1D2733',
    marginBottom: 5,
  },
  maSubtext: {
    fontSize: 12,
    color: '#0097D9',
  },
  improveTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D2733',
    marginBottom: 20,
  },
  phoneImageContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  phoneImage: {
    width: width * 0.45,
    height: 140,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D2733',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 15,
  },
  noteText: {
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 10,
  },
});

export default SolarScreen;
