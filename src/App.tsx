import { useState, useEffect } from 'react';
import './index.css';
import UploadZone from './components/Upload/UploadZone';
import Editor from './components/Editor/Editor';

function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Auto-load from ?video=URL (used when opened from Seone-Frontend drag-to-edit)
  // Also accepts ?proxy=BASE to specify the proxy origin for production.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoUrl = params.get('video');
    if (!videoUrl) return;

    // Build a same-origin proxy URL so COEP (require-corp) doesn't block.
    //
    // DEV:  localhost backend → Vite proxy rewrites /api-data/* → localhost:8000/*
    // PROD: GCS signed URL    → use ?proxy=https://seone.example.com to route
    //       through Seone's /api/proxy-media?url=<signed-url>
    //       If plug&edit is on the SAME origin as Seone, it can hit the proxy directly.
    let proxyUrl: string;
    const proxyBase = params.get('proxy'); // e.g. "https://seone.example.com"

    if (proxyBase) {
      // Production: use Seone's server-side proxy
      proxyUrl = `${proxyBase}/api/proxy-media?url=${encodeURIComponent(videoUrl)}`;
    } else {
      // Dev: use Vite's built-in path proxy
      try {
        const parsed = new URL(videoUrl);
        proxyUrl = `/api-data${parsed.pathname}`;
      } catch {
        proxyUrl = `/api-data/${videoUrl.replace(/^\/+/, '')}`;
      }
    }

    console.log('[Plug&Edit] ▶ Auto-load via XHR');
    console.log('[Plug&Edit]   Video URL:', videoUrl);
    console.log('[Plug&Edit]   Proxy URL:', proxyUrl);

    setIsLoadingRemote(true);
    setLoadError(null);

    const xhr = new XMLHttpRequest();
    xhr.open('GET', proxyUrl, true);
    xhr.responseType = 'arraybuffer';

    xhr.onprogress = (e) => {
      const mb = (e.loaded / 1024 / 1024).toFixed(1);
      const total = e.lengthComputable ? `/ ${(e.total / 1024 / 1024).toFixed(1)} MB` : '(chunked)';
      console.log(`[Plug&Edit] ⏳ Progress: ${mb} MB ${total}`);
    };

    xhr.onload = () => {
      console.log('[Plug&Edit] 📥 XHR complete:', xhr.status, xhr.statusText);
      console.log('[Plug&Edit]   Response size:', (xhr.response.byteLength / 1024 / 1024).toFixed(2), 'MB');

      if (xhr.status !== 200) {
        setLoadError(`Server returned ${xhr.status}`);
        setIsLoadingRemote(false);
        return;
      }

      let name = 'clip.mp4';
      try {
        name = new URL(videoUrl).pathname.split('/').pop() || 'clip.mp4';
      } catch { /* use default */ }

      const blob = new Blob([xhr.response], { type: 'video/mp4' });
      const file = new File([blob], name, { type: 'video/mp4' });
      console.log('[Plug&Edit] ✅ File created:', file.name, file.size, 'bytes');
      setVideoFile(file);
      setIsLoadingRemote(false);
    };

    xhr.onerror = () => {
      console.error('[Plug&Edit] ❌ XHR network error');
      console.error('[Plug&Edit]   Status:', xhr.status);
      console.error('[Plug&Edit]   readyState:', xhr.readyState);
      setLoadError('Network error loading video');
      setIsLoadingRemote(false);
    };

    xhr.ontimeout = () => {
      console.error('[Plug&Edit] ❌ XHR timeout');
      setLoadError('Video download timed out');
      setIsLoadingRemote(false);
    };

    xhr.send();

    return () => { xhr.abort(); };
  }, []);

  const handleVideoUpload = (file: File) => {
    setVideoFile(file);
  };

  const handleReset = () => {
    setVideoFile(null);
    setLoadError(null);
    // Clear the URL param so the upload screen works normally after reset
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <div className="app-container">
      {isLoadingRemote ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '16px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-sans)',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span>Loading clip…</span>
        </div>
      ) : loadError ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '16px',
          color: 'var(--color-accent)',
          fontFamily: 'var(--font-sans)',
        }}>
          <span>{loadError}</span>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 20px',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
          >
            Upload manually
          </button>
        </div>
      ) : !videoFile ? (
        <UploadZone onUpload={handleVideoUpload} />
      ) : (
        <Editor file={videoFile} onReset={handleReset} />
      )}
    </div>
  );
}

export default App;
