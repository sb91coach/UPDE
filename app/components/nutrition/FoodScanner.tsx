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

type SheetState = "capture" | "preview" | "result";

type FoodScannerProps = {
  onMealLogged?: () => void;
  setToast?: (msg: string) => void;
};

export default function FoodScanner({ onMealLogged, setToast }: FoodScannerProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetState, setSheetState] = useState<SheetState>("capture");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawBase64, setRawBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [result, setResult] = useState<NutritionResult | null>(null);
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1);
  const [scanning, setScanning] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = useCallback(() => {
    setSheetState("capture");
    setPreviewUrl(null);
    setRawBase64(null);
    setMediaType(null);
    setResult(null);
    setPortionMultiplier(1);
    setScanning(false);
    setLogging(false);
    setError(null);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    resetState();
  }, [resetState]);

  const handleScanClick = () => {
    setSheetOpen(true);
    setSheetState("capture");
  };

  const handleFileSelected = useCallback((file?: File | null) => {
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const idx = dataUrl.indexOf(",");
      const base64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
      setPreviewUrl(dataUrl);
      setRawBase64(base64);
      setMediaType(file.type || "image/jpeg");
      setResult(null);
      setPortionMultiplier(1);
      setSheetState("preview");
    };
    reader.onerror = () => {
      setError("Failed to read image. Please try again.");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAnalyse = useCallback(async () => {
    if (!rawBase64 || !mediaType || scanning) return;
    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/nutrition/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: rawBase64,
          mediaType,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any)?.error || "AI analysis failed");
      }
      const data = (await res.json()) as NutritionResult;
      setResult(data);
      setSheetState("result");
    } catch (err) {
      setError((err as Error).message || "Failed to analyse image.");
    } finally {
      setScanning(false);
    }
  }, [rawBase64, mediaType, scanning]);

  const handleLogMeal = useCallback(async () => {
    if (!result || logging) return;
    setLogging(true);
    setError(null);

    const calories = Math.round((result.calories || 0) * portionMultiplier);
    const protein_g = Number((result.protein_g * portionMultiplier).toFixed(1));
    const carbs_g = Number((result.carbs_g * portionMultiplier).toFixed(1));
    const fat_g = Number((result.fat_g * portionMultiplier).toFixed(1));

    try {
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_name: result.meal_name,
          calories,
          protein_g,
          carbs_g,
          fat_g,
          portion_multiplier: portionMultiplier,
          notes: result.notes,
          raw_ai_response: result.raw_ai_response,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any)?.error || "Failed to log meal");
      }

      // Notify parent so it can refresh history and show toast.
      onMealLogged?.();
      setToast?.("Meal logged ✓");

      closeSheet();
    } catch (err) {
      setError((err as Error).message || "Failed to log meal.");
    } finally {
      setLogging(false);
    }
  }, [result, logging, portionMultiplier, closeSheet]);

  const renderSheetBody = () => {
    // STATE 1 — CAPTURE
    if (sheetState === "capture") {
      return (
        <>
          <div style={{ marginBottom: 16 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "rgba(238,240,244,0.98)",
              }}
            >
              Log Food
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13,
                color: "rgba(238,240,244,0.5)",
              }}
            >
              Take a photo or choose from your library.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={scanning || logging}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                width: "100%",
                height: 50,
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <rect
                  x="3"
                  y="6"
                  width="18"
                  height="14"
                  rx="3"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                  fill="none"
                />
                <path
                  d="M9 6.5L10.5 4h3L15 6.5"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="13"
                  r="3.25"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                  fill="none"
                />
              </svg>
              <span>Take Photo</span>
            </button>
            <button
              type="button"
              onClick={() => libraryInputRef.current?.click()}
              disabled={scanning || logging}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                width: "100%",
                height: 50,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(238,240,244,0.9)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2.5"
                  stroke="rgba(238,240,244,0.9)"
                  strokeWidth="1.6"
                  fill="none"
                />
                <rect
                  x="7"
                  y="9"
                  width="4"
                  height="3"
                  rx="0.5"
                  stroke="rgba(238,240,244,0.9)"
                  strokeWidth="1.4"
                  fill="none"
                />
                <path
                  d="M11 15l2.5-3 3.5 5"
                  stroke="rgba(238,240,244,0.9)"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Choose from Library</span>
            </button>
          </div>
          {error && (
            <p
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#ff8080",
              }}
            >
              {error}
            </p>
          )}
        </>
      );
    }

    // STATE 2 — PREVIEW AND ANALYSE
    if (sheetState === "preview" && previewUrl) {
      return (
        <>
          <div style={{ marginBottom: 12 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "rgba(238,240,244,0.98)",
              }}
            >
              Confirm Photo
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13,
                color: "rgba(238,240,244,0.5)",
              }}
            >
              Make sure your plate is clearly visible.
            </p>
          </div>
          <div
            style={{
              width: "100%",
              height: 200,
              borderRadius: 14,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            <img
              src={previewUrl}
              alt="Food preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
          {error && (
            <p
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "#ff8080",
              }}
            >
              {error}
            </p>
          )}
          {!scanning ? (
            <button
              type="button"
              onClick={handleAnalyse}
              style={{
                width: "100%",
                height: 50,
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              Analyse with AI
            </button>
          ) : (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 13,
                color: "rgba(238,240,244,0.7)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{
                  animation: "foodScannerSpin 0.9s linear infinite",
                }}
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="rgba(238,240,244,0.4)"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="#00c9a0"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              <span>Analysing your food...</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setPreviewUrl(null);
              setRawBase64(null);
              setMediaType(null);
              setResult(null);
              setSheetState("capture");
            }}
            style={{
              marginTop: 10,
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 12,
              color: "rgba(238,240,244,0.45)",
              cursor: "pointer",
            }}
          >
            Choose different photo
          </button>
        </>
      );
    }

    // STATE 3 — RESULT
    if (sheetState === "result" && previewUrl && result) {
      const calories = Math.round((result.calories || 0) * portionMultiplier);
      const protein = Number((result.protein_g * portionMultiplier).toFixed(1));
      const carbs = Number((result.carbs_g * portionMultiplier).toFixed(1));
      const fat = Number((result.fat_g * portionMultiplier).toFixed(1));

      const conf = (result.confidence || "").toLowerCase();
      const confColor =
        conf === "high" ? "#00c9a0" : conf === "medium" ? "#f59e0b" : "#ef4444";
      const confBg =
        conf === "high"
          ? "rgba(0,201,160,0.16)"
          : conf === "medium"
          ? "rgba(245,158,11,0.18)"
          : "rgba(239,68,68,0.18)";

      const portionOptions = [
        { label: "½x", value: 0.5 },
        { label: "1x", value: 1 },
        { label: "1½x", value: 1.5 },
        { label: "2x", value: 2 },
      ];

      return (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 10,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <img
                src={previewUrl}
                alt={result.meal_name || "Scanned meal"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "rgba(238,240,244,0.98)",
                  marginBottom: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {result.meal_name || "Meal"}
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 10px",
                  borderRadius: 9999,
                  background: confBg,
                  color: confColor,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {conf ? `${conf.charAt(0).toUpperCase()}${conf.slice(1)} confidence` : "AI estimate"}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(238,240,244,0.35)",
                  marginBottom: 4,
                }}
              >
                Calories
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#00c9a0",
                }}
              >
                {calories}
              </div>
            </div>
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(238,240,244,0.35)",
                  marginBottom: 4,
                }}
              >
                Protein
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "rgba(238,240,244,0.97)",
                }}
              >
                {protein} g
              </div>
            </div>
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(238,240,244,0.35)",
                  marginBottom: 4,
                }}
              >
                Carbs
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "rgba(238,240,244,0.97)",
                }}
              >
                {carbs} g
              </div>
            </div>
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(238,240,244,0.35)",
                  marginBottom: 4,
                }}
              >
                Fat
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "rgba(238,240,244,0.97)",
                }}
              >
                {fat} g
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 12,
                color: "rgba(238,240,244,0.45)",
                marginBottom: 6,
              }}
            >
              Portion size
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {portionOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setPortionMultiplier(opt.value)}
                  style={
                    portionMultiplier === opt.value
                      ? {
                          borderRadius: 9999,
                          padding: "6px 10px",
                          border: "1px solid #00c9a0",
                          background: "rgba(0,201,160,0.16)",
                          color: "#00c9a0",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }
                      : {
                          borderRadius: 9999,
                          padding: "6px 10px",
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.04)",
                          color: "rgba(238,240,244,0.75)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {result.notes && (
            <p
              style={{
                marginTop: 0,
                marginBottom: 10,
                fontSize: 12,
                fontStyle: "italic",
                color: "rgba(238,240,244,0.38)",
              }}
            >
              {result.notes}
            </p>
          )}

          {error && (
            <p
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 12,
                color: "#ff8080",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogMeal}
            disabled={logging}
            style={{
              width: "100%",
              height: 50,
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg,#0A84FF,#7B61FF)",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 700,
              cursor: logging ? "default" : "pointer",
              marginTop: 4,
            }}
          >
            {logging ? "Logging..." : "Log Meal"}
          </button>
          <button
            type="button"
            onClick={closeSheet}
            style={{
              marginTop: 10,
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 13,
              color: "rgba(238,240,244,0.45)",
              cursor: "pointer",
              textAlign: "center",
              width: "100%",
            }}
          >
            Cancel
          </button>
        </>
      );
    }

    return null;
  };

  return (
    <>
      {/* Entry button */}
      <button
        type="button"
        onClick={handleScanClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(0,201,160,0.08)",
          border: "1px solid rgba(0,201,160,0.15)",
          borderRadius: 14,
          padding: "14px 18px",
          cursor: "pointer",
          width: "100%",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <rect
              x="3"
              y="6"
              width="18"
              height="14"
              rx="3"
              stroke="#00c9a0"
              strokeWidth="1.6"
              fill="none"
            />
            <path
              d="M9 6.5L10.5 4h3L15 6.5"
              stroke="#00c9a0"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="12"
              cy="13"
              r="3.25"
              stroke="#00c9a0"
              strokeWidth="1.6"
              fill="none"
            />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(238,240,244,0.9)",
            }}
          >
            Scan Food
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(238,240,244,0.35)",
              marginTop: 2,
            }}
          >
            AI-powered macro analysis
          </div>
        </div>
        <span
          aria-hidden
          style={{
            fontSize: 20,
            color: "rgba(238,240,244,0.2)",
          }}
        >
          ›
        </span>
      </button>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
      />

      {/* Bottom sheet modal */}
      {sheetOpen && (
        <>
          <div
            onClick={closeSheet}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              zIndex: 500,
            }}
          />
          <div
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 501,
              transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
              transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#0f1117",
                borderRadius: "24px 24px 0 0",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                padding: "20px 20px calc(40px + env(safe-area-inset-bottom))",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "block",
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.15)",
                  margin: "0 auto 20px",
                }}
              />
              {renderSheetBody()}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes foodScannerSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}

