import axios from 'axios';
import API_URL from './config';

/**
 * HTTP client for the Express API.
 * The session cookie is sent on every request.
 */
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

export default api;
