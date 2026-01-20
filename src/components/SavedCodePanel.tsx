import React, { useState } from 'react';
import { Download, Trash2, Edit2, Code } from 'lucide-react';
import type { SavedCode } from '../utils/NetworkManager';

interface SavedCodePanelProps {
    savedCodes: SavedCode[];
    onLoad: (code: SavedCode) => void;
    onDelete: (codeId: string) => void;
    onRename: (codeId: string, newName: string) => void;
    isLoading?: boolean;
}

export const SavedCodePanel: React.FC<SavedCodePanelProps> = ({
    savedCodes,
    onLoad,
    onDelete,
    onRename,
    isLoading = false
}) => {
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');

    const handleRenameClick = (code: SavedCode) => {
        setRenamingId(code.id);
        setNewName(code.name);
    };

    const handleRenameSubmit = (codeId: string) => {
        if (newName.trim()) {
            onRename(codeId, newName.trim());
            setRenamingId(null);
            setNewName('');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-bold text-white">SAVED CODE ({savedCodes.length})</h2>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-gray-400">Loading saved codes...</p>
                    </div>
                </div>
            ) : savedCodes.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-6 text-center">
                    <Code className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-400">No saved codes yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Write a weapon script and click "Save Code" to store it.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {savedCodes.map((code) => (
                        <div
                            key={code.id}
                            className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    {renamingId === code.id ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm border border-blue-400 focus:outline-none"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRenameSubmit(code.id);
                                                    if (e.key === 'Escape') {
                                                        setRenamingId(null);
                                                        setNewName('');
                                                    }
                                                }}
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleRenameSubmit(code.id)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setRenamingId(null);
                                                    setNewName('');
                                                }}
                                                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="font-semibold text-white truncate">{code.name}</h3>
                                            <div className="flex gap-4 text-xs text-gray-400 mt-1">
                                                <span>Created: {formatDate(code.createdAt)}</span>
                                                <span>Updated: {formatDate(code.updatedAt)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {renamingId !== code.id && (
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => onLoad(code)}
                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded flex items-center gap-1 transition-colors text-sm"
                                            title="Load code into editor"
                                        >
                                            <Download className="w-4 h-4" />
                                            Load
                                        </button>
                                        <button
                                            onClick={() => handleRenameClick(code)}
                                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded flex items-center gap-1 transition-colors text-sm"
                                            title="Rename code"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`Delete "${code.name}"?`)) {
                                                    onDelete(code.id);
                                                }
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded flex items-center gap-1 transition-colors text-sm"
                                            title="Delete code"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
