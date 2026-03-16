"use client";

import { useCallback, useRef, useState } from "react";

type NutritionResult = {
  meal_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "high" | "medium" | "low" | string;
  notes?: string;
  raw_ai_response?: string;
};

export default function FoodScanner() {
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [result, setResult] = useState<NutritionResult | null>(null);
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1.0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetAll = useCallback(() => {
    setPreview(null);
    setMediaType(null);
    setResult(null);
    setPortionMultiplier(1.0);
    setScanning(false);
    setSaving(false);
    setSaved(false);
    setError(null);
  }, []);

  const onFileSelected = useCallback((file?: File | null) => {
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setMediaType(file.type || "image/jpeg");
      setResult(null);
      setPortionMultiplier(1.0);
    };
    reader.onerror = () => {
      setError("Failed to read image. Please try again.");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAnalyse = useCallback(async () => {
    if (!preview || !mediaType || scanning) return;
    setScanning(true);
    setError(null);

    try {
      const commaIndex = preview.indexOf(",");
      const base64Data = commaIndex >= 0 ? preview.slice(commaIndex + 1) : preview;

      const res = await fetch("/api/nutrition/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Data,
          mediaType,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.error) || "Scan failed");
      }

      const data = (await res.json()) as NutritionResult;
      setResult(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Scan failed. Please try again.");
      setResult(null);
    } finally {
      setScanning(false);
    }
  }, [preview, mediaType, scanning]);

  const handleLogMeal = useCallback(async () => {
    if (!result || saving) return;
    setSaving(true);
    setError(null);

    const adjustedCalories = Math.round((result.calories || 0) * portionMultiplier);
    const adjustedProtein = Number((result.protein_g * portionMultiplier).toFixed(1));
    const adjustedCarbs = Number((result.carbs_g * portionMultiplier).toFixed(1));
    const adjustedFat = Number((result.fat_g * portionMultiplier).toFixed(1));

    try {
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_name: result.meal_name,
          calories: adjustedCalories,
          protein_g: adjustedProtein,
          carbs_g: adjustedCarbs,
          fat_g: adjustedFat,
          portion_multiplier: portionMultiplier,
          confidence: result.confidence,
          notes: result.notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.error) || "Failed to log meal");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError((err as Error).message || "Failed to log meal.");
    } finally {
      setSaving(false);
    }
  }, [result, portionMultiplier, saving]);

  const renderCaptureStep = () => {
    if (preview) return null;
    return (
      <div className="card">
        <div className="card-label">FOOD SCANNER</div>
        <div className="capture-row">
          <button
            type="button"
            className="capture-btn"
            onClick={() => cameraInputRef.current?.click()}
            disabled={scanning}
          >
            <span className="icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="6"
                  width="18"
                  height="14"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                />
                <path
                  d="M9 6.5L10.5 4h3L15 6.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="13"
                  r="3.25"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                />
              </svg>
            </span>
            <span>Take Photo</span>
          </button>
          <button
            type="button"
            className="capture-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
          >
            <span className="icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                />
                <rect
                  x="7"
                  y="9"
                  width="4"
                  height="3"
                  rx="0.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  fill="none"
                />
                <path
                  d="M11 15l2.5-3 3.5 5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>Choose Photo</span>
          </button>
        </div>
        {error && <div className="error-text">{error}</div>}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
        />
      </div>
    );
  };

  const renderPreviewStep = () => {
    if (!preview || result) return null;

    return (
      <div className="card">
        <div className="image-wrap">
          <img src={preview} alt="Food preview" />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button
          type="button"
          className="primary-btn"
          onClick={handleAnalyse}
          disabled={scanning}
        >
          {scanning ? "Analysing..." : "Analyse Food"}
        </button>
        <button
          type="button"
          className="subtle-link"
          onClick={resetAll}
          disabled={scanning}
        >
          Retake
        </button>
        {scanning && <div className="scanning-text">Analysing…</div>}
      </div>
    );
  };

  const renderResultStep = () => {
    if (!preview || !result) return null;

    const adjustedCalories = Math.round((result.calories || 0) * portionMultiplier);
    const adjustedProtein = Number((result.protein_g * portionMultiplier).toFixed(1));
    const adjustedCarbs = Number((result.carbs_g * portionMultiplier).toFixed(1));
    const adjustedFat = Number((result.fat_g * portionMultiplier).toFixed(1));

    const confidenceColor =
      result.confidence === "high"
        ? "#00c9a0"
        : result.confidence === "medium"
        ? "#f59e0b"
        : "#ef4444";
    const confidenceBg =
      result.confidence === "high"
        ? "rgba(0,201,160,0.16)"
        : result.confidence === "medium"
        ? "rgba(245,158,11,0.18)"
        : "rgba(239,68,68,0.18)";

    const portionOptions = [0.5, 1, 1.5, 2];

    return (
      <div className="card">
        <div className="result-header">
          <div className="thumb-wrap">
            <img src={preview} alt={result.meal_name || "Scanned meal"} />
          </div>
          <div className="result-header-main">
            <div className="meal-name">{result.meal_name || "Meal"}</div>
            <div
              className="confidence-pill"
              style={{ color: confidenceColor, background: confidenceBg }}
            >
              {result.confidence ? `${result.confidence} confidence` : "AI estimate"}
            </div>
          </div>
        </div>

        <div className="macro-grid">
          <div className="macro-cell">
            <div className="macro-label">CALORIES</div>
            <div className="macro-value">{adjustedCalories}</div>
          </div>
          <div className="macro-cell">
            <div className="macro-label">PROTEIN</div>
            <div className="macro-value">{adjustedProtein}g</div>
          </div>
          <div className="macro-cell">
            <div className="macro-label">CARBS</div>
            <div className="macro-value">{adjustedCarbs}g</div>
          </div>
          <div className="macro-cell">
            <div className="macro-label">FAT</div>
            <div className="macro-value">{adjustedFat}g</div>
          </div>
        </div>

        <div className="portion-row">
          <div className="portion-label">Portion size</div>
          <div className="portion-pills">
            {portionOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className={
                  "portion-pill" +
                  (portionMultiplier === opt ? " portion-pill-active" : "")
                }
                onClick={() => setPortionMultiplier(opt)}
              >
                {opt}x
              </button>
            ))}
          </div>
        </div>

        {result.notes && (
          <div className="notes">
            {result.notes}
          </div>
        )}

        {error && <div className="error-text">{error}</div>}

        <button
          type="button"
          className="primary-btn"
          onClick={handleLogMeal}
          disabled={saving}
        >
          {saved ? "Logged ✓" : saving ? "Saving…" : "Log this meal"}
        </button>
        <button
          type="button"
          className="subtle-link"
          onClick={resetAll}
          disabled={saving}
        >
          Scan another
        </button>
      </div>
    );
  };

  return (
    <div className="food-scanner-root">
      {renderCaptureStep()}
      {renderPreviewStep()}
      {renderResultStep()}
      <style jsx>{`
        .food-scanner-root {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 20px;
        }
        .card-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(238, 240, 244, 0.35);
          margin-bottom: 12px;
        }
        .capture-row {
          display: flex;
          gap: 10px;
        }
        .capture-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 1;
          height: 52px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(238, 240, 244, 0.8);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .capture-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .image-wrap {
          margin-bottom: 14px;
          border-radius: 14px;
          overflow: hidden;
        }
        .image-wrap img {
          width: 100%;
          max-height: 240px;
          object-fit: cover;
          display: block;
        }
        .primary-btn {
          width: 100%;
          height: 50px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #0a84ff, #7b61ff);
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 6px;
        }
        .primary-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .subtle-link {
          margin-top: 8px;
          background: none;
          border: none;
          padding: 0;
          font-size: 13px;
          color: rgba(238, 240, 244, 0.3);
          cursor: pointer;
        }
        .subtle-link:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .scanning-text {
          margin-top: 8px;
          font-size: 13px;
          color: rgba(238, 240, 244, 0.55);
          animation: pulseOpacity 1.2s ease-in-out infinite;
        }
        .error-text {
          margin-top: 8px;
          font-size: 12px;
          color: #ff8282;
        }
        .result-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }
        .thumb-wrap {
          width: 80px;
          height: 80px;
          border-radius: 10px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .thumb-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .result-header-main {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .meal-name {
          font-size: 17px;
          font-weight: 700;
          color: rgba(238, 240, 244, 0.95);
        }
        .confidence-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 999px;
        }
        .macro-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .macro-cell {
          padding: 10px 10px 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .macro-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(238, 240, 244, 0.35);
          margin-bottom: 4px;
        }
        .macro-value {
          font-size: 22px;
          font-weight: 700;
          color: rgba(238, 240, 244, 0.97);
        }
        .portion-row {
          margin-bottom: 12px;
        }
        .portion-label {
          font-size: 12px;
          color: rgba(238, 240, 244, 0.35);
          margin-bottom: 6px;
        }
        .portion-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .portion-pill {
          min-width: 48px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          font-size: 12px;
          font-weight: 600;
          color: rgba(238, 240, 244, 0.75);
          cursor: pointer;
        }
        .portion-pill-active {
          background: rgba(0, 201, 160, 0.15);
          border-color: #00c9a0;
          color: #00c9a0;
        }
        .notes {
          margin-bottom: 10px;
          font-size: 12px;
          font-style: italic;
          color: rgba(238, 240, 244, 0.35);
        }
        @keyframes pulseOpacity {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

