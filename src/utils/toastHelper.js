/**
 * Toast Helper - Wrapper for react-native-toast-message
 */
import Toast from 'react-native-toast-message';

/**
 * Show success toast
 * @param {string} message - Message to display
 * @param {number} duration - Duration in ms (default: 4000)
 */
export const showSuccessToast = (message, duration = 4000) => {
  Toast.show({
    type: 'success',
    text1: message,
    position: 'top',
    visibilityTime: duration,
    topOffset: 60, // Space from top
  });
};

/**
 * Show error toast
 * @param {string} message - Message to display
 * @param {number} duration - Duration in ms (default: 4000)
 */
export const showErrorToast = (message, duration = 4000) => {
  Toast.show({
    type: 'error',
    text1: message,
    position: 'top',
    visibilityTime: duration,
    topOffset: 60, // Space from top
  });
};

/**
 * Show info toast
 * @param {string} message - Message to display
 * @param {number} duration - Duration in ms (default: 4000)
 */
export const showInfoToast = (message, duration = 4000) => {
  Toast.show({
    type: 'info',
    text1: message,
    position: 'top',
    visibilityTime: duration,
    topOffset: 60, // Space from top
  });
};

/**
 * Hide toast
 */
export const hideToast = () => {
  Toast.hide();
};
