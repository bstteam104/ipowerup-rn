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
} from 'react-native';
import PinInput from '../components/PinInput';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

const OtpScreen = ({navigation, route}) => {
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

  const handleResendOtp = () => {
    showAlert('Alert', 'OTP sent to your email.');
  };

  const handleContinue = async () => {
    if (pin.length !== 4) {
      showAlert('Error', 'Invalid OTP');
      return;
    }

    setIsLoading(true);

    try {
      const params = {
        email: emailText,
        code: pin,
      };

      const response = await fetch(`${Constants.baseURLDev}/forgot-password-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (data && data.success) {
        navigation.navigate('RecreatePassword', {email: emailText});
      } else {
        const errorMsg = data?.messages?.msg?.[0] || 'Something went wrong';
        showAlert('Error', errorMsg);
      }
    } catch (error) {
      showAlert('Error', error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
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
          {/* Corner View with rounded top corners - matching iOS */}
          <View style={styles.cornerView}>
            {/* Back to Sign In - matching iOS underline */}
            <TouchableOpacity
              onPress={() => navigation.replace('Login')}
              style={styles.backSignInContainer}
            >
              <Text style={styles.backSignInText}>Back to Sign In</Text>
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              We've sent a verification code to{'\n'}
              {emailText || 'your email'}
            </Text>

            {/* PIN Input - matching iOS SVPinView */}
            <View style={styles.pinContainer}>
              <PinInput
                pinLength={4}
                onComplete={handlePinComplete}
                onPinChange={handlePinChange}
              />
            </View>

            {/* Resend OTP - matching iOS */}
            <TouchableOpacity
              onPress={handleResendOtp}
              style={styles.resendContainer}
            >
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>

            {/* Continue Button - matching iOS */}
            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>
                {isLoading ? 'Verifying...' : 'Continue'}
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
    backgroundColor: Colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  cornerView: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 40,
    paddingHorizontal: 30,
    paddingBottom: 40,
    marginTop: height * 0.2,
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









