import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface LogEvent {
    id: string;
    endpoint_id: string;
    method: string;
    status_code: number;
    response_time: number;
    created_at: string;
    [key: string]: any;
}

export function useRealtimeLogs() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [latestLog, setLatestLog] = useState<LogEvent | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });

        socketInstance.on('connect', () => {
            console.log('✅ WebSocket connected');
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('❌ WebSocket disconnected');
            setIsConnected(false);
        });

        socketInstance.on('newLog', (log: LogEvent) => {
            console.log('📊 New log received:', log);
            setLatestLog(log);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return { socket, latestLog, isConnected };
}
