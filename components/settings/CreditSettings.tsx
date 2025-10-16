import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AppSettings } from '../../types';
import { getAppSettings, updateAppSettings } from '../../services/databaseService';
import { useToast } from '../../hooks/useToast';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const NumberInput: React.FC<{ label: string; value: number; onChange: (value: number) => void; description?: string, isCurrency?: boolean }> = ({ label, value, onChange, description, isCurrency }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        {description && <p className="text-xs text-gray-500 mb-1">{description}</p>}
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(isCurrency ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md"
            min="0"
            step={isCurrency ? "0.01" : "1"}
        />
    </div>
);

export const CreditSystemSettings: React.FC = () => {
    const { supabase } = useAuth();
    const { addToast } = useToast();
    const [settings, setSettings] = useState<Partial<AppSettings>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const data = await getAppSettings(supabase);
                setSettings(data);
            } catch (error) {
                addToast("Failed to load credit settings.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [supabase, addToast]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            const { id, updated_at, ...updates } = settings;
            await updateAppSettings(supabase, updates);
            setSaveSuccess(true);
            addToast("Credit settings updated successfully!", "success");
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            addToast("Failed to save settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSettingChange = (key: keyof AppSettings, value: number) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (isLoading) {
        return <div className="text-center text-gray-400">Loading settings...</div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Daily Credit Allowances</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <NumberInput label="Standard (NA)" value={settings.daily_credits_na ?? 0} onChange={v => handleSettingChange('daily_credits_na', v)} />
                    <NumberInput label="Pro" value={settings.daily_credits_pro ?? 0} onChange={v => handleSettingChange('daily_credits_pro', v)} />
                    <NumberInput label="Max" value={settings.daily_credits_max ?? 0} onChange={v => handleSettingChange('daily_credits_max', v)} />
                    <NumberInput label="Admin" value={settings.daily_credits_admin ?? 0} onChange={v => handleSettingChange('daily_credits_admin', v)} />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Store & Costs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NumberInput label="Cost per 100 Credits" description="Price in USD for a pack of 100 credits." value={settings.cost_per_100_credits ?? 0} onChange={v => handleSettingChange('cost_per_100_credits', v)} isCurrency />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Model Usage Costs (per generation)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <NumberInput label="Image (Nano Banana)" value={settings.cost_image_nano_banana ?? 0} onChange={v => handleSettingChange('cost_image_nano_banana', v)} />
                    <NumberInput label="Image (Imagen 2)" value={settings.cost_image_imagen_2 ?? 0} onChange={v => handleSettingChange('cost_image_imagen_2', v)} />
                    <NumberInput label="Image (Imagen 3)" value={settings.cost_image_imagen_3 ?? 0} onChange={v => handleSettingChange('cost_image_imagen_3', v)} />
                    <NumberInput label="Chat (Gemini 1.5 Flash)" value={settings.cost_chat_gemini_1_5_flash ?? 0} onChange={v => handleSettingChange('cost_chat_gemini_1_5_flash', v)} />
                    <NumberInput label="Chat (Gemini 2.5 Flash)" value={settings.cost_chat_gemini_2_5_flash ?? 0} onChange={v => handleSettingChange('cost_chat_gemini_2_5_flash', v)} />
                </div>
            </div>
            
             <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving || saveSuccess}
                    className="px-6 h-[42px] bg-primary-start text-white rounded-md font-semibold text-sm hover:bg-primary-start/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-32 flex items-center justify-center"
                >
                    {isSaving ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    : saveSuccess ? <CheckCircleIcon className="h-6 w-6 text-white" />
                    : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};
