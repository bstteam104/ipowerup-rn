/**
 * Authentication Service
 * Production-ready authentication service
 */

import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import {Constants} from '../constants/Constants';
import {safeJsonParse} from '../utils/apiHelper';

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  LOGGED_IN_USER: 'loggedInUser',
  IS_USER_LOGGED_IN: 'isUserLoggedIn',
};

/**
 * Get device information for API calls
 */
const getDeviceInfo = async () => {
  try {
    const udid = await DeviceInfo.getUniqueId();
    const deviceBrand = DeviceInfo.getBrand();
    const deviceOS = Platform.OS === 'ios' ? 'ios' : 'android';
    
    return {
      udid: udid || Constants.UDID,
      device_type: deviceOS,
      device_token: Constants.deviceToken, // Can be updated with push notification token later
      device_brand: deviceBrand || Constants.deviceBrand,
      device_os: deviceOS,
      app_version: DeviceInfo.getVersion() || '0.1',
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    // Return default values if device info fails
    return {
      udid: Constants.UDID,
      device_type: Constants.platform,
      device_token: Constants.deviceToken,
      device_brand: Constants.deviceBrand,
      device_os: Constants.platform,
      app_version: '0.1',
    };
  }
};

/**
 * Create FormData from object (for multipart form data)
 */
const createFormData = (params) => {
  const formData = new FormData();
  
  Object.keys(params).forEach((key) => {
    const value = params[key];
    // Check if value is a file/blob/data object
    if (value && typeof value === 'object' && value.uri) {
      // File object with uri
      formData.append(key, {
        uri: value.uri,
        type: value.type || Constants.imageMimeType,
        name: value.name || `${key}${Constants.imageFileType}`,
      });
    } else {
      // Regular string/number value
      formData.append(key, String(value));
    }
  });
  
  return formData;
};

/**
 * Login API
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, user?: object, error?: object}>}
 */
export const loginAPI = async (email, password) => {
  try {
    const deviceInfo = await getDeviceInfo();
    
    const params = {
      email: email,
      password: password,
      ...deviceInfo,
    };

    const formData = createFormData(params);

    // Note: Don't set Content-Type for FormData - React Native sets it automatically with boundary
    const response = await fetch(`${Constants.baseURLDev}/login`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
    });

    // Get raw response text
    const rawText = await response.text();

    // Parse JSON directly from raw text
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      return {
        success: false,
        error: {
          code: response.status || 500,
          message: 'Invalid JSON response from server',
        },
      };
    }

    // Check for error response first (backend returns {error: {...}} for errors)
    if (data.error) {
      // Extract error message from various possible structures
      let errorMessage = 'Something went wrong';
      
      if (data.error.messages) {
        // Try common message keys first
        if (data.error.messages.msg && Array.isArray(data.error.messages.msg) && data.error.messages.msg[0]) {
          errorMessage = data.error.messages.msg[0];
        } else if (data.error.messages.email && Array.isArray(data.error.messages.email) && data.error.messages.email[0]) {
          errorMessage = data.error.messages.email[0];
        } else if (data.error.messages.password && Array.isArray(data.error.messages.password) && data.error.messages.password[0]) {
          errorMessage = data.error.messages.password[0];
        } else if (data.error.messages.messages && Array.isArray(data.error.messages.messages) && data.error.messages.messages[0]) {
          errorMessage = data.error.messages.messages[0];
        } else {
          // If none of the above, iterate through all keys in messages object
          const messages = data.error.messages;
          for (const key in messages) {
            if (Array.isArray(messages[key]) && messages[key].length > 0) {
              errorMessage = messages[key][0];
              break; // Take the first message found
            }
          }
        }
      } else if (data.error.message) {
        errorMessage = data.error.message;
      }
      
      return {
        success: false,
        error: {
          code: data.error?.code || response.status,
          message: errorMessage,
        },
      };
    }

    // Check for success response (backend returns {response: {data: [User]}} for success)
    if (data.response && data.response.data && data.response.data.length > 0) {
      const user = data.response.data[0];
      
      // Save user data and token
      await AsyncStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, user.token || '');
      await AsyncStorage.setItem(STORAGE_KEYS.IS_USER_LOGGED_IN, 'true');
      
      return {
        success: true,
        user: user,
      };
    }

    // If no error and no success data, return error
    return {
      success: false,
      error: {
        code: response.status || 500,
        message: 'Invalid response format',
      },
    };
  } catch (error) {
    console.error('Login API error:', error);
    return {
      success: false,
      error: {
        code: 500,
        message: error.message || 'Network request failed',
        networkError: true,
      },
    };
  }
};

/**
 * Register/Signup API
 * @param {object} userData - {firstName, lastName, email, password, country, termsAccepted, privacyAccepted}
 * @returns {Promise<{success: boolean, user?: object, error?: object}>}
 */
export const registerAPI = async (userData) => {
  try {
    const deviceInfo = await getDeviceInfo();
    
    const params = {
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email,
      country: userData.country || 'USA',
      password: userData.password,
      password_confirmation: userData.password,
      terms_conditions: userData.termsAccepted ? '1' : '0',
      privacy_policy: userData.privacyAccepted ? '1' : '0',
      ...deviceInfo,
    };

    const formData = createFormData(params);

    // Note: Don't set Content-Type for FormData - React Native sets it automatically with boundary
    const response = await fetch(`${Constants.baseURLDev}/register`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
    });

    const data = await safeJsonParse(response);

    if (data.error) {
      const errorMessage = 
        data.error?.messages?.msg?.[0] || 
        data.error?.messages?.email?.[0] || 
        data.error?.messages?.messages?.[0] ||
        'Something went wrong';
      
      return {
        success: false,
        error: {
          code: data.error?.code || response.status,
          message: errorMessage,
        },
      };
    }

    if (data.response && data.response.data && data.response.data.length > 0) {
      const user = data.response.data[0];
      
      // Save user data and token
      await AsyncStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, user.token || '');
      await AsyncStorage.setItem(STORAGE_KEYS.IS_USER_LOGGED_IN, 'true');
      
      return {
        success: true,
        user: user,
      };
    }

    return {
      success: false,
      error: {
        code: 500,
        message: 'Invalid response format',
      },
    };
  } catch (error) {
    console.error('Register API error:', error);
    return {
      success: false,
      error: {
        code: 500,
        message: error.message || 'Network request failed',
        networkError: true,
      },
    };
  }
};

/**
 * Forgot Password - Request OTP code
 * @param {string} email
 * @returns {Promise<{success: boolean, error?: object}>}
 */
export const forgotPasswordAPI = async (email) => {
  try {
    const params = {
      email: email,
    };

    const response = await fetch(`${Constants.baseURLDev}/request-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await safeJsonParse(response);

    if (data.error) {
      const errorMessage = 
        data.error?.messages?.msg?.[0] || 
        data.error?.messages?.email?.[0] || 
        data.error?.messages?.messages?.[0] ||
        'Something went wrong';
      
      return {
        success: false,
        error: {
          code: data.error?.code || response.status,
          message: errorMessage,
        },
      };
    }

    // Check for success response
    if (data.response || response.ok) {
      return {
        success: true,
      };
    }

    return {
      success: false,
      error: {
        code: 500,
        message: 'Invalid response format',
      },
    };
  } catch (error) {
    console.error('Forgot Password API error:', error);
    return {
      success: false,
      error: {
        code: 500,
        message: error.message || 'Network request failed',
        networkError: true,
      },
    };
  }
};

/**
 * Verify OTP code
 * @param {string} email
 * @param {string} code - 4 digit OTP
 * @returns {Promise<{success: boolean, error?: object}>}
 */
export const verifyOTPAPI = async (email, code) => {
  try {
    const params = {
      email: email,
      code: code,
    };

    const response = await fetch(`${Constants.baseURLDev}/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await safeJsonParse(response);

    if (data.error) {
      const errorMessage = 
        data.error?.messages?.msg?.[0] || 
        data.error?.messages?.email?.[0] || 
        data.error?.messages?.messages?.[0] ||
        'Invalid OTP';
      
      return {
        success: false,
        error: {
          code: data.error?.code || response.status,
          message: errorMessage,
        },
      };
    }

    // Check for success response
    if (data.response || response.ok) {
      return {
        success: true,
      };
    }

    return {
      success: false,
      error: {
        code: 500,
        message: 'Invalid response format',
      },
    };
  } catch (error) {
    console.error('Verify OTP API error:', error);
    return {
      success: false,
      error: {
        code: 500,
        message: error.message || 'Network request failed',
        networkError: true,
      },
    };
  }
};

/**
 * Reset Password - Set new password after OTP verification
 * @param {string} email
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {Promise<{success: boolean, error?: object}>}
 */
export const resetPasswordAPI = async (email, password, confirmPassword) => {
  try {
    const params = {
      email: email,
      password: password,
      confirm_password: confirmPassword,
    };

    const response = await fetch(`${Constants.baseURLDev}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await safeJsonParse(response);

    if (data.error) {
      const errorMessage = 
        data.error?.messages?.msg?.[0] || 
        data.error?.messages?.email?.[0] || 
        data.error?.messages?.messages?.[0] ||
        'Something went wrong';
      
      return {
        success: false,
        error: {
          code: data.error?.code || response.status,
          message: errorMessage,
        },
      };
    }

    // Check for success response
    if (data.response || response.ok) {
      return {
        success: true,
      };
    }

    return {
      success: false,
      error: {
        code: 500,
        message: 'Invalid response format',
      },
    };
  } catch (error) {
    console.error('Reset Password API error:', error);
    return {
      success: false,
      error: {
        code: 500,
        message: error.message || 'Network request failed',
        networkError: true,
      },
    };
  }
};

/**
 * Get stored access token
 */
export const getAccessToken = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

/**
 * Get stored logged in user
 */
export const getLoggedInUser = async () => {
  try {
    const userStr = await AsyncStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting logged in user:', error);
    return null;
  }
};

/**
 * Check if user is logged in
 */
export const isUserLoggedIn = async () => {
  try {
    const isLoggedIn = await AsyncStorage.getItem(STORAGE_KEYS.IS_USER_LOGGED_IN);
    return isLoggedIn === 'true';
  } catch (error) {
    console.error('Error checking login status:', error);
    return false;
  }
};

/**
 * Update Account/Profile API
 * @param {object} userData - {firstName, lastName, email, alternateEmail, phone, emergencyNumber, country}
 * @returns {Promise<{success: boolean, user?: object, error?: object}>}
 */
export const updateAccountAPI = async (userData) => {
  try {
    const token = await getAccessToken();
    if (!token) {
      return {
        success: false,
        error: {
          code: 401,
          message: 'Not authenticated',
        },
      };
    }

    const params = {
      first_name: userData.firstName || '',
      last_name: userData.lastName || '',
      email: userData.email || '',
      alternate_email: userData.alternateEmail || '',
      phone: userData.phone || '',
      emergency_number: userData.emergencyNumber || '',
      country: userData.country || 'USA',
      _method: 'patch',
    };

    const formData = createFormData(params);

    const response = await fetch(`${Constants.baseURLDev}/user/update-profile`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await safeJsonParse(response);

    if (data.error) {
      const errorMessage = 
        data.error?.messages?.msg?.[0] || 
        data.error?.messages?.email?.[0] || 
        data.error?.messages?.messages?.[0] ||
        'Something went wrong';
      
      return {
        success: false,
        error: {
          code: data.error?.code || response.status,
          message: errorMessage,
        },
      };
    }

    if (data.response && data.response.data && data.response.data.length > 0) {
      const user = data.response.data[0];
      user.token = token;
      
      await AsyncStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(user));
      
      return {
        success: true,
        user: user,
      };
    }

    return {
      success: false,
      error: {
        code: 500,
        message: 'Invalid response format',
      },
    };
  } catch (error) {
    console.error('Update Account API error:', error);
    return {
      success: false,
      error: {
        code: 500,
        message: error.message || 'Network request failed',
        networkError: true,
      },
    };
  }
};

/**
 * Logout - Clear stored data
 */
export const logout = async () => {
  try {
    const token = await getAccessToken();
    
    // Call logout API if token exists
    if (token) {
      try {
        const deviceInfo = await getDeviceInfo();
        const params = {
          ...deviceInfo,
        };
        const formData = createFormData(params);

        // Note: Don't set Content-Type for FormData - React Native sets it automatically with boundary
        await fetch(`${Constants.baseURLDev}/user/logout`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
      } catch (error) {
        console.error('Logout API error (continuing to clear local data):', error);
      }
    }
    
    // Clear local storage
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.LOGGED_IN_USER,
      STORAGE_KEYS.IS_USER_LOGGED_IN,
    ]);
    
    return {success: true};
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
