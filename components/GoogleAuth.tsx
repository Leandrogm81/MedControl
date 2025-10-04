import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, GapiTokenResponse } from '../types';
import { GoogleIcon } from './icons';

// Fix: Declare google on the window object to satisfy TypeScript
declare global {
  interface Window {
    google: any;
  }
}

// Em Vite, variáveis de ambiente vêm de import.meta.env e devem começar com VITE_
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

// Escopos (ajuste para readonly se preferir)
const SCOPES =
  'openid profile email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

interface GoogleAuthProps {
  onAuthChange: (token: GapiTokenResponse | null, profile: UserProfile | null) => void;
  profile: UserProfile | null;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ onAuthChange, profile }) => {
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Considera configurado apenas se veio um clientId válido
    if (GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID')) {
      setIsConfigured(true);
    }
  }, []);

  const fetchProfile = useCallback(async (token: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
    if (!response.ok) throw new Error('Failed to fetch profile');
      const userProfile: UserProfile = await response.json();
      return userProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) return;

    const initializeGsi = () => {
      if (window.google?.accounts?.oauth2) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID!,
          scope: SCOPES,
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              console.error('Google Auth Error:', tokenResponse);
              alert(
                `Erro de autenticação do Google: ${tokenResponse.error_description || tokenResponse.error}.` +
                  ` Verifique o Client ID e as "Origens JavaScript autorizadas" no Google Cloud Console.`
              );
              return;
            }
            const userProfile = await fetchProfile(tokenResponse.access_token);
            onAuthChange(tokenResponse, userProfile);
          },
        });
        setTokenClient(client);
      }
    };

    // Se o script já estiver na página, inicializa; caso contrário, espera carregar
    if (window.google?.accounts?.oauth2) {
      initializeGsi();
    } else {
      const script = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (script) {
        script.addEventListener('load', initializeGsi, { once: true });
      } else {
        // como fallback, injeta o script
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.defer = true;
        s.onload = initializeGsi;
        document.head.appendChild(s);
      }
    }
  }, [isConfigured, fetchProfile, onAuthChange]);

  const handleLogin = () => {
    if (tokenClient) tokenClient.requestAccessToken();
  };

  const handleLogout = () => onAuthChange(null, null);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="text-xs text-center text-red-700 bg-red-100 p-2 rounded-md border border-red-200">
        A aplicação não está configurada.<br />Defina <code>VITE_GOOGLE_CLIENT_ID</code> nas variáveis do projeto (Vercel).
      </div>
    );
  }

  if (profile) {
    return (
      <div className="flex items-center gap-3">
        <img src={profile.picture} alt={profile.name} className="w-8 h-8 rounded-full" />
        <div>
          <p className="text-sm font-medium text-slate-700">{profile.name}</p>
          <button onClick={handleLogout} className="text-xs text-slate-500 hover:underline">
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={!tokenClient}
      className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-full hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-wait"
    >
      <GoogleIcon className="w-5 h-5" />
      Login com Google
    </button>
  );
};

export default GoogleAuth;
