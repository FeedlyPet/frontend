import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function useSocket() {
    function connect(token: string) {
        if (socket) return
        socket = io(import.meta.env.VITE_API_URL ?? 'http://localhost:3000', {
            auth: { token },
            transports: ['websocket'],
        })
    }

    function disconnect() {
        socket?.disconnect()
        socket = null
    }

    function on(event: string, cb: (...args: any[]) => void) {
        socket?.on(event, cb)
    }

    function off(event: string, cb: (...args: any[]) => void) {
        socket?.off(event, cb)
    }

    return {
        connect,
        disconnect,
        on,
        off,
        get connected() {
            return socket?.connected ?? false
        },
    }
}
