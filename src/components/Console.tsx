import { useEffect, useRef } from 'react';
import { Terminal, Trash2, XCircle, AlertTriangle, Info } from 'lucide-react';

export type LogType = 'info' | 'error' | 'warning' | 'success';

export interface LogMessage {
    id: string;
    timestamp: number;
    message: string;
    type: LogType;
}

interface ConsoleProps {
    logs: LogMessage[];
    onClear: () => void;
    className?: string;
}

export function Console({ logs, onClear, className = '' }: ConsoleProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }); // .getMilliseconds() could be added if needed
    };

    const getIcon = (type: LogType) => {
        switch (type) {
            case 'error': return <XCircle size={14} className="text-cyber-danger mt-0.5" />;
            case 'warning': return <AlertTriangle size={14} className="text-cyber-warning mt-0.5" />;
            case 'success': return <Info size={14} className="text-cyber-accent mt-0.5" />;
            default: return <span className="w-3.5 h-3.5 mt-0.5 block opacity-50">&gt;</span>;
        }
    };

    const getColor = (type: LogType) => {
        switch (type) {
            case 'error': return 'text-cyber-danger';
            case 'warning': return 'text-cyber-warning';
            case 'success': return 'text-cyber-accent';
            default: return 'text-gray-300';
        }
    };

    return (
        <div className={`bg-cyber-dark border-t border-cyber-muted flex flex-col ${className}`}>
            {/* Header */}
            <div className="h-8 bg-cyber-light flex items-center justify-between px-3 border-b border-cyber-muted/50 select-none">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <Terminal size={14} />
                    <span>System Console</span>
                    <span className="bg-cyber-muted/30 px-1.5 py-0.5 rounded text-[10px] text-gray-500">
                        {logs.length}
                    </span>
                </div>
                <button
                    onClick={onClear}
                    className="p-1 hover:text-white text-gray-500 transition-colors"
                    title="Clear Console"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Logs Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 custom-scrollbar"
            >
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-cyber-muted italic opacity-50">
                        <span>No output</span>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className={`flex gap-2 items-start hover:bg-white/5 p-0.5 rounded px-1 group`}>
                            <span className="text-gray-600 select-none min-w-[60px] text-[10px] mt-0.5">
                                {formatTime(log.timestamp)}
                            </span>
                            <div className="shrink-0">
                                {getIcon(log.type)}
                            </div>
                            <span className={`break-all whitespace-pre-wrap ${getColor(log.type)} selection:bg-cyber-accent selection:text-black`}>
                                {log.message}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
