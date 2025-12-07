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
} from 'react-native';
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';
import Header from '../components/Header';

const ResetPasswordScreen = ({navigation}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
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

  const handleSubmit = async () => {
    if (!currentPassword || currentPassword.trim() === '') {
      showAlert('Error', 'Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.trim() === '') {
      showAlert('Error', 'Please enter a new password.');
      return;
    }

    if (!confirmPassword || confirmPassword.trim() === '') {
      showAlert('Error', 'Please confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Error', 'New password and confirm password do not match.');
      return;
    }

    if (!isValidPassword(newPassword)) {
      showAlert('Error', 'Password must be at least 8 characters long, contain at least one letter, one number, and one special character.');
      return;
    }

    setIsLoading(true);

    try {
      const params = {
        current_password: currentPassword,
        password: newPassword,
        confirm_password: confirmPassword,
      };

      const response = await fetch(`${Constants.baseURLDev}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (data && data.success) {
        showAlert('Success', data?.messages?.msg?.[0] || 'Password changed successfully');
        navigation.goBack();
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Header
            title="Reset Password"
            onBackPress={() => navigation.goBack()}
          />

          {/* Form Fields - matching iOS */}
          <View style={styles.formContainer}>
            {/* Current Password */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Image
                  source={require('../../assets/icons/password-icon.png')}
                  style={styles.inputIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Current Password"
                  placeholderTextColor={Colors.grayColor}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeIconContainer}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                  <Text style={styles.eyeIcon}>
                    {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
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

            {/* Confirm Password */}
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

            {/* Submit Button - matching iOS */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Submitting...' : 'Submit'}
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
    paddingBottom: 40,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
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
  submitButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.signInBlue,
    borderRadius: BorderRadius.large,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: FontSizes.large,
    fontWeight: 'bold',
    color: Colors.white,
  },
});

export default ResetPasswordScreen;









