import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Play, Pause, Scissors, Type, Loader } from 'lucide-react';
import './Editor.css';
import Timeline from './Timeline/Timeline';
import { trimVideo } from '../../lib/ffmpeg';

interface EditorProps {
    file: File;
    onReset: () => void;
}

export interface TextOverlay {
    id: string;
    text: string;
    x: number;
    y: number;
    start: number;
    end: number;
}

const Editor: React.FC<EditorProps> = ({ file, onReset }) => {
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const [activeTool, setActiveTool] = useState<'trim' | 'text'>('trim');

    // Trim state
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);

    // Text overlays
    const [overlays, setOverlays] = useState<TextOverlay[]>([]);
    const [editingOverlay, setEditingOverlay] = useState<string | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const togglePlayback = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime;
            setCurrentTime(time);
            if (endTime > 0 && time >= endTime) {
                videoRef.current.pause();
                setIsPlaying(false);
                videoRef.current.currentTime = startTime;
                setCurrentTime(startTime);
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const dur = videoRef.current.duration;
            setDuration(dur);
            setEndTime(dur);
        }
    };

    const handleSeek = (time: number) => {
        if (videoRef.current && isFinite(time)) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleTrimChange = (start: number, end: number) => {
        setStartTime(start);
        setEndTime(end);
    };

    const handleAddText = () => {
        setActiveTool('text');
        const newOverlay: TextOverlay = {
            id: Math.random().toString(36).substr(2, 9),
            text: 'Double click to edit',
            x: 50,
            y: 50,
            start: currentTime,
            end: Math.min(currentTime + 5, endTime)
        };
        setOverlays([...overlays, newOverlay]);
    };

    const handleExport = async () => {
        setIsProcessing(true);
        setProgress(0);
        try {
            const activeOverlays = overlays.map(o => ({
                text: o.text,
                x: o.x,
                y: o.y,
            }));

            const blob = await trimVideo(file, startTime, endTime, activeOverlays, (p) => {
                setProgress(Math.round(p * 100));
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `edited_${file.name}`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
        } catch (e) {
            console.error(e);
            alert('Failed to export video.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <motion.div className="editor-layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <header className="editor-header">
                <div className="header-left">
                    <button className="icon-button" onClick={onReset} aria-label="Back"><ArrowLeft size={20} /></button>
                    <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="badge">DRAFT</span>
                    </div>
                </div>

                <div className="header-center">
                    <button className={`tool-button ${activeTool === 'trim' ? 'active' : ''}`} onClick={() => setActiveTool('trim')}><Scissors size={18} /> Trim</button>
                    <button className={`tool-button ${activeTool === 'text' ? 'active' : ''}`} onClick={handleAddText}><Type size={18} /> Text</button>
                </div>

                <div className="header-right">
                    <button className="action-button primary" onClick={handleExport} disabled={isProcessing}>
                        {isProcessing ? (<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Loader className="spin" size={18} /><span>{progress}%</span></div>) : (<><Download size={18} /><span>Export</span></>)}
                    </button>
                </div>
            </header>

            <main className="editor-main">
                <div className="player-container">
                    <div className="video-wrapper" ref={playerContainerRef}>
                        <video ref={videoRef} src={videoUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} onClick={togglePlayback} />

                        {/* Text Overlays */}
                        {overlays.map(overlay => (
                            currentTime >= overlay.start && currentTime <= overlay.end && (
                                <div key={overlay.id} className="text-overlay-item" style={{ left: `${overlay.x}%`, top: `${overlay.y}%`, position: 'absolute', transform: 'translate(-50%, -50%)', cursor: 'move', color: 'white', fontSize: '24px', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                                    onDoubleClick={(e) => { e.stopPropagation(); setEditingOverlay(overlay.id); }}
                                    draggable
                                    onDragEnd={(e) => {
                                        if (!playerContainerRef.current) return;
                                        const rect = playerContainerRef.current.getBoundingClientRect();
                                        const newX = ((e.clientX - rect.left) / rect.width) * 100;
                                        const newY = ((e.clientY - rect.top) / rect.height) * 100;
                                        setOverlays(overlays.map(o => o.id === overlay.id ? { ...o, x: Math.max(0, Math.min(100, newX)), y: Math.max(0, Math.min(100, newY)) } : o));
                                    }}>
                                    {editingOverlay === overlay.id ? (
                                        <input autoFocus defaultValue={overlay.text}
                                            style={{ background: 'transparent', color: 'white', fontSize: 'inherit', fontWeight: 'inherit', border: '1px dashed white', outline: 'none', textAlign: 'center' }}
                                            onBlur={(e) => {
                                                setEditingOverlay(null);
                                                setOverlays(overlays.map(o => o.id === overlay.id ? { ...o, text: e.target.value } : o));
                                            }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                        />
                                    ) : (
                                        <span>{overlay.text}</span>
                                    )}
                                </div>
                            )
                        ))}
                    </div>
                    <div className="player-controls">
                        <button className="play-button" onClick={togglePlayback}>
                            {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '4px' }} />}
                        </button>
                        <div className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</div>
                    </div>
                </div>
            </main>

            <footer className="editor-footer">
                <Timeline duration={duration} currentTime={currentTime} onSeek={handleSeek} startTime={startTime} endTime={endTime} onTrimChange={handleTrimChange} />
            </footer>
        </motion.div>
    );
};

function formatTime(seconds: number): string {
    if (isNaN(seconds)) return '00:00.00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export default Editor;
