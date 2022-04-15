import styled from "styled-components";

const StyledJSDOS = styled.div`
  align-items: center;
  background-color: #000;
  display: flex;
  height: 100%;
  width: 100%;

  canvas {
    image-rendering: crisp-edges;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
    position: absolute;
    top: 0 !important;
    touch-action: none;
    -webkit-touch-callout: none;
    user-select: none;
    width: 100%;
  }

  div,
  video {
    display: none;
  }

  .emulator-mouse-overlay {
    display: block;
    inset: 0;
    position: absolute;
  }
`;

export default StyledJSDOS;
