import React from 'react';
import { Composition } from 'remotion';
import { Episode, EpisodeProps } from './Episode';

// The episode's timeline.json decides the length. `base` is the URL of the episode folder (served by tools/render-video.mjs).
export const Root: React.FC = () => (
  <Composition
    id="Episode" component={Episode} width={1080} height={1920} fps={30} durationInFrames={30}
    defaultProps={{ base: 'http://localhost:4599', timeline: null } as EpisodeProps}
    calculateMetadata={async ({ props }) => {
      const timeline = props.timeline ?? (await (await fetch(`${props.base}/timeline.json`)).json());
      return { durationInFrames: timeline.frames, fps: timeline.fps, props: { ...props, timeline } };
    }}
  />
);
