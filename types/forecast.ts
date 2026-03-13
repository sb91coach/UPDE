export interface ForecastResult {
  historical: number[];
  projected: number[];
  slope: number;
  confidence: number;
}
