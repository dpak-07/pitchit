import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HostDashboardPage } from './pages/HostDashboardPage';
import { HostCreateAuctionPage } from './pages/HostCreateAuctionPage';
import { HostControlRoomPage } from './pages/HostControlRoomPage';
import { JoinAuctionPage } from './pages/JoinAuctionPage';
import { LiveAuctionPage } from './pages/LiveAuctionPage';
import { ResultsPage } from './pages/ResultsPage';
import { MyTeamsPage } from './pages/MyTeamsPage';

function MainLayout() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('login');
  const [pageParam, setPageParam] = useState<string | undefined>(undefined);

  // Initial routing decision based on user state
  useEffect(() => {
    if (!loading) {
      if (!user) {
        setCurrentPage('login');
      } else if (user.role === 'auctioneer') {
        setCurrentPage('host-dashboard');
      } else {
        setCurrentPage('join');
      }
    }
  }, [loading, user]);

  const handleNavigate = (page: string, param?: string) => {
    setCurrentPage(page);
    setPageParam(param);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <span>Entering PitchBid Stadium...</span>
        </div>
      </div>
    );
  }

  // Render correct page
  const renderContent = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onNavigate={handleNavigate} />;
      case 'register':
        return <RegisterPage onNavigate={handleNavigate} />;
      case 'host-dashboard':
        return user?.role === 'auctioneer' ? (
          <HostDashboardPage onNavigate={handleNavigate} />
        ) : (
          <JoinAuctionPage onNavigate={handleNavigate} />
        );
      case 'host-create':
        return user?.role === 'auctioneer' ? (
          <HostCreateAuctionPage onNavigate={handleNavigate} />
        ) : (
          <JoinAuctionPage onNavigate={handleNavigate} />
        );
      case 'host-room':
        return pageParam ? (
          <HostControlRoomPage auctionId={pageParam} onNavigate={handleNavigate} />
        ) : (
          <HostDashboardPage onNavigate={handleNavigate} />
        );
      case 'join':
        return <JoinAuctionPage onNavigate={handleNavigate} />;
      case 'live-room':
        return pageParam ? (
          <LiveAuctionPage auctionId={pageParam} onNavigate={handleNavigate} />
        ) : (
          <JoinAuctionPage onNavigate={handleNavigate} />
        );
      case 'results':
        return pageParam ? (
          <ResultsPage auctionId={pageParam} onNavigate={handleNavigate} />
        ) : (
          <JoinAuctionPage onNavigate={handleNavigate} />
        );
      case 'my-teams':
        return <MyTeamsPage onNavigate={handleNavigate} />;
      default:
        return <LoginPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Background Stadium Glow & Turf Grid Accent */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-emerald-600/10 via-teal-900/5 to-transparent blur-3xl opacity-70" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-t from-emerald-950/20 to-transparent blur-3xl" />
      </div>

      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        activeRoomCode={currentPage === 'live-room' || currentPage === 'host-room' ? pageParam : undefined}
      />

      <main className="flex-1 relative z-10">{renderContent()}</main>

      {/* Stadium footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-6 text-center text-xs text-slate-500 font-mono relative z-10">
        <p>PitchBid Football Auction Platform • Realtime WebSockets & Atomic Lock Engine</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainLayout />
      </ToastProvider>
    </AuthProvider>
  );
}
