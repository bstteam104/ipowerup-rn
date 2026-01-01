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
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';
import {safeJsonParse} from '../utils/apiHelper';

const {width, height} = Dimensions.get('window');

const RecreatePasswordScreen = ({navigation, route}) => {
  const email = route?.params?.email || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
    return passwordRegex.test(password);
  };

  const showAlert = (title, message) => {
    Alert.alert(title, message, [{text: 'OK', style: 'default'}]);
  };

  const handleUpdate = async () => {
    if (!newPassword || newPassword.trim() === '' || !confirmPassword || confirmPassword.trim() === '') {
      showAlert('Error', 'Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Error', 'Passwords do not match.');
      return;
    }

    if (!isValidPassword(newPassword)) {
      showAlert('Error', 'Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters.');
      return;
    }

    setIsLoading(true);

    try {
      const params = {
        email: email,
        password: newPassword,
        confirm_password: confirmPassword,
      };

      const response = await fetch(`${Constants.baseURLDev}/forgot-password-set-new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await safeJsonParse(response);

      // Check if there's an error in the response - silently handle
      if (data && data.error) {
        // Silently fail, don't show error
        return;
      }

      if (data && data.success) {
        showAlert('Success', 'Password Reset Successfully');
        // Navigate to Login and reset stack setRootController
        navigation.reset({
          index: 0,
          routes: [{name: 'Login'}],
        });
      } else {
        // Silently fail, don't show error
      }
    } catch (error) {
      // Silently fail, don't show error
      console.error('Error recreating password:', error);
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
          {/* Corner View with rounded top corners */}
          <View style={styles.cornerView}>
            {/* Back to Sign In underline */}
            <TouchableOpacity
              onPress={() => navigation.replace('Login')}
              style={styles.backSignInContainer}
            >
              <Text style={styles.backSignInText}>Back to Sign In</Text>
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password below
            </Text>

            {/* New Password Field CustomPaswordTextField */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Image
                  source={require('../../assets/icons/password-icon.png')}
                  style={styles.inputIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor={Colors.grayColor}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeIconContainer}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                  <Text style={styles.eyeIcon}>
                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Field CustomPaswordTextField */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Image
                  source={require('../../assets/icons/password-icon.png')}
                  style={styles.inputIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={Colors.grayColor}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIconContainer}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                  <Text style={styles.eyeIcon}>
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Update Button */}
            <TouchableOpacity
              style={[styles.updateButton, isLoading && styles.buttonDisabled]}
              onPress={handleUpdate}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.updateButtonText}>
                {isLoading ? 'Updating...' : 'Update Password'}
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
  updateButton: {
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
  updateButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: Colors.white,
  },
});

export default RecreatePasswordScreen;



















