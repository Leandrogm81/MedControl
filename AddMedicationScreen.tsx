
import React, { useState } from 'react';
import { Medication, FrequencyType } from './types';
import { getTodayDateString } from './utils/time';
import { TrashIcon } from './components/icons';

type View = 'home' | 'add' | 'history' | 'settings';

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

export default AddMedicationScreen;
