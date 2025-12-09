import React from 'react';
import {View, Text, TouchableOpacity, Image, StyleSheet, Platform, StatusBar} from 'react-native';
import {Colors, FontSizes} from '../constants/Constants';

const Header = ({title, onBackPress, showBackButton = true, headerHeight = 50}) => {
  const statusBarHeight = Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0;
  // Top padding: status bar + extra spacing (increased for better spacing)
  const topPadding = statusBarHeight + (Platform.OS === 'ios' ? 12 : 16);
  
  return (
    <View style={[styles.header, {height: headerHeight, paddingTop: topPadding, paddingBottom: 16}]}>
      {showBackButton ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress}
          activeOpacity={0.7}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <Image
            source={require('../../assets/icons/back-arrow-ios.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.placeholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  backButton: {
    width: 24,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.black,
    opacity: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSizes.heading,
    fontWeight: 'bold',
    color: Colors.lightBlackColor,
    textAlign: 'center',
  },
  placeholder: {
    width: 24,
  },
});

export default Header;

