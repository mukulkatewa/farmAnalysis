import React from "react";
import { riskScore } from "../../utils/risk";
import {
  Leaf,
  Sprout,
  Trees,
  AlertTriangle,
  Thermometer,
  Activity,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const StatsCards = ({
  totalFields = 1,
  alertsData = { total: 0, highPriority: 0 },
  weatherData = null,
  lstmData = null,
}) => {
  const { t } = useTranslation();

  // Calculate percentage for active fields (assuming max 10 fields as 100%)
  const fieldPercentage =
    totalFields > 0 ? Math.min((totalFields / 10) * 100, 100).toFixed(0) : "0";

  // Calculate high priority percentage (out of total alerts)
  const highPriorityPercentage =
    alertsData.total > 0
      ? ((alertsData.highPriority / alertsData.total) * 100).toFixed(0)
      : "0";

  // Get temperature from weather data
  const temperature =
    weatherData && weatherData.main && Number.isFinite(weatherData.main.temp)
      ? `${Math.round(weatherData.main.temp)}°C`
      : "--";

  const tempStatus =
    weatherData && weatherData.main && Number.isFinite(weatherData.main.temp)
      ? weatherData.main.temp >= 15 && weatherData.main.temp <= 30
        ? t("temperature_status_optimal")
        : t("temperature_status_monitor")
      : t("loading");

  const rawRisk = lstmData?.forecast?.day_1?.disease_risk;
  const diseasePercentage = riskScore(rawRisk);
  const diseaseStatus =
    diseasePercentage === null
      ? t("disease_status_nodata")
      : t(
          diseasePercentage === 0
            ? "disease_status_none"
            : diseasePercentage < 30
              ? "disease_status_low"
              : diseasePercentage < 60
                ? "disease_status_moderate"
                : "disease_status_high",
        );

  const activeFieldsPercentageText = t("stats_active_fields_percent", {
    value: fieldPercentage,
  });
  const highPriorityText =
    alertsData.total > 0
      ? t("stats_high_priority", { value: highPriorityPercentage })
      : "";

  const stats = [
    {
      titleKey: "stats_active_fields",
      subtitleKey: "stats_active_fields_sub",
      value: totalFields,
      percentage: activeFieldsPercentageText,
      icon: Trees,
      bg: "bg-green-50",
      border: "border-green-200",
      iconBg: "bg-green-100",
      text: "text-green-700",
    },
    {
      title: t("temperature_title"),
      subtitle: tempStatus,
      value: temperature,
      icon: Thermometer,
      bg: "bg-lime-50",
      border: "border-lime-200",
      iconBg: "bg-lime-100",
      text: "text-lime-700",
    },
    {
      title: "Disease risk score",
      subtitle: diseaseStatus,
      value:
        diseasePercentage === null
          ? "--"
          : `${diseasePercentage.toFixed(1)} / 100`,
      icon: Activity,
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      iconBg: "bg-yellow-100",
      text: "text-yellow-700",
    },
    {
      titleKey: "stats_active_alerts",
      subtitleKey: "stats_active_alerts_sub",
      value: alertsData.total ?? "--",
      percentage: highPriorityText,
      icon: AlertTriangle,
      bg: "bg-red-50",
      border: "border-red-200",
      iconBg: "bg-red-100",
      text: "text-red-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((card, i) => {
        const Icon = card.icon;

        return (
          <div
            key={i}
            className={`
              rounded-xl p-6 border transition-all hover:shadow-md
              ${card.bg} ${card.border}
            `}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <h3 className={`text-sm font-medium ${card.text}`}>
                {card.titleKey ? t(card.titleKey) : card.title}
              </h3>

              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <Icon className={`w-5 h-5 ${card.text}`} />
              </div>
            </div>

            {/* Values (exact screenshot styling) */}
            <div className="space-y-1">
              <div
                className={`text-[1.75rem] font-semibold leading-tight ${card.text}`}
              >
                {card.value}
              </div>

              <p className={`text-[11px] opacity-60 ${card.text}`}>
                {card.subtitleKey ? t(card.subtitleKey) : card.subtitle}
              </p>

              {/* Show percentage if available */}
              {card.percentage && (
                <p className={`text-xs font-semibold ${card.text} mt-1`}>
                  {card.percentage}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
