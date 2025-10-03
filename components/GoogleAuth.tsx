
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, GapiTokenResponse } from '../types';
import { GoogleIcon } from './icons';

// Fix: Declare google on the window object to satisfy TypeScript
declare global {
    interface Window {
        google: any;
    }
}

// You must create a project in Google Cloud Console and get a Client ID.
// Make sure to add your development and production origins to "Authorized JavaScript origins".
// e.g., http://localhost:3000, https://your-app-domain.com
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; 

const SCOPES = 'openid profile email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

interface GoogleAuthProps {
    onAuthChange: (token: GapiTokenResponse | null, profile: UserProfile | null) => void;
    profile: UserProfile | null;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ onAuthChange, profile }) => {
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
            setIsConfigured(true);
        }
    }, []);

    const fetchProfile = useCallback(async (token: string) => {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${token}` }
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
                    client_id: GOOGLE_CLIENT_ID,
                    scope: SCOPES,
                    callback: async (tokenResponse: any) => {
                        if (tokenResponse.error) {
                            console.error('Google Auth Error:', tokenResponse);
                            alert(`Erro de autenticação do Google: ${tokenResponse.error_description || tokenResponse.error}. Verifique a configuração do Client ID e as origens autorizadas no Google Cloud Console.`);
                            return;
                        }
                        const userProfile = await fetchProfile(tokenResponse.access_token);
                        onAuthChange(tokenResponse, userProfile);
                    },
                });
                setTokenClient(client);
            }
        };

        if (window.google) {
            initializeGsi();
        } else {
            const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            script?.addEventListener('load', initializeGsi);
        }

    }, [isConfigured, fetchProfile, onAuthChange]);

    const handleLogin = () => {
        if (tokenClient) {
            tokenClient.requestAccessToken();
        }
    };

    const handleLogout = () => {
        onAuthChange(null, null);
    };

    if (!isConfigured) {
        return (
            <div className="text-xs text-center text-red-700 bg-red-100 p-2 rounded-md border border-red-200">
                A aplicação não está configurada.<br />
                Adicione a sua `GOOGLE_CLIENT_ID`.
            </div>
        );
    }
    
    if (profile) {
        return (
            <div className="flex items-center gap-3">
                <img src={profile.picture} alt={profile.name} className="w-8 h-8 rounded-full" />
                <div>
                    <p className="text-sm font-medium text-slate-700">{profile.name}</p>
                    <button onClick={handleLogout} className="text-xs text-slate-500 hover:underline">Logout</button>
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
