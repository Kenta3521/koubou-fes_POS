import { io } from 'socket.io-client';

// Use environment variable or default to localhost:3001
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

// Create a single socket instance
export const socket = io(SOCKET_URL, {
    withCredentials: true,
    autoConnect: false, // Connect manually when needed
});
