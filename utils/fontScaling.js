// Font scaling utility functions
export const validateFontSize = (size) => {
  return Math.max(1, size); // Ensures font size is never less than 1
};

// Font sizes that match what's used in the app
export const FontSizes = {
  small: 12,
  regular: 14, 
  medium: 16,
  large: 18,
  heading: 20,
  title: 22,
  jumbo: 24
};
