import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { ScorchieShort, SCORCHIE_FRAMES } from "./videos/scorchie/Scorchie";

export const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ScorchieShort" component={ScorchieShort} durationInFrames={SCORCHIE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
