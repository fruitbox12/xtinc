import type { Size } from "components/system/Window/RndWindow/useResizable";
import type { RelativePosition } from "contexts/process/types";
import type { Position } from "eruda";
import { basename, dirname, extname, join } from "path";
import type { HTMLAttributes } from "react";
import {
  HIGH_PRIORITY_REQUEST,
  MAX_RES_ICON_OVERRIDE,
  ONE_TIME_PASSIVE_EVENT,
  TASKBAR_HEIGHT,
} from "utils/constants";

export const GOOGLE_SEARCH_QUERY = "https://www.google.com/search?igu=1&q=";

export const bufferToBlob = (buffer: Buffer, type?: string): Blob =>
  new Blob([buffer], type ? { type } : undefined);

export const bufferToUrl = (buffer: Buffer): string =>
  URL.createObjectURL(bufferToBlob(buffer));

let canUseWebp: boolean;

export const supportsWebp = (): boolean => {
  if (typeof canUseWebp === "boolean") return canUseWebp;

  try {
    canUseWebp = document
      .createElement("canvas")
      .toDataURL("image/webp", 0)
      .startsWith("data:image/webp");

    return canUseWebp;
  } catch {
    return false;
  }
};

let dpi: number;

export const getDpi = (): number => {
  if (typeof dpi === "number") return dpi;

  dpi = Math.min(Math.ceil(window.devicePixelRatio), 3);

  return dpi;
};

export const toggleFullScreen = async (): Promise<void> => {
  try {
    await (!document.fullscreenElement
      ? document.documentElement.requestFullscreen()
      : document.exitFullscreen());
  } catch {
    // Ignore failure to enter fullscreen
  }
};

export const imageSrc = (
  imagePath: string,
  size: number,
  ratio: number,
  extension: string
): string => {
  const imageName = basename(imagePath, ".webp");
  const [expectedSize, maxIconSize] = MAX_RES_ICON_OVERRIDE[imageName] || [];
  const ratioSize = size * ratio;
  const imageSize =
    expectedSize === size ? Math.min(maxIconSize, ratioSize) : ratioSize;

  return `${join(
    dirname(imagePath),
    `${imageSize}x${imageSize}`,
    `${imageName}${extension}`
  ).replace(/\\/g, "/")}${ratio > 1 ? ` ${ratio}x` : ""}`;
};

export const imageSrcs = (
  imagePath: string,
  size: number,
  extension: string,
  failedUrls?: string[]
): string => {
  return [
    imageSrc(imagePath, size, 1, extension),
    imageSrc(imagePath, size, 2, extension),
    imageSrc(imagePath, size, 3, extension),
  ]
    .filter(
      (url) => !failedUrls?.length || failedUrls?.includes(url.split(" ")[0])
    )
    .join(", ");
};

export const imageToBufferUrl = (
  path: string,
  buffer: Buffer | string
): string =>
  extname(path) === ".svg"
    ? `data:image/svg+xml;base64,${window.btoa(buffer.toString())}`
    : `data:image/png;base64,${buffer.toString("base64")}`;

export const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const fileReader = new FileReader();

    fileReader.readAsDataURL(blob);
    fileReader.onloadend = () => resolve(fileReader.result as string);
  });

export const cleanUpBufferUrl = (url: string): void => URL.revokeObjectURL(url);

const loadScript = (
  src: string,
  defer?: boolean,
  force?: boolean
): Promise<Event> =>
  new Promise((resolve, reject) => {
    const loadedScripts = [...document.scripts];
    const currentScript = loadedScripts.find((loadedScript) =>
      loadedScript.src.endsWith(src)
    );

    if (currentScript) {
      if (!force) {
        resolve(new Event("Already loaded."));
        return;
      }

      currentScript.remove();
    }

    const script = document.createElement(
      "script"
    ) as HTMLElementWithPriority<HTMLScriptElement>;

    script.async = false;
    if (defer) script.defer = true;
    script.fetchPriority = "high";
    script.src = src;
    script.addEventListener("error", reject, ONE_TIME_PASSIVE_EVENT);
    script.addEventListener("load", resolve, ONE_TIME_PASSIVE_EVENT);

    document.head.appendChild(script);
  });

const loadStyle = (href: string): Promise<Event> =>
  new Promise((resolve, reject) => {
    const loadedStyles = [...document.querySelectorAll("link")];

    if (loadedStyles.some((loadedStyle) => loadedStyle.href.endsWith(href))) {
      resolve(new Event("Already loaded."));
      return;
    }

    const link = document.createElement(
      "link"
    ) as HTMLElementWithPriority<HTMLLinkElement>;

    link.rel = "stylesheet";
    link.fetchPriority = "high";
    link.href = href;
    link.addEventListener("error", reject, ONE_TIME_PASSIVE_EVENT);
    link.addEventListener("load", resolve, ONE_TIME_PASSIVE_EVENT);

    document.head.appendChild(link);
  });

export const loadFiles = async (
  files: string[],
  defer?: boolean,
  force?: boolean
): Promise<void> =>
  files.reduce(async (_promise, file) => {
    await (extname(file).toLowerCase() === ".css"
      ? loadStyle(encodeURI(file))
      : loadScript(encodeURI(file), defer, force));
  }, Promise.resolve());

export const pxToNum = (value: number | string = 0): number =>
  typeof value === "number" ? value : Number.parseFloat(value);

export const viewHeight = (): number =>
  window.screen.height
    ? Math.min(window.innerHeight, window.screen.height)
    : window.innerHeight;

export const viewWidth = (): number =>
  window.screen.width
    ? Math.min(window.innerWidth, window.screen.width)
    : window.innerWidth;

export const calcInitialPosition = (
  relativePosition: RelativePosition,
  container: HTMLElement
): Position => ({
  x: relativePosition.left || viewWidth() - (relativePosition.right || 0),
  y:
    relativePosition.top ||
    viewHeight() - (relativePosition.bottom || 0) - container.offsetHeight,
});

export const isCanvasDrawn = (canvas?: HTMLCanvasElement | null): boolean =>
  canvas instanceof HTMLCanvasElement &&
  Boolean(
    canvas
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height)
      .data.some((channel) => channel !== 0)
  );

export const maxSize = (size: Size, lockAspectRatio: boolean): Size => {
  const desiredHeight = Number(size.height);
  const desiredWidth = Number(size.width);
  const [vh, vw] = [viewHeight(), viewWidth()];
  const vhWithoutTaskbar = vh - TASKBAR_HEIGHT;
  const height = Math.min(desiredHeight, vhWithoutTaskbar);
  const width = Math.min(desiredWidth, vw);

  if (!lockAspectRatio) return { height, width };

  const isDesiredHeight = desiredHeight === height;
  const isDesiredWidth = desiredWidth === width;

  if (!isDesiredHeight && !isDesiredWidth) {
    if (desiredHeight > desiredWidth) {
      return {
        height,
        width: Math.round(width / (vhWithoutTaskbar / height)),
      };
    }

    return {
      height: Math.round(height / (vw / width)),
      width,
    };
  }

  if (!isDesiredHeight) {
    return {
      height,
      width: Math.round(width / (desiredHeight / height)),
    };
  }

  if (!isDesiredWidth) {
    return {
      height: Math.round(height / (desiredWidth / width)),
      width,
    };
  }

  return { height, width };
};

const bytesInKB = 1024;
const bytesInMB = 1022976; // 1024 * 999;
const bytesInGB = 1047527424; // 1024 * 1024 * 999;
const bytesInTB = 1072668082176; // 1024 * 1024 * 1024 * 999

const formatNumber = (number: number): string =>
  new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: number < 1 ? 2 : 3,
    minimumSignificantDigits: number < 1 ? 2 : 3,
  }).format(Number(number.toFixed(4).slice(0, -2)));

export const getFormattedSize = (size = 0): string => {
  if (size === 1) return "1 byte";
  if (size < bytesInKB) return `${size} bytes`;
  if (size < bytesInMB) return `${formatNumber(size / bytesInKB)} KB`;
  if (size < bytesInGB) {
    return `${formatNumber(size / bytesInKB / bytesInKB)} MB`;
  }
  if (size < bytesInTB) {
    return `${formatNumber(size / bytesInKB / bytesInKB / bytesInKB)} GB`;
  }

  return `${size} bytes`;
};

export const getTZOffsetISOString = (): string => {
  const date = new Date();

  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  ).toISOString();
};

export const getUrlOrSearch = (input: string): string => {
  const hasHttpSchema =
    input.startsWith("http://") || input.startsWith("https://");
  const hasTld =
    input.endsWith(".com") ||
    input.endsWith(".ca") ||
    input.endsWith(".net") ||
    input.endsWith(".org");

  try {
    const { href } = new URL(
      hasHttpSchema || !hasTld ? input : `https://${input}`
    );

    return href;
  } catch {
    return `${GOOGLE_SEARCH_QUERY}${input}`;
  }
};

export const isFirefox = (): boolean =>
  typeof window !== "undefined" && /firefox/i.test(window.navigator.userAgent);

export const isSafari = (): boolean =>
  typeof window !== "undefined" &&
  /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);

export const haltEvent = (
  event: Event | React.DragEvent | React.KeyboardEvent | React.MouseEvent
): void => {
  event.preventDefault();
  event.stopPropagation();
};

export const createOffscreenCanvas = (
  containerElement: HTMLElement,
  devicePixelRatio = 1,
  customSize: Size = {} as Size
): OffscreenCanvas => {
  const canvas = document.createElement("canvas");
  const height = Number(customSize?.height) || containerElement.offsetHeight;
  const width = Number(customSize?.width) || containerElement.offsetWidth;

  canvas.style.height = `${height}px`;
  canvas.style.width = `${width}px`;

  canvas.height = Math.floor(height * devicePixelRatio);
  canvas.width = Math.floor(width * devicePixelRatio);

  containerElement.appendChild(canvas);

  return canvas.transferControlToOffscreen();
};

export const getSearchParam = (param: string): string =>
  new URLSearchParams(window.location.search).get(param) || "";

export const clsx = (classes: Record<string, boolean>): string =>
  Object.entries(classes)
    .filter(([, isActive]) => isActive)
    .map(([className]) => className)
    .join(" ");

export const label = (value: string): HTMLAttributes<HTMLElement> => ({
  "aria-label": value,
  title: value,
});

export const isYouTubeUrl = (url: string): boolean =>
  url.includes("youtube.com/") || url.includes("youtu.be/");

export const getYouTubeUrlId = (url: string): string => {
  try {
    const { pathname, searchParams } = new URL(url);

    return searchParams.get("v") || pathname.split("/").pop() || "";
  } catch {
    // URL parsing failed
  }

  return "";
};

export const getGifJs = async (): Promise<GIF> => {
  const { default: GIFInstance } = await import("gif.js");

  return new GIFInstance({
    quality: 10,
    workerScript: "Program Files/gif.js/gif.worker.js",
    workers: Math.max(Math.floor(navigator.hardwareConcurrency / 4), 1),
  });
};

export const jsonFetch = async (
  url: string
): Promise<Record<string, unknown>> => {
  const response = await fetch(url, HIGH_PRIORITY_REQUEST);
  const jsr = {
    date: "2022-08-01",
    explanation:
      "It's stars versus dust in the Carina Nebula and the stars are winning. More precisely, the energetic light and winds from massive newly formed stars are evaporating and dispersing the dusty stellar nurseries in which they formed. Located in the Carina Nebula and known informally as Mystic Mountain, these pillar's appearance is dominated by the dark dust even though it is composed mostly of clear hydrogen gas. Dust pillars such as these are actually much thinner than air and only appear as mountains due to relatively small amounts of opaque interstellar dust.  About 7,500 light-years distant, the featured image was taken with the Hubble Space Telescope and highlights an interior region of Carina which spans about three light years. Within a few million years, the stars will likely win out completely and the entire dust mountain will evaporate.",
    hdurl:
      "https://cdn.discordapp.com/attachments/903378704359632936/985444784275595294/Logo-1_1.png",
    media_type: "image",
    service_version: "v1",
    title: "Mountains of Dust in the Carina Nebula",
    url: "https://cdn.discordapp.com/attachments/903378704359632936/985444784275595294/Logo-1_1.png",
  };
  await response.json();
  const json = jsr as Record<string, unknown>;

  return json || {};
};
