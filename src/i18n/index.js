import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';

const LANGUAGE_KEY = '@ipowerup:language';

// Get saved language or default to English
const getSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    return savedLanguage || 'en';
  } catch (error) {
    console.error('Error getting saved language:', error);
    return 'en';
  }
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: {
        translation: en,
      },
      es: {
        translation: es,
      },
    },
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

// Load saved language on app start
getSavedLanguage().then((lang) => {
  i18n.changeLanguage(lang);
});

// Function to change language and save to AsyncStorage
export const changeLanguage = async (languageCode) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
    await i18n.changeLanguage(languageCode);
    return true;
  } catch (error) {
    console.error('Error changing language:', error);
    return false;
  }
};

// Function to get current language
export const getCurrentLanguage = () => {
  return i18n.language;
};

export default i18n;






