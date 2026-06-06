import { io } from 'socket.io-client'
import { API } from './auth'

const API_URL = API.replace('/api', '')

// Senior Engineer Note: Added robust reconnection logic and transport options 
// to ensure the socket stays alive and reconnects instantly on network drops.
const socket = io(API_URL, {
  transports: ['websocket', 'polling'], // Fallback to polling if WS fails
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true
})

// Global logging for debugging realtime bottlenecks
socket.on('connect', () => console.log(`[Socket] Connected: ${socket.id}`))
socket.on('disconnect', (reason) => console.warn(`[Socket] Disconnected: ${reason}`))
socket.on('connect_error', (error) => console.error(`[Socket] Connection Error:`, error))

export default socket
