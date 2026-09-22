import React, { useState, useEffect } from 'react';
import { SocketProvider } from './context/SocketContext.js';
import { TeamProvider } from './context/TeamContext.js';
import { AdminAuthProvider } from './context/AdminAuthContext.js';
import { Navbar } from './components/common/Navbar.js';
import { Footer } from './components/common/Footer.js';
import { OfflineBanner } from './components/common/OfflineBanner.js';

import { LandingPage } from './pages/LandingPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { WaitingRoomPage } from './pages/WaitingRoomPage.js';
import { QuizPage } from './pages/QuizPage.js';
import { LeaderboardPage } from './pages/LeaderboardPage.js';
import { ProjectorDisplay } from './pages/ProjectorDisplay.js';
import { RulesPage } from './pages/RulesPage.js';
import { AdminLayout } from './pages/AdminLayout.js';
import { AdminLoginPage } from './pages/AdminLoginPage.js';
import { AlertCircle, ArrowRight } from 'lucide-react';

export function App() {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentRoute(path);
    window.scrollTo(0, 0);
  };

  // Route parser
  const renderRoute = () => {
    // Projector Display Mode (/display) - Clean standalone view
    if (currentRoute === '/display') {
      return <ProjectorDisplay />;
    }

    // Admin layout & routes (/admin, /admin/*)
    if (currentRoute === '/admin' || currentRoute.startsWith('/admin/')) {
      if (currentRoute === '/admin/login') {
        return <AdminLoginPage onNavigate={navigate} />;
      }
      return <AdminLayout onNavigate={navigate} />;
    }

    // Quiz route (/quiz, /quiz/*)
    if (currentRoute === '/quiz' || currentRoute.startsWith('/quiz')) {
      return <QuizPage onNavigate={navigate} />;
    }

    // Standard student & public routes
    switch (currentRoute) {
      case '/':
        return <LandingPage onNavigate={navigate} />;
      case '/join':
        return <RegisterPage onNavigate={navigate} />;
      case '/waiting':
        return <WaitingRoomPage onNavigate={navigate} />;
      case '/leaderboard':
        return <LeaderboardPage />;
      case '/rules':
        return <RulesPage onNavigate={navigate} />;
      default:
        return (
          <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4 bg-slate-950 text-center">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 max-w-md w-full space-y-4 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-black text-white">404</h1>
              <p className="text-base font-bold text-slate-200">Page not found</p>
              <p className="text-xs text-slate-400">
                The requested URL does not exist or has moved.
              </p>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Back to Home</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
    }
  };

  const isProjectorMode = currentRoute === '/display';
  const isAdminView = currentRoute.startsWith('/admin') && currentRoute !== '/admin/login';

  return (
    <SocketProvider>
      <TeamProvider>
        <AdminAuthProvider>
          <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-amber-500 selection:text-slate-950">
            {/* Show Navbar and OfflineBanner only for standard user views */}
            {!isProjectorMode && !isAdminView && (
              <>
                <Navbar onNavigate={navigate} currentRoute={currentRoute} />
                <OfflineBanner />
              </>
            )}

            <div className="flex-1">
              {renderRoute()}
            </div>

            {!isProjectorMode && !isAdminView && (
              <Footer />
            )}
          </div>
        </AdminAuthProvider>
      </TeamProvider>
    </SocketProvider>
  );
}
export default App;
