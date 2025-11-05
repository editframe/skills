import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type { MetaFunction } from 'react-router';
import { useExternalScript } from '~/hooks/useExternalScript';
import type { Route } from './+types/jit-preview';

export const meta: MetaFunction = () => {
  return [{ title: "JIT Video Preview | Editframe" }];
};

// Type definitions for HLS and DASH libraries (scoped to this component)
interface HlsPlayer {
  destroy: () => void;
  loadSource: (url: string) => void;
  attachMedia: (video: HTMLVideoElement) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
}

interface DashPlayer {
  reset: () => void;
  initialize: (video: HTMLVideoElement, url: string, autoplay: boolean) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
}

// Extend Window interface for this component only
declare global {
  interface Window {
    Hls?: {
      isSupported: () => boolean;
      new: (config?: any) => HlsPlayer;
      Events: {
        MANIFEST_PARSED: string;
        ERROR: string;
        LEVEL_SWITCHED: string;
      };
    };
    dashjs?: {
      MediaPlayer: () => {
        create: () => DashPlayer;
      };
    };
  }
}

export default function JitPreview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [urlInput, setUrlInput] = useState('');
  const [hlsStats, setHlsStats] = useState('Ready to load...');
  const [dashStats, setDashStats] = useState('Ready to load...');

  const hlsVideoRef = useRef<HTMLVideoElement>(null);
  const dashVideoRef = useRef<HTMLVideoElement>(null);
  const hlsPlayerRef = useRef<HlsPlayer | null>(null);
  const dashPlayerRef = useRef<DashPlayer | null>(null);

  const hlsLoader = useExternalScript('https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js');
  const dashLoader = useExternalScript('https://cdn.dashjs.org/latest/dash.all.min.js');

  const currentUrl = searchParams.get('url') || '';

  useEffect(() => {
    setUrlInput(currentUrl);
  }, [currentUrl]);

  // Handle loading and error states
  if (hlsLoader.error || dashLoader.error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">🎬 JIT Video Preview: HLS vs DASH</h1>
            <div className="bg-red-50 p-4 rounded-md max-w-md mx-auto">
              <div className="text-red-700 text-sm">
                <p className="font-medium">Failed to load video libraries</p>
                <p className="mt-1">{hlsLoader.error || dashLoader.error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hlsLoader.loaded || !dashLoader.loaded) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">🎬 JIT Video Preview: HLS vs DASH</h1>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              <p className="text-gray-600">Loading video libraries...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      setSearchParams({ url: urlInput.trim() });
    }
  };

  const loadHls = () => {
    if (!hlsVideoRef.current) return;

    const video = hlsVideoRef.current;
    const hlsManifestUrl = `/api/v1/transcode/manifest.m3u8?url=${encodeURIComponent(currentUrl)}`;

    if (window.Hls?.isSupported()) {
      if (hlsPlayerRef.current) {
        hlsPlayerRef.current.destroy();
      }

      hlsPlayerRef.current = new (window.Hls as any)({
        debug: false,
        enableWorker: true
      });

      hlsPlayerRef.current!.loadSource(hlsManifestUrl);
      hlsPlayerRef.current!.attachMedia(video);

      hlsPlayerRef.current!.on('hlsManifestParsed', () => {
        setHlsStats('HLS manifest loaded');
        console.log('HLS: Manifest parsed');
      });

      hlsPlayerRef.current!.on('hlsError', (event: any, data: any) => {
        console.error('HLS Error:', data);
        setHlsStats(`HLS Error: ${data.details}`);
      });

      hlsPlayerRef.current!.on('hlsLevelSwitched', (event: any, data: any) => {
        console.log('HLS: Level switched to', data.level);
        setHlsStats(`HLS: Quality level ${data.level}`);
      });

      setHlsStats('HLS manifest loading...');
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsManifestUrl;
      setHlsStats('Using native HLS support');
    } else {
      setHlsStats('HLS not supported in this browser');
    }
  };

  const loadDash = () => {
    if (!dashVideoRef.current) return;

    const video = dashVideoRef.current;
    const dashManifestUrl = `/api/v1/transcode/manifest.mpd?url=${encodeURIComponent(currentUrl)}`;

    if (dashPlayerRef.current) {
      dashPlayerRef.current.reset();
    }

    if (!window.dashjs) {
      setDashStats('DASH library not available');
      return;
    }

    dashPlayerRef.current = window.dashjs.MediaPlayer().create();

    dashPlayerRef.current.on('streamInitialized', () => {
      setDashStats('DASH stream initialized');
      console.log('DASH: Stream initialized');
    });

    dashPlayerRef.current.on('error', (e: any) => {
      console.error('DASH Error:', e);
      setDashStats(`DASH Error: ${e.error?.message || 'Unknown error'}`);
    });

    dashPlayerRef.current.on('qualityChangeRendered', (e: any) => {
      console.log('DASH: Quality changed to', e.newQuality);
      setDashStats(`DASH: Quality level ${e.newQuality}`);
    });

    dashPlayerRef.current.initialize(video, dashManifestUrl, false);
    setDashStats('DASH manifest loading...');
  };

  const dashManifestUrl = currentUrl
    ? `/api/v1/transcode/manifest.mpd?url=${encodeURIComponent(currentUrl)}`
    : '';

  const hlsManifestUrl = currentUrl
    ? `/api/v1/transcode/manifest.m3u8?url=${encodeURIComponent(currentUrl)}`
    : '';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">🎬 JIT Video Preview: Custom vs HLS vs DASH</h1>

          <form onSubmit={handleUrlSubmit} className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter video URL..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Load
              </button>
            </div>
          </form>

          {currentUrl && (
            <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm font-mono text-gray-700 break-all">
              <strong>Source:</strong> {currentUrl}
            </div>
          )}
        </div>

        {currentUrl && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* HLS Player */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-blue-600 mb-4">📺 HLS Player (hls.js)</h2>

              <video
                ref={hlsVideoRef}
                className="w-full h-auto rounded-md bg-black"
                controls
                preload="none"
              >
                <p>Your browser does not support HTML5 video.</p>
              </video>

              <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600 font-mono break-all">
                <strong>Manifest:</strong> {hlsManifestUrl}
              </div>

              <div className="mt-2 text-xs text-gray-600">
                {hlsStats}
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  onClick={loadHls}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Load HLS
                </button>
                <button
                  onClick={() => hlsVideoRef.current?.play()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Play
                </button>
                <button
                  onClick={() => hlsVideoRef.current?.pause()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Pause
                </button>
              </div>
            </div>

            {/* DASH Player */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-green-600 mb-4">📺 DASH Player (dash.js)</h2>

              <video
                ref={dashVideoRef}
                className="w-full h-auto rounded-md bg-black"
                controls
                preload="none"
              >
                <p>Your browser does not support HTML5 video.</p>
              </video>

              <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600 font-mono break-all">
                <strong>Manifest:</strong> {dashManifestUrl}
              </div>

              <div className="mt-2 text-xs text-gray-600">
                {dashStats}
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  onClick={loadDash}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Load DASH
                </button>
                <button
                  onClick={() => dashVideoRef.current?.play()}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Play
                </button>
                <button
                  onClick={() => dashVideoRef.current?.pause()}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Pause
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 