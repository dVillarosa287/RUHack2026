import { cameraArtUrl } from './index';

/**
 * The camera: the toolbar's screenshot button and the tiny badge on a sprite that has a screenshot. Uses
 * images/camera.png, or a plain line drawing if the image is missing.
 */
export function CameraIcon({ size = 24 }: { size?: number }) {
  const url = cameraArtUrl();
  if (url) return <img src={url} alt="Camera" width={size} height={size} draggable={false} style={{ display: 'block', objectFit: 'contain', pointerEvents: 'none' }} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="Camera" role="img" style={{ display: 'block' }}>
      <path d="M3 8 H7 L9 5.5 H15 L17 8 H21 V19 H3 Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
