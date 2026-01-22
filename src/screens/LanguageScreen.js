import React, {useState, useEffect} from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';
import {changeLanguage, getCurrentLanguage} from '../i18n';
import {showSuccessToast, showErrorToast} from '../utils/toastHelper';

const {width, height} = Dimensions.get('window');

const LanguageScreen = ({navigation}) => {
  const {t, i18n} = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLanguageSetting();
  }, []);

  const loadLanguageSetting = async () => {
    try {
      const currentLang = getCurrentLanguage();
      setSelectedLanguage(currentLang || 'en');
    } catch (error) {
      console.error('Error loading language setting:', error);
    }
  };

  const showAlert = (title, message) => {
    Alert.alert(title, message, [{text: 'OK', style: 'default'}]);
  };

  const selectLanguage = (languageCode) => {
    setSelectedLanguage(languageCode);
  };

  const handleContinue = async () => {
    setIsLoading(true);

    try {
      // Change language immediately - this will update all screens
      await changeLanguage(selectedLanguage);
      
      console.log('✅ Language setting saved:', selectedLanguage);
      
      // Show success message in banner
      // Wait a bit for i18n to update
      setTimeout(() => {
        showSuccessToast(t('appSettings.languageUpdated'));
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }, 100);
    } catch (error) {
      console.error('Error updating language:', error);
      showErrorToast(t('common.somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
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
          <Text style={styles.headerTitle}>{t('appSettings.language')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Language Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => selectLanguage('en')}
            activeOpacity={0.7}
          >
            <Image
              source={
                selectedLanguage === 'en'
                  ? require('../../assets/icons/checkbox-checked.png')
                  : require('../../assets/icons/checkbox-unchecked.png')
              }
              style={styles.checkIcon}
              resizeMode="contain"
            />
            <Text style={styles.optionText}>{t('appSettings.english')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => selectLanguage('es')}
            activeOpacity={0.7}
          >
            <Image
              source={
                selectedLanguage === 'es'
                  ? require('../../assets/icons/checkbox-checked.png')
                  : require('../../assets/icons/checkbox-unchecked.png')
              }
              style={styles.checkIcon}
              resizeMode="contain"
            />
            <Text style={styles.optionText}>{t('appSettings.spanish')}</Text>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? t('common.updating', 'Updating...') : t('common.continue')}
          </Text>
        </TouchableOpacity>
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
  optionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  checkIcon: {
    width: 24,
    height: 24,
    marginRight: 15,
  },
  optionText: {
    fontSize: FontSizes.large,
    fontWeight: '500',
    color: Colors.lightBlackColor,
  },
  continueButton: {
    marginHorizontal: 20,
    marginTop: 40,
    height: 50,
    backgroundColor: Colors.signInBlue,
    borderRadius: BorderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: Colors.white,
  },
});

export default LanguageScreen;

