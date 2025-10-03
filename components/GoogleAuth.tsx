
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
// Make sure to add `http://localhost:3000` (or your dev origin) to "Authorized JavaScript origins"
// and `http://localhost:3000` to "Authorized redirect URIs".
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

const SCOPES = 'openid profile email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

interface GoogleAuthProps {
    onAuthChange: (token: GapiTokenResponse | null, profile: UserProfile | null) => void;
    profile: UserProfile | null;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ onAuthChange, profile }) => {
    const [tokenClient, setTokenClient] = useState<any>(null);

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
        const initializeGsi = () => {
            if (window.google?.accounts?.oauth2) {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: SCOPES,
                    // Fix: The token response from Google can include an 'error' property, so we use 'any' to avoid type errors.
                    callback: async (tokenResponse: any) => {
                        if (tokenResponse.error) {
                            console.error('Google Auth Error:', tokenResponse.error);
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
            // If GSI script hasn't loaded yet, wait for it.
            const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            script?.addEventListener('load', initializeGsi);
        }

    }, [fetchProfile, onAuthChange]);

    const handleLogin = () => {
        if (tokenClient) {
            tokenClient.requestAccessToken();
        }
    };

    const handleLogout = () => {
        onAuthChange(null, null);
        if (window.google?.accounts?.oauth2) {
            // No direct 'logout' for token client, just revoke token.
            // For simplicity, we just clear the state locally.
            // A full implementation might call `google.accounts.oauth2.revoke`.
        }
    };

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
            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-full hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50"
        >
            <GoogleIcon className="w-5 h-5" />
            Login com Google
        </button>
    );
};

export default GoogleAuth;
