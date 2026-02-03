import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  Globe,
  Clock,
  Code,
  Copy,
  Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeLogs } from '@/hooks/useRealtimeLogs';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Route = createFileRoute('/_authenticated/dashboard/logs')({
  component: LogsPage,
});

function LogsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const limit = 20;
  const queryClient = useQueryClient();
  const { latestLog, isConnected } = useRealtimeLogs();

  const { data, isLoading } = useQuery({
    queryKey: ['logs', page, statusFilter],
    queryFn: async () => {
      const statusQuery = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/logs?page=${page}&limit=${limit}${statusQuery}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
    refetchInterval: 30000 // Poll every 30s as fallback
  });

  // Real-time updates via WebSocket
  useEffect(() => {
    if (latestLog) {
      // Invalidate logs query to refresh data from server
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  }, [latestLog, queryClient]);

  const displayLogs = data?.data || [];

  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">


        <div className="flex items-center space-x-4">
          <div className="w-[180px]">
            <Select value={statusFilter} onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1); // Reset page on filter change
            }}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="success">Success (2xx)</SelectItem>
                <SelectItem value="error">Errors (4xx/5xx)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border shadow-sm h-10">
            <Switch
              id="live-mode"
              checked={isConnected}
              disabled={true}
              onCheckedChange={() => { }}
            />
            <Label htmlFor="live-mode" className="cursor-pointer font-medium flex items-center gap-2 text-sm pr-2">
              Live Mode
              {isConnected && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
            </Label>
          </div>
        </div>
      </div>

      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : displayLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              displayLogs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {(() => {
                      const utcDate = new Date(log.created_at);
                      const jakartaTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));
                      return jakartaTime.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      });
                    })()}
                  </TableCell>
                  <TableCell>
                    <MethodBadge method={log.request_method} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={log.response_status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{log.endpoints?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">/{log.endpoints?.alias}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {log.response_time_ms}ms
                  </TableCell>
                  <TableCell className="text-right">
                    <LogDetailsDialog log={log} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-4 py-4 border-t bg-muted/20">
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const m = method?.toUpperCase() || 'UNKNOWN';
  const colors: Record<string, string> = {
    GET: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    POST: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    PUT: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    DELETE: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    PATCH: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  };
  return (
    <Badge className={`${colors[m] || 'bg-gray-100 text-gray-700'} font-mono border shadow-sm`}>
      {m}
    </Badge>
  );
}

function StatusBadge({ status }: { status: number }) {
  if (status >= 200 && status < 300) {
    return <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">Success ({status})</Badge>;
  }
  if (status >= 400 && status < 500) {
    return <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">Client Error ({status})</Badge>;
  }
  if (status >= 500) {
    return <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">Server Error ({status})</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}

function LogDetailsDialog({ log }: { log: any }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Log Details</DialogTitle>
          <DialogDescription>
            Detailed view of the request and response for this log entry.
          </DialogDescription>
        </DialogHeader>
        <div className={`p-6 pb-4 border-b ${log.response_status >= 400 ? 'bg-red-50/50' : 'bg-muted/10'
          }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MethodBadge method={log.request_method} />
              <h2 className="text-xl font-semibold tracking-tight truncate max-w-[300px]" title={log.endpoints?.alias}>
                /{log.endpoints?.alias}
              </h2>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-1.5" />
              {(() => {
                const utcDate = new Date(log.created_at);
                const jakartaTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));
                return jakartaTime.toLocaleString('id-ID', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                });
              })()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={log.response_status} />
            <span className="text-sm text-muted-foreground font-mono ml-2">{log.response_time_ms}ms</span>
          </div>
        </div>

        {/* Replaced ScrollArea with standard div for better nested scroll reliability */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 pb-12 space-y-6">

            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader className="pb-3 border-b bg-muted/5">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Request Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4">
                  <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                    <span className="text-sm text-muted-foreground">Method</span>
                    <span className="text-sm font-mono font-medium">{log.request_method}</span>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                    <span className="text-sm text-muted-foreground">IP Address</span>
                    <span className="text-sm font-mono">{log.ip_address}</span>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] items-start gap-4">
                    <span className="text-sm text-muted-foreground mt-0.5">User Agent</span>
                    <span className="text-sm text-muted-foreground break-all leading-tight bg-muted/10 p-2 rounded border">
                      {log.user_agent}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {log.error_message && (
                <Card className="border-red-200 bg-red-50/30">
                  <CardHeader className="pb-3 border-b border-red-100">
                    <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" /> Error Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-red-600 leading-relaxed font-mono">{log.error_message}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Payloads */}
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Code className="w-3 h-3" /> Request Payload
                  </Label>
                  <CopyButton content={JSON.stringify(log.request_payload, null, 2)} />
                </div>
                <div className="bg-slate-950 text-slate-50 rounded-lg border border-slate-800 shadow-sm relative">
                  <div className="max-h-[300px] w-full overflow-y-auto p-4">
                    <pre className="font-mono text-xs leading-relaxed">
                      {JSON.stringify(log.request_payload, null, 2) || '{}'}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Code className="w-3 h-3" /> Response Body
                  </Label>
                  <CopyButton content={JSON.stringify(log.response_body, null, 2)} />
                </div>
                <div className="bg-slate-950 text-slate-50 rounded-lg border border-slate-800 shadow-sm relative">
                  <div className="max-h-[300px] w-full overflow-y-auto p-4">
                    <pre className="font-mono text-xs leading-relaxed">
                      {JSON.stringify(log.response_body, null, 2) || (
                        <span className="text-slate-500 italic">No response body</span>
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CopyButton({ content }: { content: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content || '');
    setCopied(true);
    toast({ description: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={handleCopy}>
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </Button>
  )
}
