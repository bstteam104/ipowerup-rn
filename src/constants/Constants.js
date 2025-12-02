// Constants matching iOS implementation exactly

export const Constants = {
  deviceOS: "Android",
  deviceBrand: "Android",
  deviceToken: "Abc12345",
  UDID: "1234",
  platform: "android",
  
  imageMimeType: "image/*",
  imageFileType: ".jpg",
  
  // Base URL
  baseURLDev: "https://demo-cmolds1.com/projects/ipowerup_be_2024/public/api",
};

// Colors matching iOS CustomColorStrings exactly
export const Colors = {
  // Primary colors from iOS
  blueColor: "#0075FF",
  cyanBlue: "#0097D9", // iOS button border color
  grayColor: "#999B9F",
  lightBlackColor: "#1D2733",
  lightGray: "#00000012",
  white: "#FFFFFF",
  black: "#000000",
  
  // Splash screen colors
  splashBlue: "#57AEE3",
  splashLightBlue: "#7AC5EA",
  progressYellow: "#FFCC00",
  
  // Sign In button color (iOS: rgb(66, 150, 211))
  signInBlue: "#4296D3",
  
  // Text colors
  placeholderColor: "#AAAAAA",
  
  // Border colors
  inputBorderColor: "#999B9F",
  
  // Tab bar
  tabBarBackground: "#FFFFFF",
  tabBarShadow: "#000000",
  tabBarActiveColor: "#0097D9",
  tabBarInactiveColor: "#999B9F",
  
  // Home screen colors
  greetingBlue: "#0097D9",
  
  // Temperature colors
  tempGreen: "#4CAF50",
  tempYellow: "#FFC107",
  tempOrange: "#FF9800",
  tempRed: "#F44336",
  
  // Card shadow
  cardShadowColor: "#000000",
};

// Font sizes matching iOS
export const FontSizes = {
  small: 12,
  medium: 14,
  regular: 15,
  large: 16,
  title: 24,
  heading: 20,
};

// Border radius matching iOS
export const BorderRadius = {
  small: 4,
  medium: 10,
  large: 12,
  xlarge: 20,
};

// Validation strings matching iOS
export const ValidationStrings = {
  invalidPassword: "Password must include:",
  invalidEmail: "Invalid email",
  passwordNotMatch: "Password and confirm password do not match",
  emptyFields: "Please fill all fields",
  fullName: "Please enter your full name",
  email: "Please enter your email",
  checkEmail: "Please check your email",
  phoneNumber: "Please enter your phone number",
  password: "Please enter your password",
  confirmPassword: "Please enter confirm password",
  terms: "Please accept the terms and conditions",
};

// API Endpoints
export const APIEndpoints = {
  login: "/login",
  register: "/register",
  logout: "/logout",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  getUserProfile: "/user-profile",
  updateNotificationStatus: "/update-notification-status",
};

// Helper function to convert hex to RGB
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Helper function to create rgba color
export const rgba = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (rgb) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }
  return hex;
};
