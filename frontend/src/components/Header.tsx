import { Link, useNavigate, useLocation } from '@tanstack/react-router';
import { signOut } from '@/lib/auth-client';
import { useSession } from '@/lib/auth-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Menu, Settings, LogOut } from 'lucide-react';

export function Header({ title, onMobileMenuClick }: { title?: string; onMobileMenuClick?: () => void }) {
    const { data: session } = useSession();
    const navigate = useNavigate();
    const location = useLocation();

    // Map routes to titles
    const getTitle = () => {
        if (title) return title;
        const path = location.pathname;
        if (path.includes('/settings')) return 'Settings';
        if (path.includes('/logs')) return 'Request Logs';
        if (path.includes('/api-keys')) return 'API Keys';
        if (path.includes('/endpoints')) return 'Endpoints';
        return 'Dashboard';
    };

    const displayTitle = getTitle();

    const userInitials = session?.user?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    const handleSignOut = async () => {
        await signOut();
        navigate({ to: '/login' });
    };

    return (
        <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 w-full">
            <div className="flex items-center gap-3 md:gap-4">
                <button
                    onClick={onMobileMenuClick}
                    className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <h2 className="text-lg md:text-xl font-semibold text-foreground truncate">{displayTitle}</h2>
            </div>

            <div className="flex items-center gap-4">
                {/* Search removed as per user request to reduce confusion */}

                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative">
                    <Bell className="w-5 h-5" />
                </button>

                <div className="h-6 w-px bg-gray-200 mx-1"></div>

                <DropdownMenu>
                    <DropdownMenuTrigger className="focus:outline-none">
                        <div className="flex items-center gap-3 hover:bg-gray-50 p-1.5 rounded-full pr-3 transition-colors">
                            <Avatar className="h-8 w-8 border border-gray-200">
                                <AvatarImage src={session?.user?.image || ''} />
                                <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-medium text-gray-700 leading-none">
                                    {session?.user?.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 leading-none">
                                    {session?.user?.email}
                                </p>
                            </div>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem asChild>
                            <Link to="/dashboard/settings" className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                            onClick={handleSignOut}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
