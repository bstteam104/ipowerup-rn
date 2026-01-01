/**
 * Safely parses JSON response from fetch API
 * Handles cases where server returns HTML error pages instead of JSON
 * @param {Response} response - The fetch response object
 * @returns {Promise<Object>} Parsed JSON data or error object
 */
export const safeJsonParse = async (response) => {
  try {
    // First check if response is ok
    if (!response.ok) {
      // Try to get text to see what we're dealing with
      const text = await response.text();
      
      // If it looks like HTML, return a proper error
      if (text.trim().startsWith('<')) {
        return {
          error: true,
          message: `Server error: ${response.status} ${response.statusText}`,
          status: response.status,
        };
      }
      
      // Try to parse as JSON if it's not HTML
      try {
        const jsonData = JSON.parse(text);
        return jsonData;
      } catch (parseError) {
        return {
          error: true,
          message: `Server error: ${response.status} ${response.statusText}`,
          status: response.status,
        };
      }
    }

    // Check content-type header to ensure it's JSON
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      const text = await response.text();
      // If it's HTML, return error
      if (text.trim().startsWith('<')) {
        return {
          error: true,
          message: 'Server returned HTML instead of JSON. Please check the API endpoint.',
          status: response.status,
        };
      }
      // Otherwise try to parse anyway (might be text/json)
      try {
        return JSON.parse(text);
      } catch (e) {
        return {
          error: true,
          message: 'Invalid response format from server',
          status: response.status,
        };
      }
    }

    // Safe JSON parsing
    const text = await response.text();
    
    // Check if response is empty
    if (!text || text.trim() === '') {
      return {
        error: false,
        data: null,
      };
    }

    // Check if it's HTML before parsing
    if (text.trim().startsWith('<')) {
      return {
        error: true,
        message: 'Server returned HTML instead of JSON. Please check the API endpoint.',
        status: response.status,
      };
    }

    // Parse JSON
    try {
      return JSON.parse(text);
    } catch (parseError) {
      return {
        error: true,
        message: `JSON Parse error: ${parseError.message}`,
        status: response.status,
      };
    }
  } catch (error) {
    return {
      error: true,
      message: error.message || 'Failed to parse response',
      status: response.status,
    };
  }
};

/**
 * Safe fetch wrapper that handles JSON parsing errors
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data or error object
 */
export const safeFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    return await safeJsonParse(response);
  } catch (error) {
    return {
      error: true,
      message: error.message || 'Network request failed',
      networkError: true,
    };
  }
};

