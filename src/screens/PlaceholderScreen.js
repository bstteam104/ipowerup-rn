import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import {Colors, BorderRadius, FontSizes} from '../constants/Constants';
import Header from '../components/Header';

const PlaceholderScreen = ({navigation, route}) => {
  const screenName = route?.params?.screenName || 'Screen';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Header with back button */}
      <Header
        title={screenName}
        onBackPress={() => navigation.goBack()}
      />

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
    backgroundColor: Colors.white,
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




















