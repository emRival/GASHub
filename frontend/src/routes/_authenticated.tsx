import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';
import { useSession } from '@/lib/auth-client';
import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export const Route = createFileRoute('/_authenticated')({
    component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
    const { data: session, isPending } = useSession();
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    // Show loading spinner while checking auth
    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 font-medium">Loading session...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!session) {
        return <Navigate to="/login" />;
    }

    // Render Dashboard Layout
    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* Desktop Sidebar */}
            <Sidebar className="hidden md:flex" />

            {/* Mobile Sidebar (Drawer) */}
            <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

            <div className="flex-1 flex flex-col md:ml-64 min-w-0 transition-all duration-300 ease-in-out">
                <Header onMobileMenuClick={() => setIsMobileNavOpen(true)} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
                    <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

// MobileNav component definition
function MobileNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    // ... rest of component

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden animate-in fade-in duration-200"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <Sidebar
                className={`transform transition-transform duration-300 ease-in-out z-40 md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                onClose={onClose}
            />
        </>
    );
}
