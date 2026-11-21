export interface SampledMediaFrame {
  mimeType: 'image/jpeg';
  base64: string;
  previewUrl: string;
  label: string;
}

export interface SampledStyleReference {
  kind: 'image' | 'video';
  fileName: string;
  frames: SampledMediaFrame[];
  durationSec?: number;
}

function drawResizedToJpeg(
  source: HTMLImageElement | HTMLVideoElement,
  srcW: number,
  srcH: number,
  maxDim = 768,
): { base64: string; previewUrl: string } {
  const scale = Math.min(1, maxDim / Math.max(1, srcW, srcH));
  const w = Math.max(64, Math.round(srcW * scale));
  const h = Math.max(64, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(source, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
  const base64 = dataUrl.split(',')[1] ?? '';
  return { base64, previewUrl: dataUrl };
}

export async function sampleStyleReferenceFile(
  file: File,
): Promise<SampledStyleReference> {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) {
    throw new Error('Please upload an image (PNG, JPG, WebP) or video (MP4, WebM, MOV) file.');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    if (isImage) {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Could not decode uploaded image.'));
        el.src = objectUrl;
      });
      const { base64, previewUrl } = drawResizedToJpeg(
        img,
        img.naturalWidth || 768,
        img.naturalHeight || 768,
      );
      return {
        kind: 'image',
        fileName: file.name,
        frames: [
          {
            mimeType: 'image/jpeg',
            base64,
            previewUrl,
            label: 'Reference Frame',
          },
        ],
      };
    }

    // Video reference: sample up to 3 representative frames (start, mid, end)
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Could not load uploaded video reference.'));
    });

    const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 2;
    const sampleTimes = dur > 0.8 ? [dur * 0.15, dur * 0.5, dur * 0.85] : [0];
    const frames: SampledMediaFrame[] = [];

    for (let i = 0; i < sampleTimes.length; i++) {
      const targetTime = Math.min(dur, Math.max(0, sampleTimes[i]));
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = targetTime;
        // Safety fallback in case currentTime is already at 0
        setTimeout(() => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }, 500);
      });

      const { base64, previewUrl } = drawResizedToJpeg(
        video,
        video.videoWidth || 768,
        video.videoHeight || 432,
      );
      frames.push({
        mimeType: 'image/jpeg',
        base64,
        previewUrl,
        label: `Frame @ ${targetTime.toFixed(1)}s`,
      });
    }

    return {
      kind: 'video',
      fileName: file.name,
      durationSec: dur,
      frames,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
