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
import {Colors, Constants, BorderRadius, FontSizes} from '../constants/Constants';

const {width, height} = Dimensions.get('window');

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
            <Text style={styles.headerTitle}>Reset Password</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Form Fields */}
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
                  placeholderTextColor={Colors.black} //  placeholderColor: black
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
                  <Image
                    source={showCurrentPassword 
                      ? require('../../assets/icons/eye-open.png')
                      : require('../../assets/icons/eye-close.png')}
                    style={styles.eyeIcon}
                    resizeMode="contain"
                  />
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
                  placeholderTextColor={Colors.black} //  placeholderColor: black
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
                  <Image
                    source={showNewPassword 
                      ? require('../../assets/icons/eye-open.png')
                      : require('../../assets/icons/eye-close.png')}
                    style={styles.eyeIcon}
                    resizeMode="contain"
                  />
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
                  placeholderTextColor={Colors.black} //  placeholderColor: black
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
                  <Image
                    source={showConfirmPassword 
                      ? require('../../assets/icons/eye-open.png')
                      : require('../../assets/icons/eye-close.png')}
                    style={styles.eyeIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Password Requirements Text */}
            <Text style={styles.requirementsText}>
              Your new password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., @, #, $, %).
            </Text>

            {/* Submit Button - Yellow,/PDF */}
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
    paddingTop: 30,
  },
  inputContainer: {
    marginBottom: 23, // 
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56, // 
    borderWidth: 0.8, // 
    borderColor: '#E0E0E0', // Light gray border
    borderRadius: 10, // 
    backgroundColor: Colors.white,
    paddingLeft: 20, // 
    paddingRight: 15,
  },
  inputIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
    tintColor: Colors.black, // 
  },
  input: {
    flex: 1,
    fontSize: 15, // 
    color: Colors.black,
    paddingVertical: 0,
  },
  eyeIconContainer: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    width: 20,
    height: 20,
    tintColor: Colors.grayColor, // Light gray 
  },
  requirementsText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.cyanBlue, // 
    lineHeight: 22,
    marginTop: 50, // 
    marginBottom: 20,
  },
  submitButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.progressYellow, // Yellow/PDF
    borderRadius: 12, // 
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black, // Black text on yellow/PDF
  },
});

export default ResetPasswordScreen;









