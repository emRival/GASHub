import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, BarChart2, CheckCircle2, Globe, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/')({
    component: Index,
});

function Index() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Navigation */}
            <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary p-1.5 rounded-lg shadow-sm">
                                <Zap className="w-5 h-5 text-primary-foreground fill-current" />
                            </div>
                            <span className="text-xl font-bold tracking-tight">
                                GAS Bridge Hub
                            </span>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
                            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Documentation</a>
                            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Pricing</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to="/login">
                                <Button variant="ghost" size="sm">Log in</Button>
                            </Link>
                            <Link to="/register">
                                <Button size="sm" className="shadow-lg shadow-primary/25">Get Started</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative flex-1 flex flex-col justify-center">
                <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
                    <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
                </div>

                <div className="container mx-auto px-4 py-24 sm:py-32 lg:py-40 text-center">
                    <Badge variant="secondary" className="mb-8 px-4 py-1.5 text-sm font-medium rounded-full border border-primary/20 bg-primary/10 text-primary">
                        🚀 New: Google Authentication Support
                    </Badge>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl mx-auto">
                        Turn Google Sheets into a <br />
                        <span className="text-primary">Professional API Backend</span>
                    </h1>
                    <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                        Securely forward webhooks to Google Apps Script. Monitor logs, enforce rate limits, and manage API keys—all from one powerful dashboard.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link to="/register">
                            <Button size="lg" className="h-12 px-8 text-base shadow-xl shadow-primary/20 rounded-full">
                                Start Building Free
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link to="/dashboard">
                            <Button variant="outline" size="lg" className="h-12 px-8 text-base rounded-full">
                                View Demo
                            </Button>
                        </Link>
                    </div>

                    <div className="mt-20 flex justify-center gap-8 text-muted-foreground grayscale opacity-50">
                        {/* Fake logos for social proof */}
                        <div className="flex items-center gap-2 font-bold"><Globe className="w-5 h-5" /> Acme Corp</div>
                        <div className="flex items-center gap-2 font-bold"><Zap className="w-5 h-5" /> Bolt Inc</div>
                        <div className="flex items-center gap-2 font-bold"><Shield className="w-5 h-5" /> SecureFlow</div>
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div id="features" className="py-32 bg-muted/40 border-t border-border">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-20 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Built for scale, designed for scripts</h2>
                        <p className="text-lg text-muted-foreground">
                            We add the missing layer of security and observability to your Google Apps Script deployments.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        <FeatureCard
                            icon={Zap}
                            title="Instant Relay"
                            desc="Forward webhooks and requests to your Google Apps Script with sub-millisecond overhead."
                        />
                        <FeatureCard
                            icon={Shield}
                            title="Enterprise Security"
                            desc="Secure public endpoints with API Keys, IP whitelisting, and built-in rate limiting."
                        />
                        <FeatureCard
                            icon={BarChart2}
                            title="Real-time Analytics"
                            desc="Debug scripts with detailed logs, response times, and success rate metrics."
                        />
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 -z-10"></div>
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to upgrade your workflow?</h2>
                    <p className="text-muted-foreground mb-10 max-w-2xl mx-auto">
                        Join hundreds of developers building robust internal tools with GAS Bridge.
                    </p>
                    <Link to="/register">
                        <Button size="lg" className="rounded-full shadow-lg">Get Started Now</Button>
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-border py-12 bg-background">
                <div className="container mx-auto px-4">
                    <div className="md:flex justify-between items-center">
                        <div className="mb-6 md:mb-0">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="bg-primary p-1 rounded">
                                    <Zap className="w-4 h-4 text-primary-foreground fill-current" />
                                </div>
                                <span className="text-lg font-bold">GAS Bridge Hub</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                &copy; 2026 GAS Bridge Hub. Built with ❤️ for developers.
                            </p>
                        </div>
                        <div className="flex gap-8">
                            <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Privacy</a>
                            <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Terms</a>
                            <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Contact</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">
                {desc}
            </p>
        </div>
    );
}
