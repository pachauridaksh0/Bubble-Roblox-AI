
import React from 'react';
import { Layout } from './components/layout/Layout';
import { AuthPage } from './components/auth/AuthPage';
import { WelcomePage } from './components/pages/WelcomePage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  const { session, loading, geminiApiKey } = useAuth();
  const [showWelcome, setShowWelcome] = React.useState(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <svg className="animate-spin h-10 w-10 text-primary-start" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!session) {
      if (showWelcome) {
         return <WelcomePage onGetStarted={() => setShowWelcome(false)} />;
      }
      return <AuthPage />;
  }

  if (!geminiApiKey) {
      return <AuthPage />;
  }


  return (
    <div className="bg-bg-primary text-gray-200 font-sans min-h-screen">
      <Layout geminiApiKey={geminiApiKey} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;