export interface FormMetrics {
  shank_angle_td: number[];
  overstride_calf_td: number[];
  knee_flexion_td: number[];
  knee_flexion_ms: number[];
  trunk_lean: number | null;
  elbow_angle: number | null;
  arm_swing: { min: number; max: number; range: number } | null;
}

export interface AnalysisResult {
  facing: string;
  near_side: string;
  strides_analyzed: number;
  fps: number; // 0 = unknown (analysis from before fps was stored): no video/chart sync
  touchdown_frames: number[];
  midstance_frames: number[];
  metrics: FormMetrics;
  charts: Record<string, Record<string, number>[]>;
  check_frames: { frame: number; kind: string; file: string }[];
  warnings: string[];
}

export interface VideoAnalysis {
  id: string;
  original_filename: string;
  content_type: string | null;
  file_size_bytes: number | null;
  status: "pending" | "processing" | "completed" | "failed";
  result: AnalysisResult | null;
  error: string | null;
  uploaded_at: string;
  analyzed_at: string | null;
}
