import React, { useEffect, useRef } from 'react';

interface Props {
  videoId: string;
  height: number;
  play?: boolean;
  onStateChange?: (state: string) => void;
}

const YouTubePlayerWeb: React.FC<Props> = ({ videoId, height, play = true, onStateChange }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const command = play ? 'playVideo' : 'pauseVideo';
    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: command, args: '' }),
      '*'
    );
  }, [play]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'onStateChange') {
          // 1: playing, 2: paused, 0: ended
          if (data.info === 1) onStateChange?.('playing');
          else if (data.info === 2) onStateChange?.('paused');
          else if (data.info === 0) onStateChange?.('ended');
        }
      } catch (e) {
        // Not a JSON or not from YouTube
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onStateChange]);

  return (
    <iframe
      ref={iframeRef}
      width="100%"
      height={height}
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      style={{ border: 'none' }}
    />
  );
};

export default YouTubePlayerWeb;
