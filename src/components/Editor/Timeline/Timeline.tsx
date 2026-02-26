import React, { useRef, useState, useEffect } from 'react';
import './Timeline.css';

interface TimelineProps {
    duration: number;
    currentTime: number;
    onSeek: (time: number) => void;
    startTime: number;
    endTime: number;
    onTrimChange: (start: number, end: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({ duration, currentTime, onSeek, startTime, endTime, onTrimChange }) => {
    const trackRef = useRef<HTMLDivElement>(null);

    // Dragging states
    const [activeHandle, setActiveHandle] = useState<'left' | 'right' | 'scrub' | null>(null);

    useEffect(() => {
        // If duration loads and endTime is 0, initialize it
        if (duration > 0 && endTime === 0) {
            onTrimChange(0, duration);
        }
    }, [duration, endTime, onTrimChange]);

    const handlePointerDown = (e: React.PointerEvent, handle: 'left' | 'right' | 'scrub') => {
        e.stopPropagation();
        setActiveHandle(handle);
        e.currentTarget.setPointerCapture(e.pointerId);

        if (handle === 'scrub') {
            updateTimeFromEvent(e.clientX, handle);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (activeHandle) {
            updateTimeFromEvent(e.clientX, activeHandle);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (activeHandle) {
            setActiveHandle(null);
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    const updateTimeFromEvent = (clientX: number, handle: 'left' | 'right' | 'scrub') => {
        if (!trackRef.current || duration === 0) return;

        const rect = trackRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const time = percentage * duration;

        if (handle === 'scrub') {
            onSeek(time);
        } else if (handle === 'left') {
            // Prevent left handle passing right handle or 0
            const newStart = Math.min(Math.max(0, time), endTime - 0.1);
            onTrimChange(newStart, endTime);
            onSeek(newStart); // Auto scrub to trim start
        } else if (handle === 'right') {
            // Prevent right handle passing left handle or duration
            const newEnd = Math.max(Math.min(duration, time), startTime + 0.1);
            onTrimChange(startTime, newEnd);
            onSeek(newEnd); // Auto scrub to trim end
        }
    };

    // Safe percentages
    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    const startPercentage = duration > 0 ? (startTime / duration) * 100 : 0;
    const endPercentage = duration > 0 ? (endTime / duration) * 100 : 100;
    const segmentWidth = endPercentage - startPercentage;

    return (
        <div className="timeline-container">
            <div className="timeline-toolbar">
                <span className="track-label">Video Track 1</span>
                <div className="trim-info">
                    <span>In: {formatTime(startTime)}</span>
                    <span>Out: {formatTime(endTime)}</span>
                </div>
            </div>

            <div
                className="timeline-tracks-area"
                onPointerDown={(e) => handlePointerDown(e, 'scrub')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* Playhead Marker */}
                <div
                    className="playhead"
                    style={{ left: `${progressPercentage}%` }}
                >
                    <div className="playhead-line" />
                    <div className="playhead-handle" />
                </div>

                {/* Tracks List */}
                <div className="tracks">
                    <div className="track-row" ref={trackRef}>

                        {/* Trimmed Out Sections (Darkened) */}
                        <div className="trimmed-mask left" style={{ width: `${startPercentage}%` }} />
                        <div className="trimmed-mask right" style={{ width: `${100 - endPercentage}%`, left: `${endPercentage}%` }} />

                        <div
                            className="track-segment"
                            style={{ width: `${segmentWidth}%`, left: `${startPercentage}%` }}
                        >
                            <div
                                className="segment-handle left"
                                onPointerDown={(e) => handlePointerDown(e, 'left')}
                            />
                            <div className="segment-content">
                                <div className="waveform-placeholder" />
                            </div>
                            <div
                                className="segment-handle right"
                                onPointerDown={(e) => handlePointerDown(e, 'right')}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function formatTime(seconds: number): string {
    if (isNaN(seconds)) return '00:00.0';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

export default Timeline;
