import React from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';

interface WeaponEditorProps {
    code: string;
    onChange: (value: string | undefined) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    isPaused?: boolean;
}

/**
 * Code Editor component using Monaco Editor.
 * Allows the user to write Python code to control their weapon.
 */
export const WeaponEditor: React.FC<WeaponEditorProps> = ({ code, onChange, onFocus, onBlur, isPaused }) => {

    const handleEditorDidMount: OnMount = (editor) => {
        editor.onDidFocusEditorText(() => {
            onFocus?.();
        });
        editor.onDidBlurEditorText(() => {
            onBlur?.();
        });
    };

    return (
        <div className="h-full w-full bg-cyber-dark border-r border-cyber-muted flex flex-col">
            {/* Editor Header */}
            <div className="p-4 border-b border-cyber-muted flex justify-between items-center bg-cyber-light">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-cyber-accent">Weapon Systems</h2>
                    {isPaused && (
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                            ⏸ GAME PAUSED
                        </span>
                    )}
                </div>
                <div className="text-xs text-gray-400">PYTHON 3.11</div>
            </div>
            {/* Editor Container - takes remaining height */}
            <div className="flex-1 overflow-hidden">
                <Editor
                    height="100%"
                    defaultLanguage="python"
                    theme="vs-dark"
                    value={code}
                    onChange={onChange}
                    onMount={handleEditorDidMount}
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
