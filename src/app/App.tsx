import { HomePage } from '@/app/components/HomePage';
import { SubmitItemPage } from '@/app/components/SubmitItemPage';
import { SearchPage } from '@/app/components/SearchPage';
import { AdminDashboard } from '@/app/components/AdminDashboard';
import { LoginPage } from '@/app/components/LoginPage';
import { Button } from '@/app/components/ui/button';
import { Toaster } from '@/app/components/ui/sonner';
import { ShieldCheck, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase/client';
import { projectId } from '/utils/supabase/info';
import { useState, useEffect } from 'react';

type Page = 'home' | 'submit' | 'search' | 'admin';

interface User {
  email: string;
  role: string;
  accessToken: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    checkExistingSession();
    
    // Set up auth state listener for automatic token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, 'Session:', !!session);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
          // Update user with new token
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/auth/me`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            setUser({
              email: data.user.email,
              role: data.user.role,
              accessToken: session.access_token,
            });
            console.log('Token refreshed for user:', data.user.email);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkExistingSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        // Verify session with backend to get role
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-4452b5a8/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUser({
            email: data.user.email,
            role: data.user.role,
            accessToken: session.access_token,
          });
        } else {
          // Session invalid, clear it
          await supabase.auth.signOut();
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setCurrentPage('home');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const handleNavigate = (page: Page) => {
    // Protect admin page
    if (page === 'admin' && user?.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      return;
    }
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'submit':
        return <SubmitItemPage onNavigate={handleNavigate} userEmail={user?.email || ''} />;
      case 'search':
        return <SearchPage onNavigate={handleNavigate} userEmail={user?.email || ''} />;
      case 'admin':
        // Double-check admin access
        if (user?.role !== 'admin') {
          toast.error('Access denied. Admin privileges required.');
          setCurrentPage('home');
          return <HomePage onNavigate={handleNavigate} />;
        }
        return <AdminDashboard onNavigate={handleNavigate} accessToken={user.accessToken} />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  // Show loading while checking authentication
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return (
      <>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage('home')}
            className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            📦 Lost & Found
          </button>
          <nav className="flex items-center gap-4">
            <Button
              variant={currentPage === 'search' ? 'default' : 'ghost'}
              onClick={() => handleNavigate('search')}
            >
              Browse Items
            </Button>
            <Button
              variant={currentPage === 'submit' ? 'default' : 'ghost'}
              onClick={() => handleNavigate('submit')}
            >
              Report Found
            </Button>
            {user.role === 'admin' && (
              <Button
                variant={currentPage === 'admin' ? 'default' : 'ghost'}
                onClick={() => handleNavigate('admin')}
                className="ml-2"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admin
              </Button>
            )}
            <div className="ml-4 flex items-center gap-3 pl-4 border-l">
              <div className="text-sm">
                <div className="font-medium">{user.email}</div>
                <div className="text-xs text-gray-500 capitalize">{user.role}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                aria-label="Logout from your account"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>{renderPage()}</main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-3">School Lost & Found</h3>
              <p className="text-sm text-gray-600">
                Helping students reunite with their lost belongings through an
                easy-to-use platform.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => handleNavigate('search')}
                    className="text-blue-600 hover:underline"
                  >
                    Browse Items
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleNavigate('submit')}
                    className="text-blue-600 hover:underline"
                  >
                    Report Found Item
                  </button>
                </li>
                {user.role === 'admin' && (
                  <li>
                    <button
                      onClick={() => handleNavigate('admin')}
                      className="text-blue-600 hover:underline"
                    >
                      Admin Dashboard
                    </button>
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Contact</h3>
              <p className="text-sm text-gray-600">
                For questions or assistance:
                <br />
                Email: lostandfound@school.edu
                <br />
                Office: Main Building, Room 101
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-gray-600">
            <p>© 2025 School Lost & Found. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}