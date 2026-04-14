import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <nav className="h-20 border-b border-gray-100 flex items-center justify-between px-6 lg:px-12 sticky top-0 bg-white/80 backdrop-blur-md z-50">
                <Link href="/" className="hover:opacity-80 transition-opacity flex items-center h-full">
                    <img src="/logo.png" alt="PATHS Logo" className="h-14 w-auto object-contain" />
                </Link>
                <div className="flex items-center gap-6 text-sm font-medium text-slate-600 hidden md:flex">
                    <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
                    <Link href="/how-it-works" className="hover:text-indigo-600 transition-colors">How it Works</Link>
                    <Link href="/for-companies" className="hover:text-indigo-600 transition-colors">For Companies</Link>
                    <Link href="/for-candidates" className="hover:text-indigo-600 transition-colors">For Candidates</Link>
                    <Link href="/about" className="hover:text-indigo-600 transition-colors">About Us</Link>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/login">
                        <Button variant="ghost" size="sm">Login</Button>
                    </Link>
                    <Link href="/contact">
                        <Button size="sm">Request Demo</Button>
                    </Link>
                </div>
            </nav>
            <main className="flex-1">
                {children}
            </main>
            <footer className="bg-slate-900 text-slate-400 py-12 px-6 lg:px-12">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <Link href="/" className="mb-4 block hover:opacity-80 transition-opacity">
                            <img src="/logo.png" alt="PATHS Logo" className="h-8 w-auto brightness-0 invert" />
                        </Link>
                        <p className="text-sm">Fair, anonymous, and efficient recruiting for the modern world.</p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Product</h4>
                        <div className="flex flex-col gap-2 text-sm">
                            <Link href="#" className="hover:text-white">Features</Link>
                            <Link href="#" className="hover:text-white">Security</Link>
                            <Link href="#" className="hover:text-white">Pricing</Link>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Company</h4>
                        <div className="flex flex-col gap-2 text-sm">
                            <Link href="#" className="hover:text-white">About</Link>
                            <Link href="#" className="hover:text-white">Blog</Link>
                            <Link href="#" className="hover:text-white">Careers</Link>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Legal</h4>
                        <div className="flex flex-col gap-2 text-sm">
                            <Link href="#" className="hover:text-white">Privacy</Link>
                            <Link href="#" className="hover:text-white">Terms</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
