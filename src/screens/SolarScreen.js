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
  const [selectedPanel, setSelectedPanel] = useState(1); // 1 or 2, matches iOS radio buttons

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

            {/* iOS-style gauge image inside its own shadow box (first white box in PDF) */}
            <View style={styles.gaugeImageShadowBox}>
              <Image
                source={
                  selectedPanel === 1
                    ? require('../../assets/solar/solarImage1.png')
                    : require('../../assets/solar/solarImage2.png')
                }
                style={styles.gaugeImage}
                resizeMode="contain"
              />
            </View>

            {/* Solar Panels Label */}
            <View style={styles.panelsRow}>
              <Text style={styles.panelsLabel}>Solar Panels #</Text>

              {/* Panel 1 radio */}
              <TouchableOpacity
                style={styles.panelOption}
                activeOpacity={0.7}
                onPress={() => setSelectedPanel(1)}>
                <Text style={styles.panelNumber}>1</Text>
                <Image
                  source={
                    selectedPanel === 1
                      ? require('../../assets/solar/selectedBlueCircle.png')
                      : require('../../assets/solar/blueCircle.png')
                  }
                  style={styles.radioIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* Panel 2 radio */}
              <TouchableOpacity
                style={styles.panelOption}
                activeOpacity={0.7}
                onPress={() => setSelectedPanel(2)}>
                <Text style={styles.panelNumber}>2</Text>
                <Image
                  source={
                    selectedPanel === 2
                      ? require('../../assets/solar/selectedBlueCircle.png')
                      : require('../../assets/solar/blueCircle.png')
                  }
                  style={styles.radioIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* mA Value */}
            <Text style={styles.maValue}>{solarMilliAmps} mA</Text>
            <Text style={styles.maSubtext}>mA = Milliamps of Current*</Text>
          </View>

          {/* Improve Solar Collection subtitle (outside card, like design) */}
          <Text style={styles.sectionSubtitle}>Improve Solar Collection</Text>

          {/* Improve Solar Collection image only (asset already has white card) */}
          <View style={styles.imageOnlyContainer}>
            <Image
              source={require('../../assets/solar/mobileImage.png')}
              style={styles.phoneImage}
              resizeMode="contain"
            />
          </View>

          {/* Tips & note below card (outside), inline like PDF */}
          <Text style={styles.tipTitle}>For faster solar collection:</Text>
          <Text style={styles.tipText}>Adjust case direction and angle</Text>

          <Text style={styles.noteText}>
            *A Milliamp is one thousandth of an Ampere, a unit of electrical current.
          </Text>

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
  imageOnlyContainer: {
    alignSelf: 'center',
    width: width * 0.72,
    // Same padding & radius as main Solar Collection card so heights match
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 15,
    alignItems: 'center',
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
    // Header matches iOS: full-width, centered main title
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    // Extra space between heading/subheading and first card
    paddingBottom: 8,
    alignItems: 'center',
  },
  headerTitle: {
    // Match app/global heading style (same as Home section titles)
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D2733',
    // Extra space before subtitle
    marginBottom: 8,
    textAlign: 'center',
    alignSelf: 'center',
  },
  headerSubtitle: {
    // Subheading style – match heading weight (bold) like design
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1D2733',
    marginTop: 2,
    marginBottom: 6,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  card: {
    // iOS-style centered card, inset from screen edges (slimmer like PDF)
    alignSelf: 'center',
    width: width * 0.72,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
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
    // Card subheading style – lighter than main title
    fontSize: 13,
    fontWeight: '500',
    color: '#888888',
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  gaugeImageShadowBox: {
    alignSelf: 'center',
    width: '88%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 18,
  },
  gaugeImage: {
    width: '86%',
    height: 140,
    alignSelf: 'center',
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
  panelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
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
    marginRight: 3,
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
  radioIcon: {
    width: 16,
    height: 16,
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
  sectionSubtitle: {
    // Matches header subtitle styling for section titles
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1D2733',
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 32,
    textAlign: 'left',
  },
  imageShadowBox: {
    alignSelf: 'stretch',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 16,
  },
  phoneImageContainer: {
    marginBottom: 0,
    alignItems: 'center',
  },
  phoneImage: {
    width: '100%',
    height: 190,
  },
  tipTitle: {
    // Subheading style under Improve Solar Collection
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1D2733',
    marginTop: 8,
    marginBottom: 3,
    paddingHorizontal: 32,
    textAlign: 'left',
  },
  tipText: {
    fontSize: 15,
    color: '#1D2733', // black-ish, like design
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 32,
    textAlign: 'left',
  },
  noteText: {
    fontSize: 13,
    color: '#1D2733',
    fontWeight: '600',
    textAlign: 'left',
    fontStyle: 'italic',
    paddingHorizontal: 32,
  },
});

export default SolarScreen;
