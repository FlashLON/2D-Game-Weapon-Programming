import React from 'react';
import Editor from '@monaco-editor/react';

interface WeaponEditorProps {
    code: string;
    onChange: (value: string | undefined) => void;
}

/**
 * Code Editor component using Monaco Editor.
 * Allows the user to write Python code to control their weapon.
 */
export const WeaponEditor: React.FC<WeaponEditorProps> = ({ code, onChange }) => {
    return (
        <div className="h-full w-full bg-cyber-dark border-r border-cyber-muted flex flex-col">
            {/* Editor Header */}
            <div className="p-4 border-b border-cyber-muted flex justify-between items-center bg-cyber-light">
                <h2 className="text-xl font-bold text-cyber-accent">Weapon Systems</h2>
                <div className="text-xs text-gray-400">PYTHON 3.11</div>
            </div>
            {/* Editor Container - takes remaining height */}
            <div className="flex-1 overflow-hidden">
                <Editor
                    height="100%"
                    defaultLanguage="python"
                    theme="vs-dark" // We will customize this later or use default dark
                    value={code}
                    onChange={onChange}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: 'Fira Code',
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16 }
                    }}
                />
            </div>
        </div>
    );
};
