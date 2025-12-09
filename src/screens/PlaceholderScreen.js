import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import {Colors, BorderRadius, FontSizes} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

const PlaceholderScreen = ({navigation, route}) => {
  const screenName = route?.params?.screenName || 'Screen';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Background Image */}
      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      {/* Header with back button */}
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
        <Text style={styles.headerTitle}>{screenName}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.comingSoonText}>Coming Soon</Text>
        <Text style={styles.descriptionText}>
          This feature is currently under development.
        </Text>
      </View>
    </SafeAreaView>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  comingSoonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.cyanBlue,
    marginBottom: 15,
  },
  descriptionText: {
    fontSize: FontSizes.large,
    color: Colors.grayColor,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default PlaceholderScreen;




















