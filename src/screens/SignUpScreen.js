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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';

const {width} = Dimensions.get('window');

const SignUpScreen = ({navigation}) => {
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
      showAlert('Error', 'Please enter your first name.');
      return;
    }

    if (!email || email.trim() === '') {
      showAlert('Error', 'Please enter your email address.');
      return;
    }

    if (!password || password.trim() === '') {
      showAlert('Error', 'Please enter your password.');
      return;
    }

    if (!country || country.trim() === '') {
      showAlert('Error', 'Please enter your country.');
      return;
    }

    if (!isValidEmail(email)) {
      showAlert('Error', 'Please enter a valid email address.');
      return;
    }

    if (!isValidPassword(password)) {
      showAlert('Invalid Password', 'Password must be at least 8 characters long, contain at least one letter, one number, and one special character.');
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      showAlert('Error', 'You must agree to the Terms & Conditions and Privacy Policy.');
      return;
    }

    setIsLoading(true);

    try {
      const params = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        country: country,
        password: password,
        password_confirmation: password,
        terms_conditions: termsAccepted ? "1" : "0",
        privacy_policy: privacyAccepted ? "1" : "0",
        udid: Constants.UDID,
        device_type: Constants.platform,
        device_token: Constants.deviceToken,
        device_brand: Constants.deviceBrand,
        device_os: Constants.platform,
        app_version: "0.1"
      };

      const response = await fetch(`${Constants.baseURLDev}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (data && data.data) {
        await AsyncStorage.setItem('loggedInUser', JSON.stringify(data.data));
        await AsyncStorage.setItem('accessToken', data.data.token || '');
        await AsyncStorage.setItem('isUserLoggedIn', 'true');
        navigation.replace('TabBar');
      } else {
        const errorMsg = data?.messages?.msg?.[0] || data?.messages?.email?.[0] || 'Something went wrong';
        showAlert('Error', errorMsg);
      }
    } catch (error) {
      showAlert('Error', error.message || 'Something went wrong');
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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
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
          <Text style={styles.title}>Create an Account</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Create a new App account. This is the same{'\n'}account used for iPowerUp.com
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
                  placeholder="First Name"
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
                  placeholder="Last Name"
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
                  placeholder="Email Address"
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
                  placeholder="Password"
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
                  placeholder="Country"
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
                I agree to iPowerUp{' '}
                <Text style={styles.linkText} onPress={handleTermsPress}>
                  Terms & Conditions
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
                I consent to the use of my personal information in accordance with iPowerUp{' '}
                <Text style={styles.linkText} onPress={handlePrivacyPress}>
                  Privacy Policy
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
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Back to Sign In */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backSignInContainer}
            >
              <Text style={styles.backSignInText}>Back to Sign In</Text>
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
    backgroundColor: Colors.white,
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






























