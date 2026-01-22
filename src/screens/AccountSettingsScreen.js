import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';
import {updateAccountAPI, getLoggedInUser} from '../services/AuthService';
import {showSuccessToast, showErrorToast} from '../utils/toastHelper';

const {width, height} = Dimensions.get('window');

const AccountSettingsScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [alternateEmail, setAlternateEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyNumber, setEmergencyNumber] = useState('');
  const [country, setCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getLoggedInUser();
      if (user) {
        setFirstName(user.first_name || '');
        setLastName(user.last_name || '');
        setEmail(user.email || '');
        setAlternateEmail(user.alternate_email || '');
        setPhone(user.phone || '');
        setEmergencyNumber(user.emergency_number || '');
        setCountry(user.country || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const showAlert = (title, message) => {
    Alert.alert(title, message, [{text: 'OK', style: 'default'}]);
  };

  const handleUpdate = async () => {
    if (!firstName || firstName.trim() === '') {
      showAlert(t('common.error'), t('validation.enterFirstName'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateAccountAPI({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        alternateEmail: alternateEmail.trim(),
        phone: phone.trim(),
        emergencyNumber: emergencyNumber.trim(),
        country: country.trim() || 'USA',
      });

      if (result.success && result.user) {
        // Show success message in banner
        showSuccessToast(t('accountSettings.updated', 'Profile Updated Successfully'));
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        // Show error message from backend
        const errorMessage = result.error?.message || t('common.somethingWentWrong', 'Something went wrong. Please try again.');
        setBannerMessage(errorMessage);
        setBannerType('error');
        setShowBanner(true);
      }
    } catch (error) {
      const errorMessage = error.message || t('common.somethingWentWrong', 'Something went wrong. Please try again.');
      setBannerMessage(errorMessage);
      setBannerType('error');
      setShowBanner(true);
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
      
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            <Text style={styles.headerTitle}>{t('accountSettings.title')}</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* First Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('accountSettings.firstName')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('accountSettings.firstName')}
                placeholderTextColor={Colors.grayColor}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>

            {/* Last Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('accountSettings.lastName')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('accountSettings.lastName')}
                placeholderTextColor={Colors.grayColor}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.grayColor}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Alternate Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('accountSettings.alternateEmail')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('accountSettings.alternateEmail')}
                placeholderTextColor={Colors.grayColor}
                value={alternateEmail}
                onChangeText={setAlternateEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('accountSettings.phoneNumber')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('accountSettings.phoneNumber')}
                placeholderTextColor={Colors.grayColor}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Emergency Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('accountSettings.emergencyNumber')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('accountSettings.emergencyNumber')}
                placeholderTextColor={Colors.grayColor}
                value={emergencyNumber}
                onChangeText={setEmergencyNumber}
                keyboardType="phone-pad"
              />
            </View>

            {/* Country */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                placeholder="Country"
                placeholderTextColor={Colors.grayColor}
                value={country}
                onChangeText={setCountry}
                autoCapitalize="words"
              />
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.buttonDisabled]}
              onPress={handleUpdate}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>
                {isLoading ? t('common.updating') : t('common.continue')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
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
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: FontSizes.medium,
    fontWeight: '500',
    color: Colors.lightBlackColor,
    marginBottom: 8,
  },
  input: {
    height: 49,
    borderWidth: 1,
    borderColor: Colors.inputBorderColor,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    fontSize: FontSizes.regular,
    color: Colors.lightBlackColor,
  },
  continueButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.signInBlue,
    borderRadius: BorderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
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

export default AccountSettingsScreen;









