import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
  Platform,
  Dimensions,
  PanResponder,
} from 'react-native';
import {Colors, FontSizes} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

const NotificationDetailScreen = ({navigation}) => {
  const [isCharging, setIsCharging] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderRelease: (evt, gestureState) => {
      const {dx} = gestureState;
      if (dx > 50) {
        // Swiped right
        setIsCharging(true);
      } else if (dx < -50) {
        // Swiped left
        setIsCharging(false);
      }
    },
  });

  const handleImageTap = () => {
    setIsCharging(!isCharging);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Image
              source={require('../../assets/icons/back-arrow.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Detail</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Swipe Image - matching iOS swipeImage */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleImageTap}
            {...panResponder.panHandlers}
          >
            <Image
              source={
                isCharging
                  ? require('../../assets/newfiles/newYellowslider.png')
                  : require('../../assets/newfiles/newBlueSlider.png')
              }
              style={styles.swipeImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.black,
  },
  headerTitle: {
    fontSize: FontSizes.heading,
    fontWeight: 'bold',
    color: Colors.lightBlackColor,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  swipeImage: {
    width: width * 0.8,
    height: 100,
  },
});

export default NotificationDetailScreen;

