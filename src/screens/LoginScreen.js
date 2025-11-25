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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Colors, Constants} from '../constants/Constants';

const LoginScreen = ({navigation}) => {
  const [email, setEmail] = useState(__DEV__ ? 'noumanguljunejo@gmail.com' : '');
  const [password, setPassword] = useState(__DEV__ ? 'Nomi@ngj0000' : '');
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (email) => {
    const emailRegex = /[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}/;
    return emailRegex.test(email);
  };

  const isValidPassword = (password) => {
    // Minimum 8 characters, at least one letter, one number, and one special character
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
    return passwordRegex.test(password);
  };

  const handleSignIn = async () => {
    if (!email || email.trim() === '') {
      alert('Please enter your email address.');
      return;
    }

    if (!password || password.trim() === '') {
      alert('Please enter your password.');
      return;
    }

    if (!isValidEmail(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    if (!isValidPassword(password)) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    // TODO: Implement API call
    // For now, just navigate to TabBar
    try {
      // Simulate API call
      // const response = await loginAPI({email, password, ...});
      // await AsyncStorage.setItem('loggedInUser', JSON.stringify(response));
      // await AsyncStorage.setItem('accessToken', response.token);
      // await AsyncStorage.setItem('isUserLoggedIn', 'true');
      
      // Temporary: navigate to TabBar for testing
      navigation.replace('TabBar');
    } catch (error) {
      alert(error.message || 'Something went wrong');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Logo */}
        <Image
          source={require('../../assets/blueLogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Title */}
        <Text style={styles.title}>Log in to your Account</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Or Create a new App account. This is the same account used for
          iPowerUp.com
        </Text>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Email Field */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Image
                source={require('../../assets/email-icon.png')}
                style={styles.inputIcon}
                resizeMode="contain"
              />
              <TextInput
                style={styles.input}
                placeholder="Enter Email Address"
                placeholderTextColor="#AAAAAA"
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
                source={require('../../assets/password-icon.png')}
                style={styles.inputIcon}
                resizeMode="contain"
              />
              <TextInput
                style={styles.input}
                placeholder="Enter Password"
                placeholderTextColor="#AAAAAA"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}>
                <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>

          {/* Create Account */}
          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp')}
            style={styles.createAccountContainer}>
            <Text style={styles.createAccountText}>Create an Account?</Text>
          </TouchableOpacity>

          {/* Connect Button - Hidden by default in iOS */}
          <TouchableOpacity
            style={[styles.connectButton, {display: 'none'}]}
            onPress={() => navigation.navigate('AppBenefits', {routing: 'login'})}>
            <Text style={styles.connectButtonText}>Connect New Device</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.lightBlackColor,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999B9F',
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
    borderColor: '#999B9F',
    borderRadius: 10,
    backgroundColor: Colors.white,
    paddingLeft: 20,
    paddingRight: 20,
  },
  inputIcon: {
    width: 16,
    height: 16,
    marginRight: 20,
    tintColor: '#999B9F',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.lightBlackColor,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 5,
  },
  eyeIconText: {
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 40,
    marginTop: 20,
  },
  forgotPasswordText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.black,
  },
  signInButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#4296D3', // iOS: rgb(66, 150, 211) = 0.2580794394, 0.58793991800000001, 0.82748454810000005
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
  createAccountContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  createAccountText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.black,
    textDecorationLine: 'underline',
  },
  connectButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.blueColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.black,
  },
});

export default LoginScreen;
