import React from "react";
import { Composition } from "remotion";
import { Captions, DEFAULT_PROPS } from "./Captions.jsx";

export const RemotionRoot = () => {
  return (
    <Composition
      id="Captions"
      component={Captions}
      durationInFrames={DEFAULT_PROPS.durationInFrames}
      fps={DEFAULT_PROPS.fps}
      width={DEFAULT_PROPS.width}
      height={DEFAULT_PROPS.height}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(1, Math.round(props.durationInSeconds * props.fps)),
        fps: props.fps,
        width: props.width,
        height: props.height,
      })}
    />
  );
};
