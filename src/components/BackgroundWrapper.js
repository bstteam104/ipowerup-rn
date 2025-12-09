import React from 'react';
import {View, Image, StyleSheet, Dimensions} from 'react-native';

const {width, height} = Dimensions.get('window');

const BackgroundWrapper = ({children}) => {
  return (
    <View style={styles.container}>
      {/* Background Image - matching iOS backgroundSplashScreen with alpha 0.55 */}
      <Image
        source={require('../../assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      {/* Content */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    opacity: 0.55, // Same as iOS alpha
  },
});

export default BackgroundWrapper;





























