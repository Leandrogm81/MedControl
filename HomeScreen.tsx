
import React, { useState, useMemo } from 'react';
import { useMedications } from './hooks/useMedications';
import { FrequencyType, Dose } from './types';
import { CheckIcon, PillIcon } from './components/icons';
import { formatTime, formatDate } from './utils/time';
import Modal from './components/Modal';

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

export default HomeScreen;
