//const API_BASE_URL = 'http://localhost:3000'; 
const API_BASE_URL = 'https://ordinario-backweb.onrender.com'; 

/**
 * 
 * @param {string} endpoint 
 * @returns {string} 
 */
function getApiUrl(endpoint) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
}


const config = {
  API_BASE_URL,
  getApiUrl,
};

export default config; 