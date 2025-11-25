// Constants matching iOS implementation for easy copy-paste

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

// Colors matching iOS CustomColorStrings
export const Colors = {
  blueColor: "#0075FF",
  grayColor: "#999B9F",
  lightBlackColor: "#1D2733",
  lightGray: "#00000012",
  white: "#FFFFFF",
  black: "#000000",
};

// Helper function to convert hex to React Native color
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



