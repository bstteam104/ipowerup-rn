import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import {Colors, BorderRadius, FontSizes} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

const SubscriptionScreen = ({navigation}) => {
  const handleSelect = () => {
    Alert.alert('Success', 'Subscription Successful.', [
      {
        text: 'OK',
        onPress: () => {
          // Navigate back after 0.8 seconds - matching iOS
          setTimeout(() => {
            navigation.goBack();
          }, 800);
        },
      },
    ]);
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
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={styles.headerTitle}>Peace of Mind Subscription</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content - matching iOS */}
        <View style={styles.content}>
          {/* White Card with Content - matching iOS */}
          <View style={styles.cardContainer}>
            <Text style={styles.cardTitle}>Subscribe and know what your case knows</Text>
            
            <View style={styles.textContainer}>
              <Text style={styles.paragraph}>
                Get peace of mind from a case and app that monitors your case and phone so you don't need to.
              </Text>
              
              <Text style={styles.paragraph}>
                Get alerts at 5%, 20%, 80%, and 100% battery power levels, plus additional optional levels.
              </Text>
              
              <Text style={styles.paragraph}>
                Enable case-to-phone communication even when the case is detached within Bluetooth range of up to 33 feet or 10 meters.
              </Text>
              
              <Text style={styles.paragraph}>
                Get case temperature alerts to prevent your case and phone from extreme temperature damage. Above 104° F or 40° C and below 32° F or 0° C.
              </Text>
              
              <Text style={styles.paragraph}>
                Check your battery usage history to understand opportunities for enhanced performance.
              </Text>
              
              <Text style={styles.paragraph}>
                Enjoy app enhancements throughout the year that provide continuous peace-of-mind improvements.
              </Text>
            </View>
          </View>

          {/* Select Button - Yellow, matching iOS */}
          <TouchableOpacity
            style={styles.selectButton}
            onPress={handleSelect}
            activeOpacity={0.8}
          >
            <Text style={styles.selectButtonText}>Select</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    opacity: 0.55,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  cardContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 20,
    textAlign: 'center',
  },
  textContainer: {
    // Paragraphs have marginBottom in paragraph style
  },
  paragraph: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.black,
    lineHeight: 20,
    marginBottom: 10,
  },
  selectButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.progressYellow, // Yellow - matching iOS systemYellowColor
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black, // Black text on yellow - matching iOS
  },
});

export default SubscriptionScreen;









