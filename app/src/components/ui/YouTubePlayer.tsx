import React from 'react';
import YoutubePlayer from 'react-native-youtube-iframe';

interface Props {
  videoId: string;
  height: number;
  play?: boolean;
  onStateChange: (state: string) => void;
}

const YouTubePlayerMobile: React.FC<Props> = ({ videoId, height, play = true, onStateChange }) => {
  return (
    <YoutubePlayer
      height={height}
      play={play}
      videoId={videoId}
      onChangeState={onStateChange}
    />
  );
};

export default YouTubePlayerMobile;
