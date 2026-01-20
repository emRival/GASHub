import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Laptop, Phone, Smartphone, Globe, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { listSessions, revokeSession, useSession } from '@/lib/auth-client';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Session {
    id: string; // This might be the session token ID or database ID
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    token: string; // The session token
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    isCurrent?: boolean; // Often provided by auth client
}

export function SessionsCard() {
    const { toast } = useToast();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const { data: sessionData } = useSession();
    const currentToken = sessionData?.session?.token;

    const fetchSessions = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await listSessions();
            if (error) throw error;

            // Map sessions and determine current
            const mappedSessions = (data as unknown as Session[]).map(s => ({
                ...s,
                isCurrent: s.token === currentToken
            }));

            setSessions(mappedSessions);
        } catch (error: any) {
            console.error("Failed to fetch sessions", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentToken) {
            fetchSessions();
        }
    }, [currentToken]);

    const handleRevoke = async (sessionId: string) => {
        setRevokingId(sessionId);
        try {
            // Check if we have a token (usually session.token is what's needed)
            const tokenToRevoke = sessionId;

            const { error } = await revokeSession({ token: tokenToRevoke });

            if (error) throw error;

            toast({
                title: "Session revoked",
                description: "The device has been signed out.",
            });

            // Refresh list
            fetchSessions();

        } catch (error: any) {
            toast({
                title: "Failed to revoke session",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setRevokingId(null);
        }
    };

    const getDeviceIcon = (userAgent: string | null | undefined) => {
        if (!userAgent) return <Globe className="w-5 h-5 text-gray-500" />;
        const lowerUA = userAgent.toLowerCase();
        if (lowerUA.includes('mobile') || lowerUA.includes('android') || lowerUA.includes('iphone')) {
            return <Smartphone className="w-5 h-5 text-purple-500" />;
        }
        return <Laptop className="w-5 h-5 text-blue-500" />;
    };

    const parseDeviceName = (userAgent: string | null | undefined) => {
        if (!userAgent) return 'Unknown Device';
        // Simple heuristic parsing
        if (userAgent.includes('Macintosh')) return 'Mac OS';
        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('iPhone')) return 'iPhone';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('Linux')) return 'Linux';
        return 'Unknown Device';
    };

    const parseBrowser = (userAgent: string | null | undefined) => {
        if (!userAgent) return '';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Browser';
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Laptop className="w-5 h-5" />
                    Sessions
                </CardTitle>
                <CardDescription>
                    Manage your active sessions and devices.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {isLoading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center p-6 text-gray-500 bg-gray-50 rounded-lg">
                            No active sessions found (This is unusual if you are logged in).
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sessions.map((session) => {
                                const isCurrent = session.isCurrent; // Adjust based on actual API payload
                                // Usually better-auth listSessions returns detailed info

                                return (
                                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 bg-white rounded-md shadow-sm border border-gray-100">
                                                {getDeviceIcon(session.userAgent)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium text-gray-900">
                                                        {parseDeviceName(session.userAgent)}
                                                    </h3>
                                                    {isCurrent && (
                                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                                            Current
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {parseBrowser(session.userAgent)} • {session.ipAddress || 'Unknown IP'}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Active {formatDistanceToNow(new Date(session.updatedAt || session.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>

                                        {!isCurrent && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleRevoke(session.token)}
                                                disabled={revokingId === (session.id || session.token)}
                                            >
                                                {revokingId === (session.id || session.token) ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                <span className="sr-only sm:not-sr-only sm:ml-2">Revoke</span>
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={fetchSessions} disabled={isLoading}>
                            <RefreshCw className={`w-3 h-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh List
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
