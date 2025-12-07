import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
} from 'react-native';
import {Colors, FontSizes} from '../constants/Constants';
import Header from '../components/Header';

const TermsAndConditionsScreen = ({navigation}) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Header
          title="Terms & Conditions"
          onBackPress={() => navigation.goBack()}
          headerHeight={60}
        />

        {/* Content - matching iOS */}
        <View style={styles.content}>
          <Text style={styles.contentText}>
            Terms and Conditions content will be displayed here.
          </Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  contentText: {
    fontSize: FontSizes.regular,
    color: Colors.lightBlackColor,
    lineHeight: 24,
  },
});

export default TermsAndConditionsScreen;









