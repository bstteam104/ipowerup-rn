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
import {useTranslation} from 'react-i18next';
import {Colors, BorderRadius, FontSizes} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

const SubscriptionScreen = ({navigation}) => {
  const {t} = useTranslation();
  const handleSelect = () => {
    Alert.alert(t('common.success'), t('subscription.success', 'Subscription Successful.'), [
      {
        text: t('common.ok', 'OK'),
        onPress: () => {
          // Navigate back after 0.8 seconds
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
          <Text style={styles.headerTitle}>{t('peaceOfMind.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* White Card with Content */}
          <View style={styles.cardContainer}>
            <Text style={styles.cardTitle}>{t('peaceOfMind.subtitle')}</Text>
            
            <View style={styles.textContainer}>
              <Text style={styles.paragraph}>
                {t('peaceOfMind.description')}
              </Text>
              
              <Text style={styles.paragraph}>
                {t('peaceOfMind.batteryAlerts')}
              </Text>
              
              <Text style={styles.paragraph}>
                {t('peaceOfMind.bluetoothRange')}
              </Text>
              
              <Text style={styles.paragraph}>
                {t('peaceOfMind.temperatureAlerts')}
              </Text>
              
              <Text style={styles.paragraph}>
                {t('peaceOfMind.history')}
              </Text>
              
              <Text style={styles.paragraph}>
                {t('peaceOfMind.enhancements')}
              </Text>
            </View>
          </View>

          {/* Select Button - Yellow, */}
          <TouchableOpacity
            style={styles.selectButton}
            onPress={handleSelect}
            activeOpacity={0.8}
          >
            <Text style={styles.selectButtonText}>{t('peaceOfMind.select')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    backgroundColor: Colors.progressYellow, // Yellow systemYellowColor
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black, // Black text on yellow
  },
});

export default SubscriptionScreen;









