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
import { Plus, Trash, Edit, Copy, Terminal, ExternalLink, Key as KeyIcon, Play, Stethoscope, MoreHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateTime } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/dashboard/endpoints')({
  component: EndpointsPage,
});

const endpointSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  alias: z.string().min(1, 'Alias is required')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Alias must be alphanumeric with dashes/underscores'),
  target_url: z.string().url('Must be a valid URL'),
  description: z.string().optional(),
  allowed_methods: z.array(z.string()).min(1, 'Select at least one method'),
  require_api_key: z.boolean().default(false),
  payload_mapping: z.record(z.string(), z.string()).optional()
});

type EndpointFormValues = z.infer<typeof endpointSchema>;

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

function EndpointsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<any>(null);
  const [deletingEndpoint, setDeletingEndpoint] = useState<any>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: endpointsData, isLoading } = useQuery({
    queryKey: ['endpoints'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/endpoints`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch endpoints');
      return res.json();
    }
  });

  const endpoints = endpointsData?.data || [];

  // Toggle Status Mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/endpoints/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to toggle endpoint');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      toast({ title: 'Success', description: 'Endpoint status updated' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  });


  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/endpoints/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete endpoint');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      setDeletingEndpoint(null);
      toast({ title: 'Success', description: 'Endpoint deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete endpoint', variant: 'destructive' });
    }
  });

  const handleEdit = (endpoint: any) => {
    setEditingEndpoint(endpoint);
    setIsCreateOpen(true);
  };

  const handleCopyUrl = (alias: string) => {
    const url = `${import.meta.env.VITE_API_URL}/r/${alias}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied', description: 'Endpoint URL copied to clipboard' });
  };

  const [checkingId, setCheckingId] = useState<string | null>(null);

  const handleHealthCheck = async (endpoint: any) => {
    setCheckingId(endpoint.id);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/endpoints/${endpoint.id}/check`, {
        method: 'POST',
        credentials: 'include'
      });
      const result = await res.json();

      if (result.success && result.data.status === 'healthy') {
        toast({
          title: 'Healthy Connection',
          description: `Connected to GAS in ${result.data.duration}ms.`,
          variant: 'default',
          className: 'border-l-4 border-l-green-500',
          duration: 2500,
        });
      } else {
        toast({
          title: 'Connection Issue',
          description: result.data?.message || 'Failed to reach GAS endpoint',
          variant: 'destructive',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to perform health check',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setCheckingId(null);
    }
  };

  const handleCopyCurl = (endpoint: any) => {
    const url = `${import.meta.env.VITE_API_URL}/r/${endpoint.alias}`;
    const method = endpoint.allowed_methods?.[0] || 'POST';

    let curl = `curl -X ${method} "${url}" \\
  -H "Content-Type: application/json"`;

    if (endpoint.require_api_key) {
      curl += ` \\
  -H "x-api-key: YOUR_KEY_HERE"`;
    }

    curl += ` \\
  -d '{"message": "Hello World"}'`;

    navigator.clipboard.writeText(curl);
    toast({ title: 'Copied', description: 'cURL command copied to clipboard' });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">

        <Button onClick={() => { setEditingEndpoint(null); setIsCreateOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Endpoint
        </Button>
      </div>

      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Name / Alias</TableHead>
              <TableHead>Target URL</TableHead>
              <TableHead>Methods</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-10" /></TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : endpoints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No endpoints found. Create your first one!
                </TableCell>
              </TableRow>
            ) : (
              endpoints.map((endpoint: any) => (
                <TableRow key={endpoint.id} className={!endpoint.is_active ? 'opacity-60 bg-gray-50' : ''}>
                  <TableCell>
                    <Switch
                      checked={endpoint.is_active}
                      onCheckedChange={() => toggleMutation.mutate(endpoint.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{endpoint.name}</span>
                      <div className="flex items-center text-xs text-muted-foreground mt-0.5 group cursor-pointer" onClick={() => handleCopyUrl(endpoint.alias)} title="Click to copy URL">
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded border">/{endpoint.alias}</span>
                        {endpoint.require_api_key && <span title="API Key Required"><KeyIcon className="w-3 h-3 text-amber-500 ml-1" /></span>}
                        <Copy className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2 max-w-[250px]">
                      <a
                        href={endpoint.target_url || endpoint.gas_url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-sm text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                        title={endpoint.target_url || endpoint.gas_url}
                      >
                        {endpoint.target_url || endpoint.gas_url}
                      </a>
                      <a href={endpoint.target_url || endpoint.gas_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-blue-500 transition-colors" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap max-w-[150px]">
                      {endpoint.allowed_methods?.map((m: string) => (
                        <span key={m} className="text-[10px] bg-slate-100 border px-1 rounded font-mono text-slate-600">{m}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(endpoint.last_used_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setTestingEndpoint(endpoint)} title="Test Endpoint" className="h-8 w-8 p-0">
                        <Play className="w-4 h-4 text-emerald-600" />
                        <span className="sr-only">Test</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleCopyUrl(endpoint.alias)}>
                            <Copy className="mr-2 h-4 w-4" /> Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyCurl(endpoint)}>
                            <Terminal className="mr-2 h-4 w-4" /> Copy cURL
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleHealthCheck(endpoint)} disabled={checkingId === endpoint.id}>
                            <Stethoscope className={`mr-2 h-4 w-4 ${checkingId === endpoint.id ? 'animate-pulse text-blue-500' : ''}`} />
                            Check Connection
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(endpoint)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeletingEndpoint(endpoint)} className="text-red-600 focus:text-red-600">
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EndpointFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        initialData={editingEndpoint}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['endpoints'] });
          setEditingEndpoint(null);
        }}
      />

      {testingEndpoint && (
        <TestEndpointDialog
          open={!!testingEndpoint}
          onOpenChange={(open) => !open && setTestingEndpoint(null)}
          endpoint={testingEndpoint}
        />
      )}

      <AlertDialog open={!!deletingEndpoint} onOpenChange={() => setDeletingEndpoint(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the endpoint
              <span className="font-bold"> {deletingEndpoint?.name} </span>
              and all associated logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingEndpoint && deleteMutation.mutate(deletingEndpoint.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}

function EndpointFormDialog({
  open,
  onOpenChange,
  initialData,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<EndpointFormValues>({
    resolver: zodResolver(endpointSchema) as any,
    defaultValues: {
      name: '',
      alias: '',
      target_url: '',
      description: '',
      allowed_methods: ['POST'],
      require_api_key: false,
      payload_mapping: {}
    }
  });

  /* Effect to reset form when dialog opens with new data */
  /* Using useEffect to avoid render-phase side-effects */
  const { reset } = form; // Destructure for stable dependency

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          name: initialData.name,
          alias: initialData.alias,
          target_url: initialData.target_url || initialData.gas_url,
          description: initialData.description || '',
          allowed_methods: initialData.allowed_methods || ['POST'],
          require_api_key: initialData.require_api_key || false,
          payload_mapping: initialData.payload_mapping || {}
        });
      } else {
        reset({
          name: '',
          alias: '',
          target_url: '',
          description: '',
          allowed_methods: ['POST'],
          require_api_key: false,
          payload_mapping: {}
        });
      }
    }
  }, [open, initialData, reset]);

  const mutation = useMutation({
    mutationFn: async (values: EndpointFormValues) => {
      const url = initialData
        ? `${import.meta.env.VITE_API_URL}/api/endpoints/${initialData.id}`
        : `${import.meta.env.VITE_API_URL}/api/endpoints`;

      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: 'include'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || 'Failed to save endpoint');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: `Endpoint ${initialData ? 'updated' : 'created'} successfully` });
      onOpenChange(false);
      onSuccess();
      form.reset();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const onSubmit = (values: EndpointFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Endpoint' : 'Create New Endpoint'}</DialogTitle>
          <DialogDescription>
            Configure your GAS bridge endpoint details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="My Sheet API" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="alias">Alias (Public URL)</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-md border">/r/</span>
              <Input id="alias" placeholder="my-endpoint" {...form.register('alias')} />
            </div>
            {form.formState.errors.alias && (
              <p className="text-sm text-red-500">{form.formState.errors.alias.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Final URL: {import.meta.env.VITE_API_URL}/r/{form.watch('alias') || '...'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_url">GAS Web App URL</Label>
            <Input id="target_url" placeholder="https://script.google.com/macros/s/..." {...form.register('target_url')} />
            {form.formState.errors.target_url && (
              <p className="text-sm text-red-500">{form.formState.errors.target_url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Allowed Methods</Label>
            <Controller
              control={form.control}
              name="allowed_methods"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2 border p-3 rounded-md">
                  {HTTP_METHODS.map((method) => (
                    <div key={method} className="flex items-center space-x-2">
                      <Checkbox
                        id={`method-${method}`}
                        checked={field.value.includes(method)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([...field.value, method]);
                          } else {
                            field.onChange(field.value.filter((m) => m !== method));
                          }
                        }}
                      />
                      <Label htmlFor={`method-${method}`} className="cursor-pointer text-sm font-normal">
                        {method}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            />
            {form.formState.errors.allowed_methods && (
              <p className="text-sm text-red-500">{form.formState.errors.allowed_methods.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input id="description" placeholder="Handles form submissions..." {...form.register('description')} />
          </div>

          <div className="flex items-center space-x-2 border p-3 rounded-lg bg-slate-50">
            <Controller
              control={form.control}
              name="require_api_key"
              render={({ field }) => (
                <Switch
                  id="require_api_key"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <div className="space-y-0.5">
              <Label htmlFor="require_api_key" className="text-sm font-medium">
                Require API Key
              </Label>
              <p className="text-xs text-gray-500">
                If enabled, requests must include a valid <code>x-api-key</code> header.
              </p>
            </div>
          </div>

          {/* Payload Mapping Section */}
          <div className="space-y-3 border p-3 rounded-lg bg-slate-50">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Payload Mapping (Optional)</Label>
                <p className="text-xs text-gray-500">
                  Map incoming JSON keys (Source) to GAS parameters (Target).
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                const currentMapping = form.getValues('payload_mapping') as Record<string, string> || {};
                form.setValue('payload_mapping', { ...currentMapping, '': '' });
              }}>
                <Plus className="w-3 h-3 mr-1" /> Add Field
              </Button>
            </div>

            <div className="space-y-2">
              {Object.entries((form.watch('payload_mapping') || {}) as Record<string, string>).map(([source, target], index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Source Key (e.g. user_id)"
                    value={source}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      const current = form.getValues('payload_mapping') as Record<string, string>;
                      const content = current[source];
                      const { [source]: _, ...rest } = current; // Remove old key
                      form.setValue('payload_mapping', { ...rest, [newKey]: content });
                    }}
                    className="text-xs font-mono h-8"
                  />
                  <span className="text-gray-400">→</span>
                  <Input
                    placeholder="Target Key (e.g. id)"
                    value={target as string}
                    onChange={(e) => {
                      const current = form.getValues('payload_mapping') as Record<string, string>;
                      form.setValue('payload_mapping', { ...current, [source]: e.target.value });
                    }}
                    className="text-xs font-mono h-8"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    const current = form.getValues('payload_mapping') as Record<string, string>;
                    const { [source]: _, ...rest } = current;
                    form.setValue('payload_mapping', rest);
                  }}>
                    <Trash className="w-3 h-3 text-red-400" />
                  </Button>
                </div>
              ))}
              {Object.keys((form.watch('payload_mapping') || {}) as Record<string, string>).length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-2">No mappings defined. Payload will be sent as-is.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {initialData ? 'Update Endpoint' : 'Create Endpoint'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TestEndpointDialog({
  open,
  onOpenChange,
  endpoint
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: any;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [method, setMethod] = useState(endpoint.allowed_methods?.[0] || 'POST');
  const [apiKey, setApiKey] = useState('');
  const [payload, setPayload] = useState('{\n  "test": true\n}');

  const handleTest = async () => {
    setIsLoading(true);
    setResponse(null);
    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (endpoint.require_api_key && apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/r/${endpoint.alias}`, {
        method,
        headers,
        body: ['GET', 'HEAD'].includes(method) ? undefined : payload
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        duration,
        data
      });
    } catch (err: any) {
      setResponse({
        error: err.message || 'Failed to send request'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-600" />
            Test Endpoint: <span className="font-mono text-muted-foreground">/{endpoint.alias}</span>
          </DialogTitle>
          <DialogDescription>
            Send a real request to your GAS endpoint directly from the browser.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Method</Label>
              <div className="flex flex-wrap gap-2">
                {endpoint.allowed_methods.map((m: string) => (
                  <Button
                    key={m}
                    type="button"
                    variant={method === m ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMethod(m)}
                    className={method === m ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>

            {endpoint.require_api_key && (
              <div className="space-y-2">
                <Label htmlFor="test-api-key" className="text-amber-600">x-api-key (Required)</Label>
                <Input
                  id="test-api-key"
                  type="password"
                  placeholder="Paste your API Key here"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            )}

            {!['GET', 'HEAD'].includes(method) && (
              <div className="space-y-2">
                <Label>Request Body (JSON)</Label>
                <textarea
                  className="w-full h-[200px] font-mono text-xs p-3 rounded-md border bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                />
              </div>
            )}

            <Button onClick={handleTest} disabled={isLoading} className="w-full gap-2">
              {isLoading ? 'Sending...' : <><Play className="w-4 h-4" /> Send Request</>}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Response</Label>
            <div className="h-[400px] rounded-lg border bg-slate-900 text-slate-50 p-4 font-mono text-xs overflow-auto relative">
              {response ? (
                <>
                  <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${response.status >= 200 && response.status < 300 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {response.status} {response.statusText}
                      </span>
                      <span className="text-slate-400">{response.duration}ms</span>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap">
                    {typeof response.data === 'object'
                      ? JSON.stringify(response.data, null, 2)
                      : response.data}
                  </pre>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 italic">
                  Waiting for response...
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
