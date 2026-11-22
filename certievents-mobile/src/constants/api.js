// URL base da API do backend utilizada pelo aplicativo mobile
const rawUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';
export const API_BASE_URL = rawUrl.replace(/\/$/, '');

