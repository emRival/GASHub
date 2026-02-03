import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, CheckCircle, Clock, Link2, ArrowRight, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { formatDateTime } from '@/lib/utils';
import { useRealtimeLogs } from '@/hooks/useRealtimeLogs';
import { useEffect } from 'react';

export const Route = createFileRoute('/_authenticated/dashboard/')({
    component: DashboardOverview,
});

function DashboardOverview() {
    const queryClient = useQueryClient();
    const { latestLog, isConnected } = useRealtimeLogs();

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['analytics', 'summary'],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/summary`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to fetch analytics');
            return res.json();
        },
        staleTime: 60000, // Cache for 1 minute
        refetchOnWindowFocus: false // Rely on Realtime updates
    });

    const { data: timeline, isLoading: timelineLoading } = useQuery({
        queryKey: ['analytics', 'timeline'],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/analytics/timeline?days=7`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to fetch timeline');
            return res.json();
        },
        staleTime: 300000, // Cache for 5 minutes
        refetchOnWindowFocus: false
    });

    // Fetch Recent Logs (Limit 5)
    const { data: recentLogs, isLoading: logsLoading } = useQuery({
        queryKey: ['logs', 'recent'],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logs?page=1&limit=5`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to fetch recent logs');
            return res.json();
        },
        staleTime: 10000, // Cache for 10 seconds
        refetchOnWindowFocus: false,
    });

    // Handle real-time log updates
    useEffect(() => {
        if (latestLog) {
            // Invalidate queries to refresh data from server
            queryClient.invalidateQueries({ queryKey: ['analytics', 'summary'] });
            queryClient.invalidateQueries({ queryKey: ['logs', 'recent'] });
            queryClient.invalidateQueries({ queryKey: ['analytics', 'timeline'] });
        }
    }, [latestLog, queryClient]);



    const timelineData = timeline?.data || [];
    const logs = recentLogs?.data || [];

    // Use server stats directly (no optimistic updates to avoid double-counting)
    const displayStats = stats?.data;

    const metrics = [
        {
            title: 'Total Requests Today',
            value: displayStats?.totalRequestsToday || 0,
            icon: Activity,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 border-blue-100',
            description: 'Requests processed in last 24h'
        },
        {
            title: 'Success Rate',
            value: `${displayStats?.successRate || 0}%`,
            icon: CheckCircle,
            color: 'text-green-600',
            bgColor: 'bg-green-50 border-green-100',
            description: 'Successful responses (2xx)'
        },
        {
            title: 'Avg Response Time',
            value: `${displayStats?.averageResponseTime || 0}ms`,
            icon: Clock,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50 border-orange-100',
            description: 'Average latency today'
        },
        {
            title: 'Active Endpoints',
            value: displayStats?.totalEndpoints || 0,
            icon: Link2,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50 border-purple-100',
            description: 'Total managed endpoints'
        },
    ];

    return (
        <div className="space-y-8">
            {/* Real-time Connection Indicator */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">
                        Monitor your API performance in real-time
                    </p>
                </div>
                <Badge variant={isConnected ? "default" : "secondary"} className="gap-1.5">
                    {isConnected ? (
                        <>
                            <Wifi className="h-3 w-3" />
                            Live
                        </>
                    ) : (
                        <>
                            <WifiOff className="h-3 w-3" />
                            Offline
                        </>
                    )}
                </Badge>
            </div>


            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    metrics.map((metric) => (
                        <Card key={metric.title} className="hover:shadow-md transition-shadow duration-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {metric.title}
                                </CardTitle>
                                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", metric.bgColor)}>
                                    <metric.icon className={cn("h-5 w-5", metric.color)} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold tracking-tight">{metric.value}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {metric.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Request Volume</CardTitle>
                        <CardDescription>Daily traffic over last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full min-w-0">
                            {timelineLoading ? (
                                <Skeleton className="w-full h-full rounded-lg" />
                            ) : timelineData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={timelineData}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="date"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${value}`}
                                        />
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/40" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                padding: '12px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                                color: '#1f2937'
                                            }}
                                            labelStyle={{
                                                color: '#1f2937',
                                                fontWeight: 600,
                                                marginBottom: '4px'
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorTotal)"
                                            name="Requests"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                    Not enough data to display chart
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Success vs Error</CardTitle>
                        <CardDescription>Status distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full min-w-0">
                            {timelineLoading ? (
                                <Skeleton className="w-full h-full rounded-lg" />
                            ) : timelineData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={timelineData} barGap={4}>
                                        <XAxis
                                            dataKey="date"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                padding: '12px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                                color: '#1f2937'
                                            }}
                                            labelStyle={{
                                                color: '#1f2937',
                                                fontWeight: 600,
                                                marginBottom: '4px'
                                            }}
                                        />
                                        <Bar dataKey="success" fill="#22c55e" radius={[4, 4, 0, 0]} name="Success" />
                                        <Bar dataKey="error" fill="#ef4444" radius={[4, 4, 0, 0]} name="Error" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                    No traffic data
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity Table */}
            <Card className="col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
                        <CardDescription>Latest requests processed by the bridge</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link to="/dashboard/logs">
                            View All <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Endpoint</TableHead>
                                <TableHead className="text-right">Duration</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logsLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No recent activity
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log: any) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDateTime(log.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            <MethodBadge method={log.request_method} />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={log.response_status} />
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-sm">/{log.endpoints?.alias}</span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                                            {log.response_time_ms}ms
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function MethodBadge({ method }: { method: string }) {
    const m = method?.toUpperCase() || 'UNKNOWN';
    const colors: Record<string, string> = {
        GET: 'bg-blue-50 text-blue-700 border-blue-200',
        POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        PUT: 'bg-orange-50 text-orange-700 border-orange-200',
        DELETE: 'bg-red-50 text-red-700 border-red-200',
        PATCH: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return (
        <Badge variant="outline" className={`${colors[m] || 'bg-gray-100 text-gray-700'} font-mono border text-[10px] px-2`}>
            {m}
        </Badge>
    );
}

function StatusBadge({ status }: { status: number }) {
    if (status >= 200 && status < 300) {
        return <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-200">Success</span>;
    }
    if (status >= 400 && status < 500) {
        return <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">Error ({status})</span>;
    }
    return <span className="inline-flex items-center text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-200">Fail ({status})</span>;
}
