import { Link, useLocation } from '@tanstack/react-router';
import { LayoutDashboard, Link2, FileText, Key, Settings, LogOut, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/auth-client';
import { useNavigate } from '@tanstack/react-router';

const menuItems = [
    { icon: LayoutDashboard, label: 'Overview', to: '/dashboard' },
    { icon: Link2, label: 'Endpoints', to: '/dashboard/endpoints' },
    { icon: FileText, label: 'Logs', to: '/dashboard/logs' },
    { icon: Key, label: 'API Keys', to: '/dashboard/api-keys' },
    { icon: Settings, label: 'Settings', to: '/dashboard/settings' },
];

interface SidebarProps {
    className?: string;
    onClose?: () => void;
}

export function Sidebar({ className, onClose }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignOut = async () => {
        await signOut();
        navigate({ to: '/login' });
    };

    return (
        <aside className={cn("w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground flex flex-col h-screen fixed left-0 top-0 z-20 transition-transform duration-300", className)}>
            <div className="p-6 border-b border-sidebar-border/50">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
                        <Zap className="w-5 h-5 text-white fill-current" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-sidebar-foreground leading-none">
                            GAS Bridge
                        </h1>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5 tracking-wide uppercase">
                            Enterprise Hub
                        </p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group',
                                isActive
                                    ? 'bg-sidebar-accent text-sidebar-primary font-medium shadow-sm'
                                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-foreground")} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
