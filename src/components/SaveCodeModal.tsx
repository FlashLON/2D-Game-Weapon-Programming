import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';

interface SaveCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (codeName: string) => Promise<void>;
}

export const SaveCodeModal: React.FC<SaveCodeModalProps> = ({
    isOpen,
    onClose,
    onSave
}) => {
    const [codeName, setCodeName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Generate default name if modal opens
        if (isOpen && !codeName) {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setCodeName(`Weapon ${timestamp}`);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!codeName.trim()) {
            setError('Code name cannot be empty');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(codeName.trim());
            setCodeName('');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save code');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setCodeName('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        Save Code
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-white transition-colors"
                        disabled={isSaving}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Code Name
                        </label>
                        <input
                            type="text"
                            value={codeName}
                            onChange={(e) => setCodeName(e.target.value)}
                            placeholder="e.g., Custom Weapon v1"
                            className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-400 focus:outline-none transition-colors"
                            maxLength={100}
                            disabled={isSaving}
                            autoFocus
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            {codeName.length}/100 characters
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-900 bg-opacity-50 text-red-200 px-3 py-2 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button
                            type="submit"
                            disabled={isSaving || !codeName.trim()}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 rounded transition-colors flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Code
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSaving}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 rounded transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
