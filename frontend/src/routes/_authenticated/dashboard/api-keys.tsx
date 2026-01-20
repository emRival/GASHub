import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Copy, Check, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDateTime, formatDate } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/dashboard/api-keys')({
    component: ApiKeysPage,
});

import { Checkbox } from '@/components/ui/checkbox';

const apiKeySchema = z.object({
    name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
    allowed_endpoint_ids: z.array(z.string()).optional(),
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;

function ApiKeysPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [deletingKey, setDeletingKey] = useState<any>(null);
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Fetch Keys
    const { data: keysData, isLoading: isLoadingKeys } = useQuery({
        queryKey: ['api-keys'],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/api-keys`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch API keys');
            return res.json();
        }
    });

    // Fetch Endpoints (for scope selection)
    const { data: endpointsData, isLoading: isLoadingEndpoints } = useQuery({
        queryKey: ['endpoints'],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/endpoints`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch endpoints');
            return res.json();
        }
    });

    const keys = keysData?.data || [];
    const endpoints = endpointsData?.data || [];
    const isLoading = isLoadingKeys || isLoadingEndpoints;

    const createMutation = useMutation({
        mutationFn: async (values: ApiKeyFormValues) => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to create API key');
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            setCreatedKey(data.data.apiKey); // Show the key!
            toast({ title: 'Success', description: 'API Key created' });
        },
        onError: (err) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    // ... deleteMutation ...
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/api-keys/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to delete API key');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            setDeletingKey(null);
            toast({ title: 'Success', description: 'API Key revoked' });
        },
        onError: (err) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">API Keys</h2>
                    <p className="text-gray-500 mt-2">Manage API keys for programmatic access.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Create New Key
                </Button>
            </div>

            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Key Prefix</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead>Last Used</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : keys.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                                    No API keys found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            keys.map((key: any) => (
                                <TableRow key={key.id}>
                                    <TableCell className="font-medium text-gray-900">{key.name}</TableCell>
                                    <TableCell className="font-mono text-sm text-gray-500">{key.key_prefix}</TableCell>
                                    <TableCell>
                                        {key.allowed_endpoint_ids && key.allowed_endpoint_ids.length > 0 ? (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                Scoped ({key.allowed_endpoint_ids.length})
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-slate-100 text-slate-700">
                                                Global Access
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={key.is_active ? 'default' : 'secondary'} className={key.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}>
                                            {key.is_active ? 'Active' : 'Revoked'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-500">
                                        {formatDateTime(key.created_at)}
                                    </TableCell>
                                    <TableCell className="text-gray-500">
                                        {key.last_used_at ? formatDateTime(key.last_used_at) : 'Never'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => setDeletingKey(key)} className="text-gray-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create Key Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsCreateOpen(false);
                    setCreatedKey(null); // Reset on close
                }
            }}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    {!createdKey ? (
                        <CreateKeyForm
                            endpoints={endpoints}
                            onSubmit={(values) => createMutation.mutate(values)}
                            isLoading={createMutation.isPending}
                            onCancel={() => setIsCreateOpen(false)}
                        />
                    ) : (
                        <KeySuccessView apiKey={createdKey} onClose={() => {
                            setIsCreateOpen(false);
                            setCreatedKey(null);
                        }} />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Alert - No Change needed here... */}
            <AlertDialog open={!!deletingKey} onOpenChange={() => setDeletingKey(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. Any applications using this key <span className="font-mono font-bold text-gray-900">{deletingKey?.key_prefix}</span> will immediately lose access.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deletingKey && deleteMutation.mutate(deletingKey.id)}
                        >
                            Revoke Key
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function CreateKeyForm({ endpoints, onSubmit, isLoading, onCancel }: { endpoints: any[], onSubmit: (v: ApiKeyFormValues) => void, isLoading: boolean, onCancel: () => void }) {
    const form = useForm<ApiKeyFormValues>({
        resolver: zodResolver(apiKeySchema),
        defaultValues: { name: '', allowed_endpoint_ids: [] }
    });

    const [isScoped, setIsScoped] = useState(false);

    return (
        <>
            <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                    Enter a name for this key. You can also restrict it to specific endpoints.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Key Name</Label>
                    <Input id="name" placeholder="e.g., Mobile App Production" {...form.register('name')} />
                    {form.formState.errors.name && (
                        <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                    )}
                </div>

                <div className="space-y-4 border rounded-md p-4 bg-slate-50">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="scope-toggle"
                            checked={isScoped}
                            onCheckedChange={(checked) => {
                                setIsScoped(checked as boolean);
                                if (!checked) {
                                    form.setValue('allowed_endpoint_ids', []); // Reset if unchecked
                                }
                            }}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="scope-toggle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Restrict to specific endpoints
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                If unchecked, this key can access ALL endpoints (Global).
                            </p>
                        </div>
                    </div>

                    {isScoped && (
                        <div className="mt-4 pl-6 space-y-2">
                            <Label className="text-xs font-semibold uppercase text-gray-500">Select Endpoints</Label>
                            {endpoints.length === 0 ? (
                                <p className="text-sm text-amber-600">No endpoints found. Create an endpoint first.</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2">
                                    {endpoints.map((endpoint) => (
                                        <div key={endpoint.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`ep-${endpoint.id}`}
                                                onCheckedChange={(checked) => {
                                                    const current = form.getValues('allowed_endpoint_ids') || [];
                                                    if (checked) {
                                                        form.setValue('allowed_endpoint_ids', [...current, endpoint.id]);
                                                    } else {
                                                        form.setValue('allowed_endpoint_ids', current.filter(id => id !== endpoint.id));
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`ep-${endpoint.id}`} className="text-sm font-normal cursor-pointer">
                                                {endpoint.name} <span className="text-gray-400 text-xs">(/r/{endpoint.alias})</span>
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Creating...' : 'Create Key'}
                    </Button>
                </DialogFooter>
            </form>
        </>
    );
}

function KeySuccessView({ apiKey, onClose }: { apiKey: string, onClose: () => void }) {
    const { toast } = useToast();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(apiKey);
        toast({ description: 'API Key copied to clipboard' });
    };

    return (
        <div className="space-y-4">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600">
                    <Check className="w-5 h-5" /> API Key Created
                </DialogTitle>
                <DialogDescription>
                    Please copy your API key now. <strong className="text-red-500">You will not be able to see it again!</strong>
                </DialogDescription>
            </DialogHeader>

            <div className="p-4 bg-slate-50 border rounded-lg space-y-2">
                <Label className="text-xs text-gray-500 uppercase font-semibold">Your API Key</Label>
                <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border p-2 rounded text-sm font-mono text-slate-800 break-all">
                        {apiKey}
                    </code>
                    <Button variant="outline" size="icon" onClick={copyToClipboard}>
                        <Copy className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Security Warning</AlertTitle>
                <AlertDescription className="text-amber-700 text-xs">
                    Do not share this key or commit it to public repositories. If lost, you must create a new one.
                </AlertDescription>
            </Alert>

            <DialogFooter>
                <Button onClick={onClose} className="w-full">
                    I have saved my key
                </Button>
            </DialogFooter>
        </div>
    )
}
