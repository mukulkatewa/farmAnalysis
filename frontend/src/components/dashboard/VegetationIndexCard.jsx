import { fieldAnalysis } from "../../api/client";
import { useManualAnalysis } from "../../hooks/useManualAnalysis";
import React, { useEffect, useMemo, useState } from "react";
import {
  Sprout,
  ChevronDown,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../../contexts/authcontext/Authcontext";
import { useTranslation } from "react-i18next";

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India centroid fallback

// Imperative overlay so we can clip to an arbitrary polygon
const HeatmapImageOverlay = ({
  imageUrl,
  bounds,
  polygon,
  opacity,
  visible,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !imageUrl || !bounds || !polygon?.length) return undefined;

    const leafletBounds = L.latLngBounds(
      [bounds.minLat, bounds.minLng], // south-west
      [bounds.maxLat, bounds.maxLng], // north-east
    );

    // Remove overlay entirely when toggled off
    if (!visible) {
      return undefined;
    }

    const overlay = L.imageOverlay(imageUrl, leafletBounds, {
      opacity,
      interactive: false,
      className: "heatmap-leaflet-overlay",
    }).addTo(map);

    const updateClip = () => {
      const img = overlay.getElement();
      if (!img) return;

      const topLeft = map.latLngToLayerPoint(leafletBounds.getNorthWest());
      const clipPoints = polygon
        .map((pt) => {
          const latLng = Array.isArray(pt)
            ? L.latLng(pt[0], pt[1])
            : L.latLng(pt.lat, pt.lng);
          const projected = map.latLngToLayerPoint(latLng);
          return `${projected.x - topLeft.x}px ${projected.y - topLeft.y}px`;
        })
        .join(", ");

      const clipPath = `polygon(${clipPoints})`;
      img.style.clipPath = clipPath;
      img.style.webkitClipPath = clipPath;
    };

    map.on("zoom", updateClip);
    map.on("move", updateClip);
    map.on("viewreset", updateClip);
    overlay.on("load", updateClip);
    updateClip();

    return () => {
      map.off("zoom", updateClip);
      map.off("move", updateClip);
      map.off("viewreset", updateClip);
      overlay.remove();
    };
  }, [map, imageUrl, bounds, polygon, opacity, visible]);

  return null;
};

const FitPolygon = ({ polygon, bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (polygon?.length) {
      const polyBounds = L.latLngBounds(polygon);
      map.fitBounds(polyBounds, { padding: [20, 20] });
      return;
    }
    if (bounds) {
      const b = L.latLngBounds(
        [bounds.maxLat, bounds.minLng],
        [bounds.minLat, bounds.maxLng],
      );
      map.fitBounds(b, { padding: [20, 20] });
    }
  }, [map, polygon, bounds]);
  return null;
};

const ReferenceIndexDisplay = ({ indexType, legendConfig, t }) => {
  const [imageError, setImageError] = useState(false);

  if (imageError || !legendConfig) {
    return (
      <div className="space-y-6">
        {/* Field area in Different zones */}
        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-gray-800">
            {t("crop_analysis_zones_title")}
          </h5>
          <div className="grid grid-cols-1 gap-2">
            {legendConfig.bands.map((band) => (
              <div
                key={band.label}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded border border-gray-200"
              >
                <div
                  className="w-12 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: band.color }}
                />
                <span className="text-xs font-medium text-gray-700">
                  {indexType}: {band.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Scale */}
        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-gray-800">
            {t("crop_analysis_scale_title")}
          </h5>

          {/* Health Status Icons */}
          <div className="flex items-center justify-between gap-2">
            {(() => {
              const getHealthStatuses = () => {
                switch (indexType) {
                  case "NDVI":
                  case "SAVI":
                    return [
                      {
                        label: t("crop_analysis_status_overgrown"),
                        color: "#1a9641",
                        icon: "🌿",
                      },
                      {
                        label: t("crop_analysis_status_healthy"),
                        color: "#a6d96a",
                        icon: "✓",
                      },
                      {
                        label: t("crop_analysis_status_moderate"),
                        color: "#fdae61",
                        icon: "!",
                      },
                      {
                        label: t("crop_analysis_status_high"),
                        color: "#d7191c",
                        icon: "✗",
                      },
                    ];
                  case "EVI":
                    return [
                      {
                        label: t("crop_analysis_status_overgrown"),
                        color: "#1a9641",
                        icon: "🌿",
                      },
                      {
                        label: t("crop_analysis_status_healthy"),
                        color: "#a6d96a",
                        icon: "✓",
                      },
                      {
                        label: t("crop_analysis_status_moderate"),
                        color: "#fdae61",
                        icon: "!",
                      },
                      {
                        label: t("crop_analysis_status_high"),
                        color: "#d7191c",
                        icon: "✗",
                      },
                    ];
                  case "NDRE":
                    return [
                      {
                        label: t("crop_analysis_status_early"),
                        color: "#1b8a3c",
                        icon: "🌱",
                      },
                      {
                        label: t("crop_analysis_status_vegetative"),
                        color: "#b2ff59",
                        icon: "🍃",
                      },
                      {
                        label: t("crop_analysis_status_flowering"),
                        color: "#c49a00",
                        icon: "🌸",
                      },
                      {
                        label: t("crop_analysis_status_maturity"),
                        color: "#bdbdbd",
                        icon: "M",
                      },
                    ];
                  default:
                    return [];
                }
              };
              return getHealthStatuses().map((status) => {
                return (
                  <div
                    key={status.label}
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 border-gray-300"
                      style={{ backgroundColor: status.color, color: "white" }}
                    >
                      {status.icon}
                    </div>
                    <span className="text-[10px] text-gray-600 text-center leading-tight">
                      {status.label}
                    </span>
                  </div>
                );
              });
            })()}
          </div>

          {/* Scale Bar */}
          <div className="space-y-1">
            <div className="h-4 w-full rounded overflow-hidden border border-gray-300 flex">
              {legendConfig.scaleStops.slice(0, -1).map((stop, idx) => {
                const next = legendConfig.scaleStops[idx + 1];
                const width = `${Math.max((next.at - stop.at) * 100, 0)}%`;
                return (
                  <div
                    key={`${stop.at}-${next.at}`}
                    style={{ width, backgroundColor: stop.color }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>0</span>
              {legendConfig.bands.map((band, idx) => {
                const parts = band.label.split(" to ");
                if (parts.length === 2) {
                  return <span key={idx}>{parts[1]}</span>;
                } else if (band.label.includes(">")) {
                  return <span key={idx}>1</span>;
                }
                return null;
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={`/reference-indices/${indexType.toLowerCase()}-reference.png`}
      alt={`${indexType} Reference Index`}
      className="w-full h-auto rounded-lg border border-gray-200"
      onError={() => setImageError(true)}
    />
  );
};

const VegetationIndexCard = ({ field, onHeatmapReady }) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();

  const [indexType, setIndexType] = useState("NDVI");
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.6);
  const [heatmapVisible, setHeatmapVisible] = useState(true);

  const polygonCoords = useMemo(() => {
    if (field?.coordinates?.length) {
      return field.coordinates.map((c) => [c.lat, c.lng]);
    }
    return [];
  }, [field]);

  const polygonBounds = useMemo(() => {
    if (!polygonCoords.length) return null;
    const lats = polygonCoords.map((p) => p[0]);
    const lngs = polygonCoords.map((p) => p[1]);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [polygonCoords]);

  useEffect(() => {
    // Whenever polygon changes, clear any previous heatmap so it doesn't linger
    onHeatmapReady?.(null);
  }, [polygonCoords, onHeatmapReady]);

  const analysis = useManualAnalysis(
    JSON.stringify([
      "vegetation",
      currentUser?.uid,
      field?.id,
      field?.lat,
      field?.lng,
      field?.radius,
      polygonCoords,
      indexType,
    ]),
    async (refresh) => {
      const result = await fieldAnalysis("vegetation", field.id, { refresh });
      return { ...result.indices[indexType], ...result, indices: undefined };
    },
    async () => {
      if (!field || !currentUser || field.id === "default") return null;
      const result = await fieldAnalysis("vegetation", field.id, {
        read: true,
      });
      return result
        ? { ...result.indices[indexType], ...result, indices: undefined }
        : null;
    },
  );
  const loading = analysis.loading,
    error = analysis.error,
    ndviData = analysis.data;
  const heatmapUrl = ndviData?.heatmap_base64
    ? `data:image/png;base64,${ndviData.heatmap_base64}`
    : "";
  const stats = ndviData?.statistics || {};
  const dominantLabel =
    Object.keys(stats).sort((a, b) => stats[b] - stats[a])[0] || "";
  useEffect(() => {
    if (!heatmapUrl) onHeatmapReady?.(null);
  }, [heatmapUrl, onHeatmapReady]);
  const handleRefresh = analysis.analyze;

  const overlayBounds = ndviData?.bounds || polygonBounds;

  const legendConfig = useMemo(() => {
    switch (indexType) {
      case "NDVI":
        return {
          title: t("legend_title_ndvi"),
          subtitle: t("legend_subtitle_ndvi"),
          bands: [
            { color: "#d7191c", label: "-1 to 0.15" },
            { color: "#fdae61", label: "0.15 to 0.25" },
            { color: "#a6d96a", label: "0.25 to 0.40" },
            { color: "#1a9641", label: "> 0.40" },
          ],
          scaleStops: [
            { color: "#1a9641", at: 0 },
            { color: "#a6d96a", at: 0.15 },
            { color: "#fdae61", at: 0.25 },
            { color: "#d7191c", at: 0.4 },
            { color: "#d7191c", at: 1 },
          ],
        };
      case "SAVI":
        return {
          title: t("legend_title_savi"),
          subtitle: t("legend_subtitle_savi"),
          bands: [
            { color: "#d7191c", label: "-1 to 0.15" },
            { color: "#fdae61", label: "0.15 to 0.25" },
            { color: "#a6d96a", label: "0.25 to 0.40" },
            { color: "#1a9641", label: "> 0.40" },
          ],
          scaleStops: [
            { color: "#1a9641", at: 0 },
            { color: "#a6d96a", at: 0.15 },
            { color: "#fdae61", at: 0.25 },
            { color: "#d7191c", at: 0.4 },
            { color: "#d7191c", at: 1 },
          ],
        };
      case "EVI":
        return {
          title: t("legend_title_evi"),
          subtitle: t("legend_subtitle_evi"),
          bands: [
            { color: "#d7191c", label: "-1 to 0.20" },
            { color: "#fdae61", label: "0.20 to 0.35" },
            { color: "#a6d96a", label: "0.35 to 0.50" },
            { color: "#1a9641", label: "> 0.50" },
          ],
          scaleStops: [
            { color: "#1a9641", at: 0 },
            { color: "#a6d96a", at: 0.2 },
            { color: "#fdae61", at: 0.35 },
            { color: "#d7191c", at: 0.5 },
            { color: "#d7191c", at: 1 },
          ],
        };
      case "NDRE":
        return {
          title: t("legend_title_ndre"),
          subtitle: t("legend_subtitle_ndre"),
          bands: [
            { color: "#bdbdbd", label: "-1 to 0.02" },
            { color: "#b2ff59", label: "0.02 to 0.12" },
            { color: "#1b8a3c", label: "0.12 to 0.22" },
            { color: "#c49a00", label: "> 0.22" },
          ],
          scaleStops: [
            { color: "#bdbdbd", at: 0 },
            { color: "#b2ff59", at: 0.02 },
            { color: "#1b8a3c", at: 0.12 },
            { color: "#c49a00", at: 0.22 },
            { color: "#c49a00", at: 1 },
          ],
        };
      default:
        return null;
    }
  }, [indexType, t]);

  // Keep parent overlay in sync when opacity/visibility change and we already have data
  useEffect(() => {
    if (!heatmapUrl || !overlayBounds || !polygonCoords.length) return;
    onHeatmapReady?.({
      heatmapUrl,
      bounds: overlayBounds,
      polygon: polygonCoords,
      opacity: heatmapOpacity,
      visible: heatmapVisible,
      indexType,
    });
  }, [
    heatmapOpacity,
    heatmapVisible,
    heatmapUrl,
    overlayBounds,
    polygonCoords,
    indexType,
    onHeatmapReady,
  ]);

  return (
    <div className="rounded-2xl border border-gray-200 shadow-md bg-white/70 backdrop-blur-xl flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white/50 backdrop-blur-md rounded-t-2xl">
        <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
          <Sprout className="h-5 w-5 text-green-600" />
          {t("crop_analysis_title_with_field", {
            name: field?.name || t("field_map_default_name"),
          })}
        </h3>

        <div className="flex gap-2">
          {Number.isFinite(field?.lat) && Number.isFinite(field?.lng) && (
            <button
              onClick={handleRefresh}
              disabled={analysis.loading || !currentUser}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <span className="text-sm font-semibold text-green-700">
                {loading ? "Analyzing…" : "Analyze"}
              </span>
            </button>
          )}

          <div className="relative flex items-center gap-2">
            <select
              disabled={analysis.loading}
              value={indexType}
              onChange={(e) => setIndexType(e.target.value)}
              className="appearance-none w-32 px-3 py-1 bg-white border border-gray-300
                         rounded-md text-xs text-gray-700 font-medium focus:ring-2 
                         focus:ring-green-300 outline-none cursor-pointer"
            >
              <option value="NDVI">{t("index_option_ndvi")}</option>
              <option value="NDRE">{t("index_option_ndre")}</option>
              <option value="SAVI">{t("index_option_savi")}</option>
              <option value="EVI">{t("index_option_evi")}</option>
            </select>
            <ChevronDown className="h-3 w-3 absolute right-2 top-2 text-gray-600 pointer-events-none" />
            <button
              onClick={() => setHeatmapVisible((prev) => !prev)}
              className="p-2 rounded-md border border-gray-200 hover:bg-gray-100"
              title={
                heatmapVisible
                  ? t("crop_analysis_hide_heatmap")
                  : t("crop_analysis_show_heatmap")
              }
            >
              {heatmapVisible ? (
                <Eye className="h-4 w-4 text-gray-700" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      <p className="px-4 pt-3 text-xs text-gray-600">
        {analysis.completedAt
          ? `Last analyzed: ${new Date(analysis.completedAt).toLocaleString()}`
          : "Select an index, then click Analyze to generate results."}
      </p>
      {analysis.data && (
        <button
          onClick={() => analysis.analyze(true)}
          disabled={analysis.loading}
          className="text-sm text-green-700 underline p-2"
        >
          Refresh satellite analysis
        </button>
      )}
      {analysis.stale && (
        <p className="px-4 text-sm text-amber-700">
          Saved satellite result is stale. Refresh explicitly to retrieve newer
          imagery.
        </p>
      )}
      {/* Reference Index Images Area */}
      <div className="p-4 flex-1 flex flex-col overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 h-full">
            <Loader2 className="h-8 w-8 text-green-400 animate-spin" />
            <p className="text-sm text-gray-600">
              {t("crop_analysis_running", { index: indexType })}
            </p>
          </div>
        ) : error ? (
          <div className="text-center p-4">
            <p className="text-red-600 text-sm mb-2">{error}</p>
            <button
              onClick={handleRefresh}
              className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded border border-red-300 hover:bg-red-200"
            >
              {t("crop_analysis_retry")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Reference Index Image */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800">
                  {t("reference_index_title", { index: indexType })}
                </h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  {t("reference_index_subtitle")}
                </p>
              </div>
              <div className="p-4">
                <ReferenceIndexDisplay
                  indexType={indexType}
                  legendConfig={legendConfig}
                  t={t}
                />
              </div>
            </div>

            {/* Statistics if available */}
            {ndviData && ndviData.statistics && (
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                  {t("crop_analysis_stats_title", { index: indexType })}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(ndviData.statistics).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <span className="text-xs text-gray-700">{key}</span>
                      <span className="text-xs font-semibold text-green-600">
                        {val}%
                      </span>
                    </div>
                  ))}
                </div>
                {dominantLabel && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">
                        {t("crop_analysis_dominant")}{" "}
                      </span>
                      {dominantLabel}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Opacity Control */}
            {ndviData && heatmapUrl && (
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">
                    {t("crop_analysis_opacity")}
                  </span>
                  <span className="text-xs font-semibold text-green-600">
                    {Math.round(heatmapOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={heatmapOpacity}
                  onChange={(e) =>
                    setHeatmapOpacity(parseFloat(e.target.value))
                  }
                  className="w-full accent-green-500"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setHeatmapVisible((prev) => !prev)}
                    className={`text-xs px-3 py-1 rounded border transition-colors ${
                      heatmapVisible
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-gray-100 text-gray-600 border-gray-300"
                    }`}
                  >
                    {heatmapVisible
                      ? t("crop_analysis_visible")
                      : t("crop_analysis_hidden")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VegetationIndexCard;
