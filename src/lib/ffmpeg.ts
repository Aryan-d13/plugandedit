import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export const loadFfmpeg = async (): Promise<FFmpeg> => {
    if (ffmpeg) {
        return ffmpeg;
    }

    ffmpeg = new FFmpeg();

    // Set up logging
    ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg Log]', message);
    });

    // Fetch ffmpeg core from local public/ (same-origin, COEP-safe)
    // Convert to blob URLs so Vite doesn't intercept as module imports
    const toBlobURL = async (url: string, mimeType: string): Promise<string> => {
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        return URL.createObjectURL(new Blob([buf], { type: mimeType }));
    };

    await ffmpeg.load({
        coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
    });

    return ffmpeg;
};


export interface OverlayConfig {
    text: string;
    x: number;
    y: number;
}

export const trimVideo = async (
    file: File,
    startTime: number,
    endTime: number,
    overlays: OverlayConfig[],
    onProgress: (ratio: number) => void
): Promise<Blob> => {
    const fg = await loadFfmpeg();

    fg.on('progress', ({ progress }) => {
        onProgress(progress);
    });

    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    await fg.writeFile(inputName, await fetchFile(file));

    const args: string[] = [
        '-ss', startTime.toString(),
        '-to', endTime.toString(),
        '-i', inputName,
    ];

    if (overlays.length > 0) {
        // We need a font file for drawtext
        const fontUrl = 'https://raw.githubusercontent.com/ffmpegwasm/testdata/master/arial.ttf';
        try {
            await fg.writeFile('arial.ttf', await fetchFile(fontUrl));

            const filters = overlays.map(o => {
                const px = `(w*${o.x / 100})`;
                const py = `(h*${o.y / 100})`;
                // Escape text properly if needed, but keeping it simple for text overlays
                return `drawtext=fontfile=arial.ttf:text='${o.text}':x=${px}:y=${py}:fontsize=(h*0.05):fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2`;
            });

            args.push('-vf', filters.join(','));
            args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'copy');
        } catch (e) {
            console.warn("Failed to load font. Exporting without text.");
            args.push('-c', 'copy');
        }
    } else {
        args.push('-c', 'copy');
    }

    args.push(outputName);

    await fg.exec(args);

    const data = await fg.readFile(outputName);

    // Clean up
    await fg.deleteFile(inputName);
    await fg.deleteFile(outputName);

    return new Blob([data as any], { type: 'video/mp4' });
};
