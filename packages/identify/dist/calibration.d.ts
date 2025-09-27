export interface CalibrationMap {
    xs: number[];
    ys: number[];
}
export declare function loadCalibration(): CalibrationMap | null;
export declare function applyCalibration(conf: number, cal?: CalibrationMap | null): number;
export declare function fitIsotonic(pairs: Array<{
    score: number;
    label: 0 | 1;
}>): CalibrationMap;
