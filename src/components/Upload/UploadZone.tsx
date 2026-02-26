import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Video, UploadCloud, FileWarning } from 'lucide-react';
import './UploadZone.css';

interface UploadZoneProps {
    onUpload: (file: File) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUpload }) => {
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
        setError(null);
        if (rejectedFiles.length > 0) {
            setError('Please upload a valid video file (MP4, WebM, MOV).');
            return;
        }
        if (acceptedFiles.length > 0) {
            onUpload(acceptedFiles[0]);
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/mp4': ['.mp4'],
            'video/webm': ['.webm'],
            'video/quicktime': ['.mov']
        },
        maxFiles: 1
    });

    return (
        <div className="upload-screen">
            <motion.div
                className="brand-hero"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
                <h1>Plug & Edit.</h1>
                <p>Zero friction video tuning. Drop a file to start.</p>
            </motion.div>

            <motion.div
                {...getRootProps()}
                className={`upload-dropzone ${isDragActive ? 'active' : ''} ${error ? 'error' : ''}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <input {...getInputProps()} />
                <div className="upload-content">
                    {isDragActive ? (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="drop-indicator"
                        >
                            <Video size={48} />
                            <h2>Release to drop</h2>
                        </motion.div>
                    ) : (
                        <>
                            <div className="icon-wrapper">
                                {error ? <FileWarning size={32} /> : <UploadCloud size={32} />}
                            </div>
                            <h2>{error ? 'Invalid file format' : 'Drag video here'}</h2>
                            <p className="subtitle">{error || 'Or click to browse from your device'}</p>

                            <div className="format-badges">
                                <span>MP4</span>
                                <span>WEBM</span>
                                <span>MOV</span>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default UploadZone;
