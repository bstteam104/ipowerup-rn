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
import Header from '../components/Header';

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
        <Header
          title="Notification Detail"
          onBackPress={() => navigation.goBack()}
        />

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

