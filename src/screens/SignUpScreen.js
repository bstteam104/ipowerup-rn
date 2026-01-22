import React, {useState} from 'react';
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
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';
import {registerAPI} from '../services/AuthService';
import {showErrorToast} from '../utils/toastHelper';

const {width} = Dimensions.get('window');

const SignUpScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = (email) => {
    const emailRegex = /[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}/;
    return emailRegex.test(email);
  };

  const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
    return passwordRegex.test(password);
  };

  const showAlert = (title, message) => {
    Alert.alert(title, message, [{text: 'OK', style: 'default'}]);
  };

  const handleSignUp = async () => {
    if (!firstName || firstName.trim() === '') {
      showAlert(t('common.error'), t('validation.enterFirstName'));
      return;
    }

    if (!email || email.trim() === '') {
      showAlert(t('common.error'), t('validation.enterEmail'));
      return;
    }

    if (!password || password.trim() === '') {
      showAlert(t('common.error'), t('validation.enterPassword'));
      return;
    }

    if (!country || country.trim() === '') {
      showAlert(t('common.error'), t('validation.enterCountry'));
      return;
    }

    if (!isValidEmail(email)) {
      showAlert(t('common.error'), t('validation.validEmail'));
      return;
    }

    if (!isValidPassword(password)) {
      showAlert('Invalid Password', 'Password must be at least 8 characters long, contain at least one letter, one number, and one special character.');
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      showAlert(t('common.error'), t('validation.agreeTerms'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerAPI({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password: password,
        country: country.trim(),
        termsAccepted: termsAccepted,
        privacyAccepted: privacyAccepted,
      });

      if (result.success && result.user) {
        // Successfully registered and logged in, navigate to TabBar (like iOS nextViewController)
        navigation.reset({
          index: 0,
          routes: [{name: 'TabBar'}],
        });
      } else {
        // Show error message from backend
        const errorMessage = result.error?.message || t('common.somethingWentWrong', 'Something went wrong. Please try again.');
        showErrorToast(errorMessage);
      }
    } catch (error) {
      // Show error message
      const errorMessage = error.message || t('common.somethingWentWrong', 'Something went wrong. Please try again.');
      showErrorToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTermsPress = () => {
    navigation.navigate('TermsAndConditions');
  };

  const handlePrivacyPress = () => {
    navigation.navigate('PrivacyPolicy');
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
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <Image
            source={require('../../assets/blueLogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Title */}
          <Text style={styles.title}>{t('signup.title')}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {t('signup.subtitle')}
          </Text>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* First Name Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Image
                  source={require('../../assets/icons/profile-icon.png')}
                  style={styles.inputIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('signup.firstNamePlaceholder')}
                  placeholderTextColor={Colors.grayColor}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Last Name Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Image
                  source={require('../../assets/icons/profile-icon.png')}
                  style={styles.inputIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('signup.lastNamePlaceholder')}
                  placeholderTextColor={Colors.grayColor}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Image
                  source={require('../../assets/icons/email-icon.png')}
                  style={styles.inputIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('signup.emailPlaceholder')}
                  placeholderTextColor={Colors.grayColor}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Image
                  source={require('../../assets/icons/password-icon.png')}
                  style={styles.inputIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('signup.passwordPlaceholder')}
                  placeholderTextColor={Colors.grayColor}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIconContainer}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Country Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Image
                  source={require('../../assets/icons/location-icon.png')}
                  style={styles.inputIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('signup.countryPlaceholder')}
                  placeholderTextColor={Colors.grayColor}
                  value={country}
                  onChangeText={setCountry}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Terms & Conditions Checkbox */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <Image
                  source={
                    termsAccepted
                      ? require('../../assets/icons/checkbox-checked.png')
                      : require('../../assets/icons/checkbox-unchecked.png')
                  }
                  style={styles.checkboxIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <Text style={styles.checkboxText}>
                {t('signup.agreeTerms')}
                {' '}
                <Text style={styles.linkText} onPress={handleTermsPress}>
                  {t('common.terms', 'Terms & Conditions')}
                </Text>
              </Text>
            </View>

            {/* Privacy Policy Checkbox */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setPrivacyAccepted(!privacyAccepted)}
              >
                <Image
                  source={
                    privacyAccepted
                      ? require('../../assets/icons/checkbox-checked.png')
                      : require('../../assets/icons/checkbox-unchecked.png')
                  }
                  style={styles.checkboxIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <Text style={styles.checkboxText}>
                {t('signup.agreePrivacy')}
                {' '}
                <Text style={styles.linkText} onPress={handlePrivacyPress}>
                  {t('common.privacy', 'Privacy Policy')}
                </Text>
              </Text>
            </View>

            {/* Create Account Button */}
            <TouchableOpacity 
              style={[styles.createButton, isLoading && styles.buttonDisabled]} 
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.createButtonText}>
                {isLoading ? t('common.creatingAccount', 'Creating account...') : t('signup.createAccount')}
              </Text>
            </TouchableOpacity>

            {/* Back to Sign In */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backSignInContainer}
            >
              <Text style={styles.backSignInText}>{t('signup.backToSignIn', 'Back to Sign In')}</Text>
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
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logo: {
    width: 240,
    height: 59,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: 'bold',
    color: Colors.lightBlackColor,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: FontSizes.large,
    fontWeight: '500',
    color: Colors.grayColor,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 49,
    borderWidth: 1,
    borderColor: Colors.inputBorderColor,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
  },
  inputIcon: {
    width: 16,
    height: 16,
    marginRight: 20,
    tintColor: Colors.grayColor,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.regular,
    color: Colors.lightBlackColor,
    paddingVertical: 0,
  },
  eyeIconContainer: {
    padding: 5,
  },
  eyeIcon: {
    fontSize: 18,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingRight: 20,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxIcon: {
    width: 22,
    height: 22,
  },
  checkboxText: {
    flex: 1,
    fontSize: FontSizes.medium,
    color: Colors.lightBlackColor,
    lineHeight: 20,
  },
  linkText: {
    color: Colors.cyanBlue,
    textDecorationLine: 'underline',
  },
  createButton: {
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
  createButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: Colors.white,
  },
  backSignInContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  backSignInText: {
    fontSize: FontSizes.medium,
    fontWeight: '500',
    color: Colors.black,
    textDecorationLine: 'underline',
  },
});

export default SignUpScreen;






























