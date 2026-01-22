import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import PinInput from '../components/PinInput';
import {useTranslation} from 'react-i18next';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';
import {verifyOTPAPI, forgotPasswordAPI} from '../services/AuthService';
import {showSuccessToast, showErrorToast} from '../utils/toastHelper';

const {width, height} = Dimensions.get('window');

const OtpScreen = ({navigation, route}) => {
  const {t} = useTranslation();
  const emailText = route?.params?.email || '';
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const showAlert = (title, message) => {
    Alert.alert(title, message, [{text: 'OK', style: 'default'}]);
  };

  const handlePinComplete = (pinValue) => {
    setPin(pinValue);
  };

  const handlePinChange = (pinValue) => {
    setPin(pinValue);
  };

  const handleResendOtp = async () => {
    if (!emailText) {
      showAlert(t('common.error'), t('validation.enterEmail', 'Please enter your email address.'));
      return;
    }

    try {
      const result = await forgotPasswordAPI(emailText);
      if (result.success) {
        showSuccessToast(t('forgotPassword.otpSent', 'OTP sent to your email.'));
      } else {
        const errorMessage = result.error?.message || t('common.somethingWentWrong', 'Something went wrong. Please try again.');
        showErrorToast(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || t('common.somethingWentWrong', 'Something went wrong. Please try again.');
      showErrorToast(errorMessage);
    }
  };

  const handleContinue = async () => {
    if (pin.length !== 4) {
      showAlert(t('common.error'), t('otp.invalid', 'Invalid OTP'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyOTPAPI(emailText, pin);

      if (result.success) {
        // Navigate to RecreatePassword screen
        navigation.navigate('RecreatePassword', {email: emailText});
      } else {
        // Show error message from backend
        const errorMessage = result.error?.message || t('otp.invalid', 'Invalid OTP');
        showErrorToast(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || t('common.somethingWentWrong', 'Something went wrong. Please try again.');
      showErrorToast(errorMessage);
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
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Corner View with rounded top corners */}
          <View style={styles.cornerView}>
            {/* Back to Sign In underline */}
            <TouchableOpacity
              onPress={() => navigation.replace('Login')}
              style={styles.backSignInContainer}
            >
              <Text style={styles.backSignInText}>{t('forgotPassword.backToSignIn')}</Text>
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>{t('otp.title')}</Text>
            <Text style={styles.subtitle}>
              {t('otp.subtitle')}
              {'\n'}
              {emailText || t('otp.yourEmail', 'your email')}
            </Text>

            {/* PIN Input SVPinView */}
            <View style={styles.pinContainer}>
              <PinInput
                pinLength={4}
                onComplete={handlePinComplete}
                onPinChange={handlePinChange}
              />
            </View>

            {/* Resend OTP */}
            <TouchableOpacity
              onPress={handleResendOtp}
              style={styles.resendContainer}
            >
              <Text style={styles.resendText}>{t('otp.resend')}</Text>
            </TouchableOpacity>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>
                {isLoading ? t('common.verifying', 'Verifying...') : t('common.continue')}
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
  },
  cornerView: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 40,
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  backSignInContainer: {
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  backSignInText: {
    fontSize: FontSizes.medium,
    fontWeight: '500',
    color: Colors.black,
    textDecorationLine: 'underline',
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
  pinContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  resendContainer: {
    alignSelf: 'center',
    marginBottom: 40,
  },
  resendText: {
    fontSize: FontSizes.medium,
    fontWeight: '500',
    color: Colors.black,
  },
  continueButton: {
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
  continueButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: Colors.white,
  },
});

export default OtpScreen;



















