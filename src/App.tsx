import React, { useState, useEffect, useRef } from 'react';
import { Camera, Play, Video, Key, Calendar, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { EZUIKitPlayer } from 'ezuikit-js';

// Add global type definition for EZUIKit
declare global {
  interface Window {
    EZUIKit: any;
  }
}

const App: React.FC = () => {
  // Config State
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [serial, setSerial] = useState('');
  const [channel, setChannel] = useState('1');
  const [mode, setMode] = useState<'live' | 'rec'>('live');
  const [playbackTime, setPlaybackTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"));
  const [playbackEndTime, setPlaybackEndTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"));
  const [recType, setRecType] = useState<'local' | 'cloud'>('local');
  const [region, setRegion] = useState('https://isgpopen.ezvizlife.com');

  // App State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlayerActive, setIsPlayerActive] = useState(false);

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch token if AppKey/Secret are provided
  const fetchToken = async () => {
    if (!appKey || !appSecret) {
      setError("Please provide both AppKey and AppSecret");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${region}/api/lapp/token/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `appKey=${appKey}&appSecret=${appSecret}`,
      });

      const data = await response.json();

      if (data.code === '200') {
        setAccessToken(data.data.accessToken);
      } else {
        setError(data.msg || "Failed to fetch token");
      }
    } catch (err) {
      setError("Network error while fetching token");
    } finally {
      setIsLoading(false);
    }
  };

  const startStream = () => {
    if (!accessToken || !serial) {
      setError("AccessToken and Serial Number are required");
      return;
    }

    setIsLoading(true);
    setError(null);

    // Destroy existing player if any
    if (playerRef.current) {
      try {
        playerRef.current.stop();
      } catch (e) { }
    }

    const cleanSerial = serial.trim().toUpperCase();
    const domain = region === 'https://open.ys7.com' ? 'open.ys7.com' : 'open.ezviz.com';
    const recSuffix = recType === 'cloud' ? '.cloud.rec' : '.rec';
    
    // Convert '2026-05-13T00:00:00' to '20260513000000'
    const startFormatted = playbackTime.replace(/[-T:]/g, '');
    const endFormatted = playbackEndTime.replace(/[-T:]/g, '');

    const url = mode === 'live'
      ? `ezopen://${domain}/${cleanSerial}/${channel}.live`
      : `ezopen://${domain}/${cleanSerial}/${channel}${recSuffix}?begin=${startFormatted}&end=${endFormatted}`;

    try {
      playerRef.current = new EZUIKitPlayer({
        id: 'video-container',
        accessToken: accessToken,
        url: url,
        template: mode === 'live' ? 'pcLive' : 'pcRec',
        width: containerRef.current?.clientWidth || 800,
        height: containerRef.current?.clientHeight || 450,
        autoplay: true,
        staticPath: '/ezuikit_static',
        ...(region !== 'https://open.ys7.com' ? { env: { domain: region } } : {}),
        handleError: (err: any) => {
          console.error("EZUIKit Error:", err);
          setError("Player error: " + JSON.stringify(err));
          setIsLoading(false);
        },
        handleSuccess: () => {
          setIsPlayerActive(true);
          setIsLoading(false);
        }
      });
    } catch (err) {
      setError("Initialization error: " + err);
      setIsLoading(false);
    }
  };

  const stopStream = () => {
    if (playerRef.current) {
      playerRef.current.stop();
      setIsPlayerActive(false);
    }
  };

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="app-container">
      <header>
        <div className="logo">EZVIZ PRO STREAM</div>
        <div className="status-badge">
          <Info size={14} />
          SDK v5.1.18 Ready
        </div>
      </header>

      <main>
        <aside className="panel">
          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === 'live' ? 'active' : ''}`}
              onClick={() => setMode('live')}
            >
              <Video size={16} style={{ marginBottom: -3, marginRight: 6 }} />
              Live Stream
            </button>
            <button
              className={`mode-btn ${mode === 'rec' ? 'active' : ''}`}
              onClick={() => setMode('rec')}
            >
              <Play size={16} style={{ marginBottom: -3, marginRight: 6 }} />
              Playback
            </button>
          </div>

          <div className="input-group">
            <label><Key size={14} style={{ marginBottom: -2, marginRight: 4 }} /> Access Token</label>
            <input
              type="password"
              placeholder="Paste your accessToken here"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Server Region</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="https://isgpopen.ezvizlife.com">Asia/Singapore</option>
              <option value="https://iusopen.ezvizlife.com">North America</option>
              <option value="https://isaopen.ezvizlife.com">South America</option>
              <option value="https://ieuopen.ezvizlife.com">Europe</option>
              <option value="https://iindiaopen.ezvizlife.com">India</option>
              <option value="https://open.ys7.com">China (ys7.com)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label><RefreshCw size={14} style={{ marginBottom: -2, marginRight: 4 }} /> AppKey (Optional)</label>
              <input
                type="text"
                placeholder="Key"
                value={appKey}
                onChange={(e) => setAppKey(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>AppSecret</label>
              <input
                type="password"
                placeholder="Secret"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
              />
            </div>
          </div>

          <button className="btn btn-secondary" onClick={fetchToken} style={{ marginBottom: '1.5rem' }}>
            Fetch Token from API
          </button>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: '1.5rem' }} />

          <div className="input-group">
            <label><Camera size={14} style={{ marginBottom: -2, marginRight: 4 }} /> Device Serial</label>
            <input
              type="text"
              placeholder="e.g. C12345678"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Channel Number</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {mode === 'rec' && (
            <>
              <div className="input-group">
                <label>Storage Type</label>
                <select value={recType} onChange={(e) => setRecType(e.target.value as 'local' | 'cloud')}>
                  <option value="local">SD Card (Local)</option>
                  <option value="cloud">Cloud Storage</option>
                </select>
              </div>
              <div className="input-group">
                <label><Calendar size={14} style={{ marginBottom: -2, marginRight: 4 }} /> Start Time</label>
                <input
                  type="datetime-local"
                  step="1"
                  value={playbackTime}
                  onChange={(e) => setPlaybackTime(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label><Calendar size={14} style={{ marginBottom: -2, marginRight: 4 }} /> End Time</label>
                <input
                  type="datetime-local"
                  step="1"
                  value={playbackEndTime}
                  onChange={(e) => setPlaybackEndTime(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="controls-grid">
            <button className="btn btn-primary" onClick={startStream}>
              {isPlayerActive ? <RefreshCw size={18} /> : <Play size={18} />}
              {isPlayerActive ? 'Restart' : 'Start Player'}
            </button>
            <button className="btn btn-secondary" onClick={stopStream}>
              Stop
            </button>
          </div>

          {error && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.875rem', display: 'flex', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </aside>

        <section className="video-section">
          <div id="video-container" ref={containerRef}>
            {isLoading && (
              <div className="loading-overlay">
                <div className="spinner"></div>
                <p>Initializing EZVIZ Player...</p>
              </div>
            )}
            {!isPlayerActive && !isLoading && (
              <div className="loading-overlay" style={{ background: '#000' }}>
                <Video size={48} color="var(--border)" />
                <p style={{ color: 'var(--text-muted)' }}>Ready to stream</p>
              </div>
            )}
          </div>

          <div className="panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>DEVICE</span>
                <div style={{ fontWeight: 600 }}>{serial || 'Not Selected'}</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>MODE</span>
                <div style={{ fontWeight: 600, color: mode === 'live' ? '#10b981' : '#f59e0b' }}>
                  {mode.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="status-badge">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isPlayerActive ? '#10b981' : '#64748b' }}></div>
              {isPlayerActive ? 'STREAMING' : 'READY'}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
