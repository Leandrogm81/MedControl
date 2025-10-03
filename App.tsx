
import React, { useState, useEffect } from 'react';
import { useMedications } from './hooks/useMedications';
import { UserProfile, GapiTokenResponse } from './types';
import { PlusIcon, ClockIcon, CalendarIcon, PillIcon, SettingsIcon } from './components/icons';
import { notificationService } from './services/notificationService';
import { loadGapi, initGapiClient } from './services/googleService';

import GoogleAuth from './components/GoogleAuth';
import HomeScreen from './HomeScreen';
import AddMedicationScreen from './AddMedicationScreen';
import HistoryScreen from './HistoryScreen';
import SettingsScreen from './SettingsScreen';


type View = 'home' | 'add' | 'history' | 'settings';

const App: React.FC = () => {
    const [view, setView] = useState<View>('home');
    const medicationHook = useMedications();

    // Google Auth State
    const [tokenResponse, setTokenResponse] = useState<GapiTokenResponse | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isGapiReady, setIsGapiReady] = useState(false);

    useEffect(() => {
        const registerServiceWorker = () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('Service Worker registered.', reg))
                    .catch(err => console.error('Service Worker registration failed.', err));
            }
        };
        window.addEventListener('load', registerServiceWorker);
        notificationService.requestPermission();
        return () => window.removeEventListener('load', registerServiceWorker);
    }, []);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                if (registration.active) {
                    notificationService.updateSchedules(medicationHook.medications);
                }
            });
        }
    }, [medicationHook.medications]);
    
    // Load and initialize Google API client when user logs in
    useEffect(() => {
        if (tokenResponse) {
            loadGapi(() => {
                try {
                    initGapiClient(tokenResponse.access_token);
                    setIsGapiReady(true);
                } catch(e) {
                    console.error("Error initializing gapi client", e)
                }
            });
        } else {
            setIsGapiReady(false);
        }
    }, [tokenResponse]);

    const handleAuthChange = (token: GapiTokenResponse | null, userProfile: UserProfile | null) => {
        setTokenResponse(token);
        setProfile(userProfile);
    };

    const renderView = () => {
        switch (view) {
            case 'add':
                return <AddMedicationScreen setView={setView} addMedication={medicationHook.addMedication} />;
            case 'history':
                return <HistoryScreen history={medicationHook.history} deleteHistoryEntry={medicationHook.deleteHistoryEntry} />;
            case 'settings':
                return <SettingsScreen 
                            medications={medicationHook.medications} 
                            history={medicationHook.history}
                            tokenResponse={tokenResponse}
                            isGapiReady={isGapiReady}
                        />;
            case 'home':
            default:
                return <HomeScreen medicationHook={medicationHook} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
            <Header profile={profile} onAuthChange={handleAuthChange} />
            <main className="p-4 max-w-2xl mx-auto">
                {renderView()}
            </main>
            <Footer view={view} setView={setView} />
        </div>
    );
};


const Header: React.FC<{ profile: UserProfile | null, onAuthChange: (token: GapiTokenResponse | null, profile: UserProfile | null) => void; }> = ({ profile, onAuthChange }) => (
    <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <PillIcon className="w-8 h-8 text-indigo-600" />
                <h1 className="text-xl font-bold text-slate-800">Controle de Medicação</h1>
            </div>
            <GoogleAuth onAuthChange={onAuthChange} profile={profile} />
        </div>
    </header>
);

const Footer: React.FC<{ view: View, setView: (view: View) => void }> = ({ view, setView }) => {
    const navItems = [
        { id: 'home', icon: <ClockIcon />, label: 'Hoje' },
        { id: 'add', icon: <PlusIcon />, label: 'Adicionar' },
        { id: 'history', icon: <CalendarIcon />, label: 'Histórico' },
        { id: 'settings', icon: <SettingsIcon />, label: 'Ajustes' },
    ];

    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-10">
            <nav className="max-w-2xl mx-auto flex justify-around items-center h-16">
                {navItems.map(item => {
                    const isActive = view === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id as View)}
                            className={`flex flex-col items-center justify-center w-full transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-500'}`}
                        >
                            {React.cloneElement(item.icon, { className: 'w-6 h-6 mb-1' })}
                            <span className="text-xs font-medium">{item.label}</span>
                        </button>
                    )
                })}
            </nav>
        </footer>
    );
};

export default App;
