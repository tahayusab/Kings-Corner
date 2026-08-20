import { io } from 'socket.io-client';

// Automatically connect to the configured server URL, or fallback to the same IP address
const SERVER_URL = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3001`; 

export const socket = io(SERVER_URL, {
  autoConnect: true,
});
