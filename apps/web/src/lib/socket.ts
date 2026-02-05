import { io } from 'socket.io-client';

// Use environment variable or default to localhost:3001
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create a single socket instance
export const socket = io(SOCKET_URL, {
    withCredentials: true,
    autoConnect: false, // Connect manually when needed
});
