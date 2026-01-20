import { useSession, signOut } from '@/lib/auth-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SessionsCard } from '@/components/settings/sessions-card';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LogOut, User } from 'lucide-react';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/_authenticated/dashboard/settings')({
    component: SettingsPage,
});

function SettingsPage() {
    const { data: session } = useSession();
    const navigate = useNavigate();


    const handleSignOut = async () => {
        await signOut();
        navigate({ to: '/login' });
    };

    const userInitials = session?.user?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings</h2>
                <p className="text-muted-foreground mt-2">Manage your account and application preferences.</p>
            </div>

            <div className="grid gap-6">
                {/* Profile Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Profile
                        </CardTitle>
                        <CardDescription>
                            Your personal information. Managed via Better Auth.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-6">
                            <Avatar className="h-20 w-20 border-2 border-gray-100">
                                <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
                                <AvatarFallback className="text-xl bg-blue-50 text-blue-600 font-semibold">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h3 className="text-lg font-medium text-foreground">{session?.user?.name}</h3>
                                <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={handleSignOut}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Security Section Removed (Google Auth Only) */}

                {/* Sessions Section */}
                <SessionsCard />


            </div>
        </div>
    );
}
