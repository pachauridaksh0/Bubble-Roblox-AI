
import React from 'react';
import { Layout } from './components/layout/Layout';
import { WelcomePage } from './components/pages/WelcomePage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminPage } from './components/admin/AdminPage';
import { CompleteProfilePage } from './components/auth/CompleteProfilePage';
import { ApiKeySetupPage } from './components/auth/ApiKeySetupPage';
import { FullScreenError } from './components/ui/FullScreenError';
import { UpdateDisplayNamePage } from './components/auth/UpdateDisplayNamePage';

const AppContent: React.FC = () => {
  const { session, profile, loading, geminiApiKey, isAdmin, isImpersonating, profileError } = useAuth();

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
  
  // If the initial profile fetch failed due to a network error, show an error page.
  if (profileError) {
    return (
        <FullScreenError
            title="Connection Error"
            message={profileError}
            onRetry={() => window.location.reload()}
        />
    );
  }
  
  if (isAdmin && !isImpersonating) {
    return <AdminPage />;
  }

  // Check for login status
  if (session) {
    // User is logged in, now check for setup steps
    // Step 1: Force profile completion if it's missing or incomplete.
    if (!profile || !profile.roblox_username) {
        return <CompleteProfilePage />;
    }
    
    // Step 2: Force display name update if it looks like an email.
    // This catches existing users who had their email set as their name.
    const isDisplayNameEmail = profile.roblox_username.includes('@') && profile.roblox_username.includes('.');
    if (isDisplayNameEmail) {
        return <UpdateDisplayNamePage />;
    }
    
    // Step 3: Force API key setup if profile is complete but key is missing.
    if (!geminiApiKey) {
        return <ApiKeySetupPage />;
    }

    // All setup complete, show the main application.
    return (
      <div className="bg-bg-primary text-gray-200 font-sans min-h-screen">
        <Layout geminiApiKey={geminiApiKey} />
      </div>
    );
  } else {
    // User is not logged in, show the public landing/welcome page.
    return <WelcomePage />;
  }
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;