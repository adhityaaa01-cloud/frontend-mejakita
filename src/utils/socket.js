import { io } from 'socket.io-client'
import { API } from './auth'

const API_URL = API.replace('/api', '')
const socket = io(API_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
})

export default socket
