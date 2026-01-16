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
import {useTranslation} from 'react-i18next';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';

const {width} = Dimensions.get('window');

const LoginScreen = ({navigation}) => {
  const {t} = useTranslation();
  const [email, setEmail] = useState('bstteam@gmail.com');
  const [password, setPassword] = useState('bstteam');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = (email) => {
    const emailRegex = /[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}/;
    return emailRegex.test(email);
  };

  const isValidPassword = (password) => {
    // Minimum 8 characters, at least one letter, one number, and one special character
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
    return passwordRegex.test(password);
  };

  const showAlert = (title, message) => {
    Alert.alert(title, message, [{text: 'OK', style: 'default'}]);
  };

  const handleSignIn = async () => {
    // For UI testing - skip validation and API, directly go to dashboard
    // TODO: Enable validation and API call when backend is ready
    
    /*
    if (!email || email.trim() === '') {
      showAlert('Error', 'Please enter your email address.');
      return;
    }

    if (!password || password.trim() === '') {
      showAlert('Error', 'Please enter your password.');
      return;
    }

    if (!isValidEmail(email)) {
      showAlert('Error', 'Please enter a valid email address.');
      return;
    }

    if (!isValidPassword(password)) {
      showAlert('Error', 'Password must be at least 8 characters long, contain at least one letter, one number, and one special character.');
      return;
    }
    */

    // Temporarily save mock user data for UI testing
    const mockUser = {
      id: 1,
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User',
      email: email || 'test@ipowerup.com',
      tempreture: 'celsius',
    };
    
    await AsyncStorage.setItem('loggedInUser', JSON.stringify(mockUser));
    await AsyncStorage.setItem('isUserLoggedIn', 'true');
    
    // Navigate directly to TabBar (Dashboard)
    navigation.replace('TabBar');
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
          {/* Logo layout */}
          <Image
            source={require('../../assets/blueLogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Title */}
          <Text style={styles.title}>{t('login.title')}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {t('login.subtitle')}
          </Text>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Email Field CustomTextField */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Image
                  source={require('../../assets/icons/email-icon.png')}
                  style={styles.inputIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('login.emailPlaceholder')}
                  placeholderTextColor={Colors.grayColor}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field CustomPaswordTextField */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Image
                  source={require('../../assets/icons/password-icon.png')}
                  style={styles.inputIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('login.passwordPlaceholder')}
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

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordText}>{t('login.forgotPassword')}</Text>
            </TouchableOpacity>

            {/* Sign In Button button styling */}
            <TouchableOpacity 
              style={[styles.signInButton, isLoading && styles.buttonDisabled]} 
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.signInButtonText}>
                {isLoading ? t('common.updating') : t('login.signIn')}
              </Text>
            </TouchableOpacity>

            {/* Create Account with underline */}
            <TouchableOpacity
              onPress={() => navigation.navigate('SignUp')}
              style={styles.createAccountContainer}
            >
              <Text style={styles.createAccountText}>{t('login.createAccount')}</Text>
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
    paddingTop: 100,
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
    marginBottom: 40,
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 40,
    marginTop: 10,
  },
  forgotPasswordText: {
    fontSize: FontSizes.large,
    fontWeight: '500',
    color: Colors.black,
  },
  signInButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.signInBlue,
    borderRadius: BorderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: Colors.white,
  },
  createAccountContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  createAccountText: {
    fontSize: FontSizes.medium,
    fontWeight: '500',
    color: Colors.black,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
