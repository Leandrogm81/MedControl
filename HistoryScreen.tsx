
import React from 'react';
import { HistoryEntry } from './types';
import { formatTime, formatDate } from './utils/time';
import { TrashIcon, CalendarIcon } from './components/icons';

const HistoryScreen: React.FC<{ history: HistoryEntry[]; deleteHistoryEntry: (id: string) => void; }> = ({ history, deleteHistoryEntry }) => {
    const sortedHistory = [...history].sort((a, b) => b.takenAt - a.takenAt);
    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-2xl font-bold text-indigo-600">Histórico</h1>
            {sortedHistory.length > 0 ? (
                <ul className="space-y-3">
                    {sortedHistory.map(entry => (
                        <li key={entry.id} className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-800">{entry.medicationName}</p>
                                <p className="text-sm text-slate-500">
                                    {formatDate(entry.takenAt)} às {formatTime(entry.takenAt)}
                                    {entry.scheduledTime !== 'Livre' && ` (agendado para ${entry.scheduledTime})`}
                                </p>
                            </div>
                            <button onClick={() => deleteHistoryEntry(entry.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                 <div className="text-center py-10 px-4 bg-white rounded-lg shadow-sm">
                    <CalendarIcon className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-4 text-slate-500">Nenhum registro no histórico ainda.</p>
                </div>
            )}
        </div>
    );
};

export default HistoryScreen;
