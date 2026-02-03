import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

interface LogEvent {
    id: string;
    endpoint_id: string;
    request_method: string;
    response_status: number;
    response_time_ms: number;
    created_at: string;
    [key: string]: any;
}

export function useRealtimeLogs() {
    const [latestLog, setLatestLog] = useState<LogEvent | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        setIsConnected(true);
        console.log('✅ Subscribing to Supabase Realtime: logs');

        const channel = supabase
            .channel('realtime-logs')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'logs'
                },
                (payload: any) => {
                    console.log('📊 New log received (Realtime):', payload.new);
                    setLatestLog(payload.new as LogEvent);
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                } else if (status === 'CHANNEL_ERROR') {
                    setIsConnected(false);
                    console.error('❌ Realtime subscription error');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return { latestLog, isConnected };
}
