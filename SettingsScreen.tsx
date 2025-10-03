
import React, { useState } from 'react';
import { Medication, HistoryEntry, GapiTokenResponse } from './types';
import { syncToSheets, syncToCalendar } from './services/googleService';
import { GoogleIcon, CalendarIcon } from './components/icons';

interface SettingsScreenProps {
    medications: Medication[];
    history: HistoryEntry[];
    tokenResponse: GapiTokenResponse | null;
    isGapiReady: boolean;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ medications, history, tokenResponse, isGapiReady }) => {
    const [isSheetSyncing, setIsSheetSyncing] = useState(false);
    const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSheetSync = async () => {
        if (!tokenResponse) return;
        setIsSheetSyncing(true);
        setSyncMessage(null);
        try {
            await syncToSheets(medications, history);
            setSyncMessage({ type: 'success', text: 'Planilha atualizada com sucesso!' });
        } catch (error) {
            console.error('Error syncing to Google Sheets:', error);
            setSyncMessage({ type: 'error', text: 'Falha ao sincronizar com Planilhas. Verifique o console.' });
        } finally {
            setIsSheetSyncing(false);
        }
    };
    
    const handleCalendarSync = async () => {
        if (!tokenResponse) return;
        setIsCalendarSyncing(true);
        setSyncMessage(null);
        try {
            await syncToCalendar(medications);
            setSyncMessage({ type: 'success', text: 'Agenda atualizada com sucesso!' });
        } catch (error) {
            console.error('Error syncing to Google Calendar:', error);
            setSyncMessage({ type: 'error', text: 'Falha ao sincronizar com Agenda. Verifique o console.' });
        } finally {
            setIsCalendarSyncing(false);
        }
    };


    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-2xl font-bold text-indigo-600">Ajustes & Sincronização</h1>

            {!tokenResponse ? (
                <div className="text-center py-10 px-4 bg-white rounded-lg shadow-sm">
                    <GoogleIcon className="mx-auto h-12 w-12" />
                    <p className="mt-4 text-slate-600">Faça login com sua conta Google para sincronizar seus dados de medicação com o Google Sheets e Google Calendar.</p>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Sincronização com Google</h2>
                        <p className="text-sm text-slate-500">Exporte seus medicamentos e histórico, e crie lembretes na sua agenda.</p>
                    </div>

                    <div className="space-y-3">
                         <button 
                            onClick={handleSheetSync} 
                            disabled={!isGapiReady || isSheetSyncing}
                            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-4 rounded-md hover:bg-green-700 transition-colors shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                           {isSheetSyncing ? 'Sincronizando...' : 'Sincronizar com Google Sheets'}
                        </button>

                         <button 
                            onClick={handleCalendarSync} 
                            disabled={!isGapiReady || isCalendarSyncing}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                            <CalendarIcon className="w-5 h-5"/>
                            {isCalendarSyncing ? 'Sincronizando...' : 'Sincronizar com Google Calendar'}
                        </button>
                    </div>

                    {syncMessage && (
                        <div className={`mt-4 p-3 rounded-md text-sm ${syncMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {syncMessage.text}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SettingsScreen;
