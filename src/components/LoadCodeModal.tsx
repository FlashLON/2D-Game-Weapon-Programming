import React, { useState } from 'react';
import { FolderOpen, X, Trash2 } from 'lucide-react';
import { type SavedCode } from '../utils/NetworkManager';

interface LoadCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    savedCodes: SavedCode[];
    onLoad: (code: string) => void;
    onDelete?: (codeId: string) => Promise<void>;
}

export const LoadCodeModal: React.FC<LoadCodeModalProps> = ({
    isOpen,
    onClose,
    savedCodes,
    onLoad,
    onDelete
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredCodes = savedCodes.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleLoad = (code: string) => {
        onLoad(code);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-gray-800 rounded-lg max-w-lg w-full mx-4 shadow-xl border border-gray-700 flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-cyber-accent" />
                        Load Weapon Code
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-700">
                    <input
                        type="text"
                        placeholder="Search codes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyber-accent"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredCodes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No saved codes found.
                        </div>
                    ) : (
                        filteredCodes.map(code => (
                            <div key={code.id} className="bg-gray-700/50 hover:bg-gray-700 border border-transparent hover:border-gray-500 rounded p-3 flex justify-between items-center group transition-all">
                                <div>
                                    <div className="font-bold text-white group-hover:text-cyber-accent transition-colors">{code.name}</div>
                                    <div className="text-xs text-gray-400">
                                        Last modified: {new Date(code.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleLoad(code.code)}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors"
                                    >
                                        Load
                                    </button>
                                    {onDelete && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Are you sure you want to delete this code?')) onDelete(code.id);
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
