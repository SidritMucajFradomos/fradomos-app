export const CENTRAL_API_URL = 'http://api.fradomos.al:3000';
export const MINISERVER_API_URL = 'http://192.168.1.134:3000';
export const API_URL = MINISERVER_API_URL;

// Backward-compat: previously used by auto-detection logic.
// Now a no-op that resolves to the central API URL.
export const ensureApiUrl = async (): Promise<string> => API_URL;
