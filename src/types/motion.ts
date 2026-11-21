export type EasingType =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutCubic'
  | 'easeOutBack'
  | 'easeOutExpo'
  | 'springElastic'
  | 'bounceOut';

export type MotionObjectType =
  | 'rect'
  | 'circle'
  | 'polygon'
  | 'star'
  | 'ring'
  | 'line'
  | 'path'
  | 'text'
  | 'counter'
  | 'particles'
  | 'waveform'
  | 'orbit'
  | 'blob'
  | 'grid';

export type AnimatableProperty =
  | 'x'
  | 'y'
  | 'scaleX'
  | 'scaleY'
  | 'rotation'
  | 'opacity'
  | 'width'
  | 'height';

export interface Keyframe {
  id: string;
  time: number;
  value: number;
  easing: EasingType;
}

export type FillMode = 'solid' | 'linear-gradient' | 'radial-gradient' | 'none';

export type BlendModeType =
  | 'source-over'
  | 'screen'
  | 'multiply'
  | 'lighter'
  | 'overlay';

export type EntrancePreset =
  | 'none'
  | 'fade'
  | 'scale-pop'
  | 'slide-up'
  | 'slide-left'
  | 'rotate-in'
  | 'blur-in';

export type ExitPreset = 'none' | 'fade' | 'scale-down' | 'slide-down';

export type TextRevealMode =
  | 'none'
  | 'fade-up'
  | 'typewriter'
  | 'scramble'
  | 'word-pop';

export interface OscillationSetting {
  amp: number;
  freq: number;
  phase: number;
}

export interface ObjectTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
}

export interface ObjectStyle {
  fillMode: FillMode;
  fillColor: string;
  fillColor2: string;
  gradientAngle: number;
  strokeColor: string;
  strokeWidth: number;
  strokeDash: number;
  cornerRadius: number;
  blendMode: BlendModeType;
  shadowBlur: number;
  shadowColor: string;
}

export interface ShapeProps {
  sides: number;
  points: number;
  innerRadius: number;
  startAngle: number;
  endAngle: number;
  svgPath: string;
  pathViewBox: number;
}

export interface TextProps {
  content: string;
  fontFamily: 'Plus Jakarta Sans' | 'DM Sans' | 'Playfair Display' | 'JetBrains Mono';
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  align: 'left' | 'center' | 'right';
  revealMode: TextRevealMode;
  counterFrom: number;
  counterTo: number;
  counterPrefix: string;
  counterSuffix: string;
  counterDecimals: number;
}

export interface ProceduralProps {
  particleCount: number;
  particleSpeed: number;
  particleSpread: number;
  particleSize: number;
  particleGravity: number;
  waveBars: number;
  waveAmplitude: number;
  waveFrequency: number;
  waveMirror: boolean;
  orbitRings: number;
  orbitSpeed: number;
  blobLobes: number;
  blobComplexity: number;
  gridCols: number;
  gridRows: number;
}

export interface MotionBehavior {
  entrancePreset: EntrancePreset;
  entranceDuration: number;
  exitPreset: ExitPreset;
  exitDuration: number;
  oscillateX: OscillationSetting;
  oscillateY: OscillationSetting;
  spinSpeed: number;
  pulseAmp: number;
  pulseFreq: number;
  orbitRadius: number;
  orbitSpeed: number;
}

export interface MotionObject {
  id: string;
  name: string;
  type: MotionObjectType;
  visible: boolean;
  locked: boolean;
  startTime: number;
  endTime: number;
  transform: ObjectTransform;
  style: ObjectStyle;
  shapeProps: ShapeProps;
  textProps: TextProps;
  proceduralProps: ProceduralProps;
  behavior: MotionBehavior;
  keyframes: Partial<Record<AnimatableProperty, Keyframe[]>>;
}

export type BackgroundType =
  | 'solid'
  | 'linear-gradient'
  | 'radial-mesh'
  | 'grid-studio'
  | 'starfield';

export interface CompositionBackground {
  type: BackgroundType;
  color1: string;
  color2: string;
  color3: string;
  angle: number;
  animate: boolean;
  gridSize: number;
  gridOpacity: number;
}

export interface CameraSettings {
  zoom: number;
  panX: number;
  panY: number;
  handheldDrift: number;
  vignette: number;
  filmGrain: number;
}

export interface MotionComposition {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  bpm: number;
  background: CompositionBackground;
  camera: CameraSettings;
  objects: MotionObject[];
}

export interface EvaluatedObjectState {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  blur: number;
  isActive: boolean;
  localTime: number;
  localProgress: number;
}
