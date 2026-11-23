import { evaluateObjectState } from './motionEngine';
import type { MotionComposition, MotionObject } from '../types/motion';

export type SnapGuideKind = 'canvas-center' | 'object-center' | 'object-edge';

export interface SmartSnapSettings {
  enabled: boolean;
  canvasCenter: boolean;
  objectCenter: boolean;
  objectEdge: boolean;
  threshold: number;
}

export const DEFAULT_SMART_SNAP_SETTINGS: SmartSnapSettings = {
  enabled: true,
  canvasCenter: true,
  objectCenter: true,
  objectEdge: true,
  threshold: 16,
};

export interface SnapGuide {
  axis: 'x' | 'y';
  position: number;
  kind: SnapGuideKind;
  label: string;
  spanStart: number;
  spanEnd: number;
}

export interface SmartSnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  guides: SnapGuide[];
}

interface SnapCandidate {
  targetTransformPos: number;
  guidePosition: number;
  distance: number;
  kind: SnapGuideKind;
  label: string;
  spanStart: number;
  spanEnd: number;
}

export function computeSmartSnap(options: {
  draggedId: string;
  rawX: number;
  rawY: number;
  draggedWidth: number;
  draggedHeight: number;
  composition: MotionComposition;
  currentTime: number;
  threshold?: number;
  enableCanvasCenter?: boolean;
  enableObjectCenter?: boolean;
  enableObjectEdge?: boolean;
}): SmartSnapResult {
  const {
    draggedId,
    rawX,
    rawY,
    draggedWidth,
    draggedHeight,
    composition,
    currentTime,
    threshold = 16,
    enableCanvasCenter = true,
    enableObjectCenter = true,
    enableObjectEdge = true,
  } = options;

  if (!enableCanvasCenter && !enableObjectCenter && !enableObjectEdge) {
    return {
      x: Math.round(rawX),
      y: Math.round(rawY),
      snappedX: false,
      snappedY: false,
      guides: [],
    };
  }

  const halfW = Math.max(1, draggedWidth) / 2;
  const halfH = Math.max(1, draggedHeight) / 2;

  const canvasCenterX = Math.round(composition.width / 2);
  const canvasCenterY = Math.round(composition.height / 2);

  const xCandidates: SnapCandidate[] = [];
  const yCandidates: SnapCandidate[] = [];

  if (enableCanvasCenter) {
    xCandidates.push({
      targetTransformPos: canvasCenterX,
      guidePosition: canvasCenterX,
      distance: Math.abs(rawX - canvasCenterX),
      kind: 'canvas-center',
      label: `Center X · ${canvasCenterX}`,
      spanStart: 0,
      spanEnd: composition.height,
    });

    yCandidates.push({
      targetTransformPos: canvasCenterY,
      guidePosition: canvasCenterY,
      distance: Math.abs(rawY - canvasCenterY),
      kind: 'canvas-center',
      label: `Center Y · ${canvasCenterY}`,
      spanStart: 0,
      spanEnd: composition.width,
    });
  }

  // Collect centers and bounding edges of other visible active layers
  if (enableObjectCenter || enableObjectEdge) {
    for (const other of composition.objects) {
      if (other.id === draggedId || !other.visible) continue;
      const st = evaluateObjectState(other, currentTime, composition);
      if (!st.isActive) continue;

      const otherX = Math.round(st.x);
      const otherY = Math.round(st.y);
      const otherHalfW = (st.width * Math.abs(st.scaleX)) / 2;
      const otherHalfH = (st.height * Math.abs(st.scaleY)) / 2;

      const minY = Math.min(rawY - halfH, st.y - otherHalfH) - 24;
      const maxY = Math.max(rawY + halfH, st.y + otherHalfH) + 24;
      const minX = Math.min(rawX - halfW, st.x - otherHalfW) - 24;
      const maxX = Math.max(rawX + halfW, st.x + otherHalfW) + 24;

      // Center-to-center alignment
      if (enableObjectCenter) {
        xCandidates.push({
          targetTransformPos: otherX,
          guidePosition: otherX,
          distance: Math.abs(rawX - otherX),
          kind: 'object-center',
          label: other.name,
          spanStart: minY,
          spanEnd: maxY,
        });

        yCandidates.push({
          targetTransformPos: otherY,
          guidePosition: otherY,
          distance: Math.abs(rawY - otherY),
          kind: 'object-center',
          label: other.name,
          spanStart: minX,
          spanEnd: maxX,
        });
      }

      // Edge-to-edge alignment (Left-Left, Right-Right, Top-Top, Bottom-Bottom)
      if (enableObjectEdge) {
        const otherLeft = Math.round(st.x - otherHalfW);
        const otherRight = Math.round(st.x + otherHalfW);
        const otherTop = Math.round(st.y - otherHalfH);
        const otherBottom = Math.round(st.y + otherHalfH);

        xCandidates.push(
          {
            targetTransformPos: Math.round(otherLeft + halfW),
            guidePosition: otherLeft,
            distance: Math.abs(rawX - halfW - otherLeft),
            kind: 'object-edge',
            label: `Edge · ${other.name}`,
            spanStart: minY,
            spanEnd: maxY,
          },
          {
            targetTransformPos: Math.round(otherRight - halfW),
            guidePosition: otherRight,
            distance: Math.abs(rawX + halfW - otherRight),
            kind: 'object-edge',
            label: `Edge · ${other.name}`,
            spanStart: minY,
            spanEnd: maxY,
          },
        );

        yCandidates.push(
          {
            targetTransformPos: Math.round(otherTop + halfH),
            guidePosition: otherTop,
            distance: Math.abs(rawY - halfH - otherTop),
            kind: 'object-edge',
            label: `Edge · ${other.name}`,
            spanStart: minX,
            spanEnd: maxX,
          },
          {
            targetTransformPos: Math.round(otherBottom - halfH),
            guidePosition: otherBottom,
            distance: Math.abs(rawY + halfH - otherBottom),
            kind: 'object-edge',
            label: `Edge · ${other.name}`,
            spanStart: minX,
            spanEnd: maxX,
          },
        );
      }
    }
  }

  const pickBest = (candidates: SnapCandidate[]): SnapCandidate | null => {
    const within = candidates.filter((c) => c.distance <= threshold);
    if (within.length === 0) return null;
    // Prefer closer distance; on ties prefer canvas-center > object-center > object-edge
    const priority: Record<SnapGuideKind, number> = {
      'canvas-center': 0,
      'object-center': 1,
      'object-edge': 2,
    };
    within.sort((a, b) => {
      const diff = a.distance - b.distance;
      if (Math.abs(diff) > 1.5) return diff;
      return priority[a.kind] - priority[b.kind];
    });
    return within[0];
  };

  const bestX = pickBest(xCandidates);
  const bestY = pickBest(yCandidates);

  const guides: SnapGuide[] = [];
  if (bestX) {
    guides.push({
      axis: 'x',
      position: bestX.guidePosition,
      kind: bestX.kind,
      label: bestX.label,
      spanStart: bestX.spanStart,
      spanEnd: bestX.spanEnd,
    });
  }
  if (bestY) {
    guides.push({
      axis: 'y',
      position: bestY.guidePosition,
      kind: bestY.kind,
      label: bestY.label,
      spanStart: bestY.spanStart,
      spanEnd: bestY.spanEnd,
    });
  }

  return {
    x: bestX ? bestX.targetTransformPos : Math.round(rawX),
    y: bestY ? bestY.targetTransformPos : Math.round(rawY),
    snappedX: Boolean(bestX),
    snappedY: Boolean(bestY),
    guides,
  };
}

export function getDraggedVisualDimensions(
  obj: MotionObject,
  currentTime: number,
  composition: MotionComposition,
): { width: number; height: number } {
  const st = evaluateObjectState(obj, currentTime, composition);
  return {
    width: Math.max(4, st.width * Math.abs(st.scaleX)),
    height: Math.max(4, st.height * Math.abs(st.scaleY)),
  };
}
