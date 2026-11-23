import { applyEasing, clamp, hexToRgba, lerp } from './easing';
import { evaluateObjectState, getTextScramble, seededRandom } from './motionEngine';
import type { SnapGuide } from './smartSnap';
import type {
  EvaluatedObjectState,
  MotionComposition,
  MotionObject,
} from '../types/motion';

export interface RenderOptions {
  selectedObjectId?: string | null;
  showGuides?: boolean;
  showSafeZones?: boolean;
  interactiveOverlay?: boolean;
  snapGuides?: SnapGuide[];
}

function createFillStyle(
  ctx: CanvasRenderingContext2D,
  obj: MotionObject,
  w: number,
  h: number,
): string | CanvasGradient | null {
  const { fillMode, fillColor, fillColor2, gradientAngle } = obj.style;
  if (fillMode === 'none') return null;
  if (fillMode === 'solid') return fillColor;

  if (fillMode === 'radial-gradient') {
    const r = Math.max(w, h) * 0.65;
    const grad = ctx.createRadialGradient(0, 0, r * 0.08, 0, 0, r);
    grad.addColorStop(0, fillColor);
    grad.addColorStop(1, fillColor2);
    return grad;
  }

  const rad = (gradientAngle * Math.PI) / 180;
  const dx = Math.cos(rad) * (w / 2);
  const dy = Math.sin(rad) * (h / 2);
  const grad = ctx.createLinearGradient(-dx, -dy, dx, dy);
  grad.addColorStop(0, fillColor);
  grad.addColorStop(1, fillColor2);
  return grad;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = clamp(r, 0, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  comp: MotionComposition,
  time: number,
) {
  const { width, height, background } = comp;
  const { type, color1, color2, color3, angle, animate, gridSize, gridOpacity } = background;
  const animOffset = animate ? Math.sin(time * 0.7) * 18 : 0;

  if (type === 'solid') {
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, width, height);
  } else if (type === 'linear-gradient') {
    const rad = ((angle + animOffset) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const len = Math.hypot(width, height) / 2;
    const grad = ctx.createLinearGradient(
      cx - Math.cos(rad) * len,
      cy - Math.sin(rad) * len,
      cx + Math.cos(rad) * len,
      cy + Math.sin(rad) * len,
    );
    grad.addColorStop(0, color1);
    grad.addColorStop(0.55, color2);
    grad.addColorStop(1, color3);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (type === 'radial-mesh') {
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, width, height);

    const driftX = animate ? Math.cos(time * 0.6) * width * 0.14 : 0;
    const driftY = animate ? Math.sin(time * 0.5) * height * 0.12 : 0;

    const g1 = ctx.createRadialGradient(
      width * 0.28 + driftX,
      height * 0.32 + driftY,
      20,
      width * 0.28 + driftX,
      height * 0.32 + driftY,
      width * 0.65,
    );
    g1.addColorStop(0, hexToRgba(color2, 0.52));
    g1.addColorStop(1, hexToRgba(color2, 0));
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, width, height);

    const g2 = ctx.createRadialGradient(
      width * 0.75 - driftX,
      height * 0.68 - driftY,
      20,
      width * 0.75 - driftX,
      height * 0.68 - driftY,
      width * 0.6,
    );
    g2.addColorStop(0, hexToRgba(color3, 0.42));
    g2.addColorStop(1, hexToRgba(color3, 0));
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, width, height);
  } else if (type === 'grid-studio') {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const step = Math.max(24, gridSize);
    const shift = animate ? (time * 28) % step : 0;
    ctx.strokeStyle = hexToRgba(color3, clamp(gridOpacity, 0.04, 0.7));
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = -step + shift; x < width + step; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = -step + shift; y < height + step; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (type === 'starfield') {
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, width, height);
    const count = 90;
    for (let i = 0; i < count; i++) {
      const sx = seededRandom(i * 11 + 3) * width;
      const baseSy = seededRandom(i * 19 + 7) * height;
      const speed = 15 + seededRandom(i * 23 + 1) * 45;
      const sy = animate ? (baseSy + time * speed) % height : baseSy;
      const r = 1 + seededRandom(i * 31 + 5) * 2.4;
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.4 + i));
      ctx.fillStyle = hexToRgba(i % 3 === 0 ? color3 : color2, twinkle);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function applyStrokeAndFill(
  ctx: CanvasRenderingContext2D,
  obj: MotionObject,
  w: number,
  h: number,
) {
  const fill = createFillStyle(ctx, obj, w, h);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (obj.style.strokeWidth > 0) {
    ctx.strokeStyle = obj.style.strokeColor;
    ctx.lineWidth = obj.style.strokeWidth;
    if (obj.style.strokeDash > 0) {
      ctx.setLineDash([obj.style.strokeDash, obj.style.strokeDash * 0.75]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawMotionObject(
  ctx: CanvasRenderingContext2D,
  obj: MotionObject,
  state: EvaluatedObjectState,
  comp: MotionComposition,
  time: number,
) {
  const { width: w, height: h } = state;
  ctx.save();
  ctx.globalAlpha = state.opacity;
  ctx.globalCompositeOperation = obj.style.blendMode;

  if (state.blur > 0.2) {
    ctx.filter = `blur(${state.blur.toFixed(1)}px)`;
  }

  if (obj.style.shadowBlur > 0) {
    ctx.shadowBlur = obj.style.shadowBlur;
    ctx.shadowColor = obj.style.shadowColor;
  }

  ctx.translate(state.x, state.y);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.scale(state.scaleX, state.scaleY);

  switch (obj.type) {
    case 'rect': {
      drawRoundedRectPath(ctx, -w / 2, -h / 2, w, h, obj.style.cornerRadius);
      applyStrokeAndFill(ctx, obj, w, h);
      break;
    }

    case 'circle': {
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      applyStrokeAndFill(ctx, obj, w, h);
      break;
    }

    case 'polygon': {
      const sides = Math.max(3, Math.round(obj.shapeProps.sides));
      const rx = w / 2;
      const ry = h / 2;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * rx;
        const py = Math.sin(a) * ry;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      applyStrokeAndFill(ctx, obj, w, h);
      break;
    }

    case 'star': {
      const pts = Math.max(3, Math.round(obj.shapeProps.points));
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * clamp(obj.shapeProps.innerRadius, 0.15, 0.9);
      ctx.beginPath();
      for (let i = 0; i < pts * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      applyStrokeAndFill(ctx, obj, w, h);
      break;
    }

    case 'ring': {
      const radius = Math.min(w, h) / 2;
      const start = (obj.shapeProps.startAngle * Math.PI) / 180;
      const end = (obj.shapeProps.endAngle * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(0, 0, radius, start, end);
      ctx.lineCap = 'round';
      ctx.strokeStyle = obj.style.strokeColor;
      ctx.lineWidth = Math.max(2, obj.style.strokeWidth || 10);
      if (obj.style.strokeDash > 0) {
        ctx.setLineDash([obj.style.strokeDash, obj.style.strokeDash * 0.75]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }

    case 'line': {
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(w / 2, 0);
      ctx.lineCap = 'round';
      ctx.strokeStyle = obj.style.strokeColor || obj.style.fillColor;
      ctx.lineWidth = Math.max(2, obj.style.strokeWidth || h);
      if (obj.style.strokeDash > 0) {
        ctx.setLineDash([obj.style.strokeDash, obj.style.strokeDash * 0.65]);
        ctx.lineDashOffset = -time * 60;
      }
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }

    case 'path': {
      const vb = Math.max(10, obj.shapeProps.pathViewBox || 100);
      const sx = w / vb;
      const sy = h / vb;
      ctx.save();
      ctx.translate(-w / 2, -h / 2);
      ctx.scale(sx, sy);
      try {
        const p2d = new Path2D(obj.shapeProps.svgPath);
        const fill = createFillStyle(ctx, obj, vb, vb);
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill(p2d);
        }
        if (obj.style.strokeWidth > 0) {
          ctx.strokeStyle = obj.style.strokeColor;
          ctx.lineWidth = obj.style.strokeWidth / Math.max(0.2, sx);
          ctx.stroke(p2d);
        }
      } catch {
        drawRoundedRectPath(ctx, 0, 0, vb, vb, 12);
        ctx.strokeStyle = obj.style.strokeColor;
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'text':
    case 'counter': {
      const tp = obj.textProps;
      ctx.font = `${tp.fontWeight} ${tp.fontSize}px "${tp.fontFamily}", sans-serif`;
      ctx.textAlign = tp.align;
      ctx.textBaseline = 'middle';

      let displayString = tp.content;
      if (obj.type === 'counter') {
        const countDur = Math.max(0.4, obj.behavior.entranceDuration * 2.2);
        const prog = applyEasing(clamp(state.localTime / countDur, 0, 1), 'easeOutExpo');
        const num = lerp(tp.counterFrom, tp.counterTo, prog);
        displayString = `${tp.counterPrefix}${num.toFixed(tp.counterDecimals)}${tp.counterSuffix}`;
      } else if (tp.revealMode === 'typewriter') {
        const dur = Math.max(0.4, obj.behavior.entranceDuration * 1.8);
        const p = clamp(state.localTime / dur, 0, 1);
        const len = Math.floor(p * tp.content.length);
        displayString = tp.content.slice(0, len) + (p < 1 && Math.floor(time * 4) % 2 === 0 ? '|' : '');
      } else if (tp.revealMode === 'scramble') {
        const dur = Math.max(0.5, obj.behavior.entranceDuration * 2);
        const p = clamp(state.localTime / dur, 0, 1);
        displayString = getTextScramble(tp.content, p, obj.id.length * 13);
      }

      const lines = displayString.split('\n');
      const lineStep = tp.fontSize * tp.lineHeight;
      const startY = -((lines.length - 1) * lineStep) / 2;
      const alignX = tp.align === 'left' ? -w / 2 : tp.align === 'right' ? w / 2 : 0;

      const fill = createFillStyle(ctx, obj, w, h);
      lines.forEach((line, idx) => {
        let yOffset = 0;
        let lineAlpha = 1;
        if (tp.revealMode === 'fade-up' || tp.revealMode === 'word-pop') {
          const delay = idx * 0.12;
          const p = clamp((state.localTime - delay) / Math.max(0.2, obj.behavior.entranceDuration), 0, 1);
          const e = applyEasing(p, tp.revealMode === 'word-pop' ? 'easeOutBack' : 'easeOutExpo');
          yOffset = (1 - e) * 28;
          lineAlpha = clamp(p * 1.4, 0, 1);
        }
        ctx.save();
        ctx.globalAlpha *= lineAlpha;
        if ('letterSpacing' in ctx) {
          (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${tp.letterSpacing}px`;
        }
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fillText(line, alignX, startY + idx * lineStep + yOffset);
        }
        if (obj.style.strokeWidth > 0) {
          ctx.strokeStyle = obj.style.strokeColor;
          ctx.lineWidth = obj.style.strokeWidth;
          ctx.strokeText(line, alignX, startY + idx * lineStep + yOffset);
        }
        ctx.restore();
      });

      if (obj.type === 'counter' && tp.content.trim()) {
        ctx.save();
        ctx.font = `600 ${Math.max(18, Math.round(tp.fontSize * 0.28))}px "DM Sans", sans-serif`;
        ctx.fillStyle = hexToRgba(obj.style.fillColor, 0.78);
        ctx.fillText(tp.content, alignX, tp.fontSize * 0.85);
        ctx.restore();
      }
      break;
    }

    case 'particles': {
      const pp = obj.proceduralProps;
      const count = clamp(Math.round(pp.particleCount), 4, 180);
      const t = Math.max(0, state.localTime);
      for (let i = 0; i < count; i++) {
        const angle = seededRandom(i * 7 + 1) * Math.PI * 2;
        const speedFactor = 0.35 + seededRandom(i * 13 + 3) * 0.85;
        const life = 1.6 + seededRandom(i * 29 + 5) * 1.8;
        const phase = seededRandom(i * 37 + 9) * life;
        const age = (t + phase) % life;
        const lifeNorm = age / life;
        const dist = (age * pp.particleSpeed * speedFactor) % Math.max(40, pp.particleSpread);
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist + 0.5 * pp.particleGravity * age * age;
        const size = pp.particleSize * (1 - lifeNorm * 0.55) * (0.6 + seededRandom(i * 41) * 0.7);
        const alpha = Math.sin(lifeNorm * Math.PI);

        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.fillStyle = i % 2 === 0 ? obj.style.fillColor : obj.style.fillColor2;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, size), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'waveform': {
      const pp = obj.proceduralProps;
      const bars = clamp(Math.round(pp.waveBars), 6, 80);
      const barGap = w / bars;
      const barWidth = Math.max(2, barGap * 0.58);
      const beatMul = comp.bpm / 60;
      const fill = createFillStyle(ctx, obj, w, h) ?? obj.style.fillColor;
      ctx.fillStyle = fill;

      for (let i = 0; i < bars; i++) {
        const norm = i / bars;
        const env = Math.sin(norm * Math.PI);
        const wave =
          0.5 +
          0.5 *
            Math.sin(
              time * pp.waveFrequency * beatMul +
                i * 0.45 +
                Math.cos(time * 1.7 + i * 0.2),
            );
        const barH = Math.max(8, wave * pp.waveAmplitude * (0.45 + 0.55 * env) * 1.8);
        const bx = -w / 2 + i * barGap + (barGap - barWidth) / 2;
        const by = pp.waveMirror ? -barH / 2 : h / 2 - barH;
        drawRoundedRectPath(ctx, bx, by, barWidth, barH, barWidth / 2);
        ctx.fill();
      }
      break;
    }

    case 'orbit': {
      const pp = obj.proceduralProps;
      const rings = clamp(Math.round(pp.orbitRings), 1, 8);
      const maxR = Math.min(w, h) / 2;
      for (let r = 0; r < rings; r++) {
        const ringR = maxR * ((r + 1) / rings);
        const dir = r % 2 === 0 ? 1 : -1;
        const rot = (time * pp.orbitSpeed * dir * (1 + r * 0.25) * Math.PI) / 180;

        ctx.save();
        ctx.strokeStyle = hexToRgba(obj.style.strokeColor, 0.35 + (r / rings) * 0.45);
        ctx.lineWidth = Math.max(1.5, obj.style.strokeWidth * 0.45);
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();

        // Orbiting satellite node
        const sx = Math.cos(rot) * ringR;
        const sy = Math.sin(rot) * ringR;
        ctx.fillStyle = r % 2 === 0 ? obj.style.fillColor : obj.style.fillColor2;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(5, obj.style.strokeWidth * 1.15), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'blob': {
      const pp = obj.proceduralProps;
      const lobes = clamp(Math.round(pp.blobLobes), 3, 12);
      const pts = 64;
      const rx = w / 2;
      const ry = h / 2;
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const wobble =
          1 +
          pp.blobComplexity *
            Math.sin(a * lobes + time * 2.1) *
            Math.cos(a * (lobes - 1) - time * 1.3);
        const px = Math.cos(a) * rx * wobble;
        const py = Math.sin(a) * ry * wobble;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      applyStrokeAndFill(ctx, obj, w, h);
      break;
    }

    case 'grid': {
      const pp = obj.proceduralProps;
      const cols = clamp(Math.round(pp.gridCols), 2, 20);
      const rows = clamp(Math.round(pp.gridRows), 2, 20);
      const cellW = w / Math.max(1, cols - 1);
      const cellH = h / Math.max(1, rows - 1);
      const baseColor = obj.style.fillColor;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = -w / 2 + c * cellW;
          const py = -h / 2 + r * cellH;
          const wave = 0.5 + 0.5 * Math.sin(time * 3 + c * 0.55 + r * 0.45);
          const dotR = 3 + wave * 5.5;
          ctx.fillStyle = hexToRgba(baseColor, 0.35 + wave * 0.65);
          ctx.beginPath();
          ctx.arc(px, py, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
  }

  ctx.restore();
}

export function renderCompositionFrame(
  ctx: CanvasRenderingContext2D,
  comp: MotionComposition,
  time: number,
  options: RenderOptions = {},
) {
  const { width, height, camera } = comp;
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // 1. Background
  drawBackground(ctx, comp, time);

  // 2. Camera Rig Transform
  const driftX = camera.handheldDrift > 0 ? Math.sin(time * 1.1) * camera.handheldDrift * 14 : 0;
  const driftY = camera.handheldDrift > 0 ? Math.cos(time * 0.85) * camera.handheldDrift * 10 : 0;

  ctx.save();
  ctx.translate(width / 2 + camera.panX + driftX, height / 2 + camera.panY + driftY);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-width / 2, -height / 2);

  // 3. Render layers bottom-to-top
  let selectedState: { obj: MotionObject; state: EvaluatedObjectState } | null = null;
  for (const obj of comp.objects) {
    const state = evaluateObjectState(obj, time, comp);
    if (obj.id === options.selectedObjectId) {
      selectedState = { obj, state };
    }
    if (!state.isActive) continue;
    drawMotionObject(ctx, obj, state, comp, time);
  }

  // 4. Interactive Editor Overlays (Selection Box, Safe Zones, Center Guides)
  if (options.interactiveOverlay) {
    if (options.showGuides) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.restore();
    }

    if (options.showSafeZones) {
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([10, 6]);
      ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.28)';
      ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
      ctx.restore();
    }

    if (options.snapGuides && options.snapGuides.length > 0) {
      const invZoom = 1 / Math.max(0.3, camera.zoom);
      for (const guide of options.snapGuides) {
        ctx.save();
        const isCanvasCenter = guide.kind === 'canvas-center';
        const guideColor = isCanvasCenter ? '#22D3EE' : '#F472B6';

        ctx.strokeStyle = guideColor;
        ctx.lineWidth = (isCanvasCenter ? 2.2 : 1.8) * invZoom;
        ctx.shadowBlur = isCanvasCenter ? 10 : 6;
        ctx.shadowColor = isCanvasCenter
          ? 'rgba(34, 211, 238, 0.7)'
          : 'rgba(244, 114, 182, 0.55)';

        if (guide.kind === 'object-edge') {
          ctx.setLineDash([8 * invZoom, 5 * invZoom]);
        } else {
          ctx.setLineDash([]);
        }

        const start = isCanvasCenter ? 0 : Math.max(0, guide.spanStart);
        const end = isCanvasCenter
          ? guide.axis === 'x'
            ? height
            : width
          : Math.min(guide.axis === 'x' ? height : width, guide.spanEnd);

        ctx.beginPath();
        if (guide.axis === 'x') {
          ctx.moveTo(guide.position, start);
          ctx.lineTo(guide.position, end);
        } else {
          ctx.moveTo(start, guide.position);
          ctx.lineTo(end, guide.position);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // Draw alignment tag near margin / span edge
        const uiScale = Math.max(width, height) / 1100;
        const fontSize = Math.round(13 * uiScale * invZoom);
        ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
        const padX = 8 * uiScale * invZoom;
        const padY = 5 * uiScale * invZoom;
        const textW = ctx.measureText(guide.label).width;
        const badgeW = textW + padX * 2;
        const badgeH = fontSize + padY * 2;

        const margin = 12 * uiScale;
        const badgeX =
          guide.axis === 'x'
            ? clamp(guide.position + 10 * uiScale * invZoom, margin, width - badgeW - margin)
            : clamp(start + 12 * uiScale * invZoom, margin, width - badgeW - margin);
        const badgeY =
          guide.axis === 'x'
            ? clamp(start + 14 * uiScale * invZoom, margin, height - badgeH - margin)
            : clamp(guide.position - badgeH - 8 * uiScale * invZoom, margin, height - badgeH - margin);

        ctx.fillStyle = 'rgba(13, 15, 19, 0.94)';
        drawRoundedRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 5 * uiScale * invZoom);
        ctx.fill();
        ctx.strokeStyle = guideColor;
        ctx.lineWidth = 1.2 * uiScale * invZoom;
        ctx.stroke();

        ctx.fillStyle = guideColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(guide.label, badgeX + padX, badgeY + badgeH / 2 + 0.5);

        ctx.restore();
      }
    }

    if (selectedState && selectedState.obj.visible) {
      const { state } = selectedState;
      ctx.save();
      ctx.translate(state.x, state.y);
      ctx.rotate((state.rotation * Math.PI) / 180);
      ctx.scale(state.scaleX, state.scaleY);

      const hw = state.width / 2;
      const hh = state.height / 2;
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2.5 / Math.max(0.25, camera.zoom);
      ctx.strokeRect(-hw, -hh, state.width, state.height);

      // Center pivot indicator when snapping
      if (options.snapGuides && options.snapGuides.length > 0) {
        const dotR = 4.5 / Math.max(0.3, camera.zoom);
        ctx.fillStyle = '#22D3EE';
        ctx.beginPath();
        ctx.arc(0, 0, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Corner handles
      const handleSize = 10 / Math.max(0.3, camera.zoom);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      const corners = [
        [-hw, -hh],
        [hw, -hh],
        [hw, hh],
        [-hw, hh],
      ];
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      }
      ctx.restore();
    }
  }

  ctx.restore();

  // 5. Post-Processing Vignette
  if (camera.vignette > 0) {
    const vig = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.28,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.72,
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(0,0,0,${clamp(camera.vignette, 0, 0.85)})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  }

  // 6. Subtle Deterministic Film Grain
  if (camera.filmGrain > 0) {
    const dots = Math.round(camera.filmGrain * 320);
    const frameIdx = Math.floor(time * comp.fps);
    for (let i = 0; i < dots; i++) {
      const gx = seededRandom(frameIdx * 101 + i * 7) * width;
      const gy = seededRandom(frameIdx * 103 + i * 13) * height;
      const bright = seededRandom(i * 19 + frameIdx) > 0.5;
      ctx.fillStyle = bright
        ? `rgba(255,255,255,${camera.filmGrain * 0.09})`
        : `rgba(0,0,0,${camera.filmGrain * 0.12})`;
      ctx.fillRect(gx, gy, 2.5, 2.5);
    }
  }

  ctx.restore();
}
