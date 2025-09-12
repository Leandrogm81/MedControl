
import React, { useState, useEffect, useMemo } from 'react';
import { useMedications } from './hooks/useMedications';
import { Medication, FrequencyType, Dose, HistoryEntry } from './types';
import { PlusIcon, ClockIcon, CheckIcon, TrashIcon, CalendarIcon, PillIcon } from './components/icons';
import { formatTime, formatDate, getTodayDateString } from './utils/time';
import Modal from './components/Modal';
import { notificationService } from './services/notificationService';

type View = 'home' | 'add' | 'history';

const App: React.FC = () => {
    const [view, setView] = useState<View>('home');
    const medicationHook = useMedications();

    useEffect(() => {
        notificationService.requestPermission();
    }, []);

    useEffect(() => {
        const todayDoses = medicationHook.getDailyDoses(new Date());
        todayDoses.forEach(dose => {
            notificationService.scheduleDoseNotification(dose);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [medicationHook.medications]);


    const renderView = () => {
        switch (view) {
            case 'add':
                return <AddMedicationScreen setView={setView} addMedication={medicationHook.addMedication} />;
            case 'history':
                return <HistoryScreen history={medicationHook.history} deleteHistoryEntry={medicationHook.deleteHistoryEntry} />;
            case 'home':
            default:
                return <HomeScreen medicationHook={medicationHook} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
            <Header />
            <main className="p-4 max-w-2xl mx-auto">
                {renderView()}
            </main>
            <Footer view={view} setView={setView} />
        </div>
    );
};


//---------------------------------
// VIEWS / SCREENS
//---------------------------------

const HomeScreen: React.FC<{ medicationHook: ReturnType<typeof useMedications> }> = ({ medicationHook }) => {
    const { getDailyDoses, takeDose, updateMedication } = medicationHook;
    const [recalcModalOpen, setRecalcModalOpen] = useState(false);
    const [selectedDose, setSelectedDose] = useState<Dose | null>(null);

    const todayDoses = useMemo(() => getDailyDoses(new Date()), [getDailyDoses]);

    const handleTakeDose = (dose: Dose) => {
        takeDose(dose.medicationId, dose.scheduledTime);
        if (dose.medication.frequencyType === FrequencyType.INTERVAL) {
            setSelectedDose(dose);
            setRecalcModalOpen(true);
        }
    }

    const handleRecalculate = (recalculate: boolean) => {
        if (recalculate && selectedDose) {
            const newFirstDoseTime = formatTime(new Date());
            updateMedication({
                ...selectedDose.medication,
                firstDoseTime: newFirstDoseTime,
            });
        }
        setRecalcModalOpen(false);
        setSelectedDose(null);
    }
    
    const scheduledDoses = todayDoses.filter(d => !d.isAsNeeded);
    const asNeededDoses = todayDoses.filter(d => d.isAsNeeded);

    return (
        <div className="space-y-6 pb-20">
            <div>
                <h1 className="text-2xl font-bold text-indigo-600">Hoje</h1>
                <p className="text-slate-500">{formatDate(new Date())}</p>
            </div>

            {scheduledDoses.length > 0 ? (
                 <div className="space-y-3">
                    {scheduledDoses.map((dose, index) => (
                        <DoseCard key={`${dose.medicationId}-${dose.scheduledTime}-${index}`} dose={dose} onTake={handleTakeDose} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 px-4 bg-white rounded-lg shadow-sm">
                    <PillIcon className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-4 text-slate-500">Nenhum medicamento agendado para hoje.</p>
                </div>
            )}
           
            {asNeededDoses.length > 0 && (
                 <div>
                    <h2 className="text-xl font-bold text-slate-700 mb-3">Uso Livre / Se Necessário</h2>
                    <div className="space-y-3">
                        {asNeededDoses.map((dose, index) => (
                             <DoseCard key={`${dose.medicationId}-${index}`} dose={dose} onTake={handleTakeDose} />
                        ))}
                    </div>
                </div>
            )}
            
            <Modal isOpen={recalcModalOpen} onClose={() => setRecalcModalOpen(false)} title="Recalcular Próxima Dose?">
                <p className="text-slate-600 mb-6">Você tomou o medicamento agora. Deseja recalcular o horário da próxima dose com base neste horário?</p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => handleRecalculate(false)} className="px-4 py-2 rounded-md text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors">Não, manter original</button>
                    <button onClick={() => handleRecalculate(true)} className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">Sim, recalcular</button>
                </div>
            </Modal>
        </div>
    );
};

const AddMedicationScreen: React.FC<{ setView: (view: View) => void; addMedication: (med: Omit<Medication, 'id'>) => void; }> = ({ setView, addMedication }) => {
    const [name, setName] = useState('');
    const [frequencyType, setFrequencyType] = useState<FrequencyType>(FrequencyType.FIXED_TIMES);
    const [fixedTimes, setFixedTimes] = useState<string[]>(['08:00']);
    const [intervalHours, setIntervalHours] = useState(8);
    const [firstDoseTime, setFirstDoseTime] = useState('08:00');
    const [startDate, setStartDate] = useState(getTodayDateString());
    const [endDate, setEndDate] = useState('');

    const handleAddTime = () => setFixedTimes([...fixedTimes, '14:00']);
    const handleRemoveTime = (index: number) => setFixedTimes(fixedTimes.filter((_, i) => i !== index));
    const handleTimeChange = (index: number, value: string) => {
        const newTimes = [...fixedTimes];
        newTimes[index] = value;
        setFixedTimes(newTimes);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            alert("Por favor, insira o nome do medicamento.");
            return;
        }

        const medicationData: Omit<Medication, 'id'> = {
            name,
            frequencyType,
            startDate,
            endDate: endDate || undefined,
        };

        if (frequencyType === FrequencyType.FIXED_TIMES) {
            medicationData.fixedTimes = fixedTimes;
        } else if (frequencyType === FrequencyType.INTERVAL) {
            medicationData.intervalHours = intervalHours;
            medicationData.firstDoseTime = firstDoseTime;
        }

        addMedication(medicationData);
        setView('home');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pb-20">
            <h1 className="text-2xl font-bold text-indigo-600">Novo Medicamento</h1>
            
            {/* Input fields */}
            <div className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Nome do Medicamento</label>
                    <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                    <label htmlFor="frequencyType" className="block text-sm font-medium text-slate-700 mb-1">Frequência</label>
                    <select id="frequencyType" value={frequencyType} onChange={e => setFrequencyType(e.target.value as FrequencyType)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                        {Object.values(FrequencyType).map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                
                {/* Conditional fields based on frequency */}
                {frequencyType === FrequencyType.FIXED_TIMES && (
                    <div className="p-4 bg-slate-50 rounded-md border border-slate-200 space-y-3">
                        <label className="block text-sm font-medium text-slate-700">Horários</label>
                        {fixedTimes.map((time, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input type="time" value={time} onChange={e => handleTimeChange(index, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" />
                                <button type="button" onClick={() => handleRemoveTime(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddTime} className="text-sm text-indigo-600 hover:underline">Adicionar horário</button>
                    </div>
                )}
                {frequencyType === FrequencyType.INTERVAL && (
                     <div className="p-4 bg-slate-50 rounded-md border border-slate-200 space-y-4">
                        <div>
                            <label htmlFor="intervalHours" className="block text-sm font-medium text-slate-700 mb-1">A cada</label>
                            <div className="flex items-center gap-2">
                                <input type="number" id="intervalHours" value={intervalHours} onChange={e => setIntervalHours(Number(e.target.value))} min="1" className="w-24 px-3 py-2 border border-slate-300 rounded-md shadow-sm" />
                                <span>horas</span>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="firstDoseTime" className="block text-sm font-medium text-slate-700 mb-1">Horário da primeira dose do dia</label>
                            <input type="time" id="firstDoseTime" value={firstDoseTime} onChange={e => setFirstDoseTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" />
                        </div>
                    </div>
                )}

                <div className="flex gap-4">
                    <div className="flex-1">
                        <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1">Data de Início</label>
                        <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" />
                    </div>
                    <div className="flex-1">
                        <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 mb-1">Data de Término (Opcional)</label>
                        <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm" />
                    </div>
                </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors shadow-lg">Salvar Medicamento</button>
        </form>
    );
};

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


//---------------------------------
// REUSABLE COMPONENTS
//---------------------------------
const DoseCard: React.FC<{ dose: Dose, onTake: (dose: Dose) => void }> = ({ dose, onTake }) => {
    return (
        <div className={`bg-white p-4 rounded-lg shadow-sm flex items-center justify-between transition-all ${dose.takenEntry ? 'bg-green-50' : ''}`}>
            <div className="flex items-center gap-4">
                {!dose.isAsNeeded && (
                    <div className="text-center">
                        <p className="text-lg font-bold text-indigo-600">{dose.scheduledTime}</p>
                    </div>
                )}
                <div>
                    <p className="font-bold text-slate-800">{dose.medicationName}</p>
                    {dose.takenEntry && (
                        <p className="text-sm text-green-700 flex items-center gap-1">
                            <CheckIcon className="w-4 h-4" />
                            Tomou às {formatTime(dose.takenEntry.takenAt)}
                        </p>
                    )}
                </div>
            </div>
            
            {!dose.takenEntry && (
                <button onClick={() => onTake(dose)} className="bg-indigo-600 text-white font-semibold py-2 px-5 rounded-full hover:bg-indigo-700 transition-colors shadow">
                    {dose.isAsNeeded ? 'Registrar' : 'Tomar'}
                </button>
            )}
        </div>
    );
};

const Header: React.FC = () => (
    <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto p-4 flex items-center gap-3">
            <PillIcon className="w-8 h-8 text-indigo-600"/>
            <h1 className="text-xl font-bold text-slate-800">Controle de Medicação</h1>
        </div>
    </header>
);

const Footer: React.FC<{ view: View, setView: (view: View) => void }> = ({ view, setView }) => {
    const navItems = [
        { id: 'home', icon: <ClockIcon />, label: 'Hoje' },
        { id: 'add', icon: <PlusIcon />, label: 'Adicionar' },
        { id: 'history', icon: <CalendarIcon />, label: 'Histórico' },
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
