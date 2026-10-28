import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  CloudRain,
  Cloud,
  Sun,
  CloudDrizzle,
  Wind,
  Thermometer,
  MapPin,
  Loader2,
  RefreshCw,
  AlertTriangle,
  MapPinned,
} from "lucide-react";
import { useAuth } from "../../contexts/authcontext/Authcontext";
import { db } from "../../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

const NewsSection = ({ selectedField }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fieldLocation, setFieldLocation] = useState(null);

  const [usingFieldLocation, setUsingFieldLocation] = useState(false);
  const generation = useRef(0),
    controller = useRef(null);
  const loadWeather = useCallback(async () => {
    const id = ++generation.current;
    controller.current?.abort();
    controller.current = new AbortController();
    setLoading(true);
    setError(null);
    setWeatherData(null);
    try {
      if (!currentUser) return;
      if (!OPENWEATHER_API_KEY)
        throw new Error("Weather service is not configured.");
      let lat = selectedField?.lat,
        lon = selectedField?.lng;
      const fromField = Number.isFinite(lat) && Number.isFinite(lon);
      if (!fromField) {
        const snapshot = await getDoc(doc(db, "users", currentUser.uid));
        const location = snapshot.data()?.location;
        lat = location?.latitude;
        lon = location?.longitude;
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lon))
        throw new Error(
          "Select a field or share your location to view weather.",
        );
      const options = {
        params: { lat, lon, appid: OPENWEATHER_API_KEY, units: "metric" },
        timeout: 10000,
        signal: controller.current.signal,
      };
      const [current, forecast] = await Promise.all([
        axios.get(OPENWEATHER_BASE_URL + "/weather", options),
        axios.get(OPENWEATHER_BASE_URL + "/forecast", options),
      ]);
      if (id !== generation.current) return;
      setUsingFieldLocation(fromField);
      setFieldLocation(
        fromField
          ? {
              fieldName: selectedField.fieldName || selectedField.name,
              cropName: selectedField.cropName,
            }
          : null,
      );
      setWeatherData({
        current: current.data,
        forecast: forecast.data,
        location: current.data.name || "Selected location",
        locationName: fromField ? "Your field" : "Your location",
      });
    } catch (err) {
      if (id === generation.current && !axios.isCancel(err))
        setError(err.response ? "Weather provider unavailable." : err.message);
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, [currentUser, selectedField]);
  const cancelWeather = useCallback(() => {
    generation.current++;
    controller.current?.abort();
  }, []);
  useEffect(() => {
    loadWeather();
    return cancelWeather;
  }, [loadWeather, cancelWeather]);
  const handleRetry = loadWeather;
  const requestLocationNow = () => {
    if (!currentUser || !navigator.geolocation) {
      setError("Location is not available.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await setDoc(
            doc(db, "users", currentUser.uid),
            {
              location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: new Date().toISOString(),
              },
            },
            { merge: true },
          );
          loadWeather();
        } catch {
          setError("Could not save your location.");
        }
      },
      () => setError("Location permission was denied or timed out."),
      { timeout: 10000, maximumAge: 300000 },
    );
  };

  const getWeatherIcon = (main) => {
    const iconMap = {
      Clear: Sun,
      Clouds: Cloud,
      Rain: CloudRain,
      Drizzle: CloudDrizzle,
      Thunderstorm: CloudRain,
      Snow: CloudRain,
      Mist: Cloud,
      Fog: Cloud,
      Haze: Cloud,
    };
    return iconMap[main] || Cloud;
  };

  const getWeatherColor = (main) => {
    const colorMap = {
      Clear: {
        border: "border-yellow-300",
        bg: "bg-yellow-50",
        text: "text-yellow-700",
      },
      Clouds: {
        border: "border-gray-300",
        bg: "bg-gray-50",
        text: "text-gray-700",
      },
      Rain: {
        border: "border-blue-300",
        bg: "bg-blue-50",
        text: "text-blue-700",
      },
      Drizzle: {
        border: "border-blue-300",
        bg: "bg-blue-50",
        text: "text-blue-700",
      },
      Thunderstorm: {
        border: "border-purple-300",
        bg: "bg-purple-50",
        text: "text-purple-700",
      },
      Snow: {
        border: "border-cyan-300",
        bg: "bg-cyan-50",
        text: "text-cyan-700",
      },
    };
    return (
      colorMap[main] || {
        border: "border-gray-300",
        bg: "bg-gray-50",
        text: "text-gray-700",
      }
    );
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  const translateWeatherDescription = (description) => {
    // Map common weather descriptions to translation keys
    const descLower = description.toLowerCase();

    if (descLower.includes("clear")) return t("weather_condition_clear");
    if (descLower.includes("cloud")) return t("weather_condition_clouds");
    if (descLower.includes("rain")) return t("weather_condition_rain");
    if (descLower.includes("drizzle")) return t("weather_condition_drizzle");
    if (descLower.includes("thunderstorm") || descLower.includes("thunder"))
      return t("weather_condition_thunderstorm");
    if (descLower.includes("snow")) return t("weather_condition_snow");
    if (descLower.includes("mist")) return t("weather_condition_mist");
    if (descLower.includes("fog")) return t("weather_condition_fog");
    if (descLower.includes("haze")) return t("weather_condition_haze");
    if (descLower.includes("smoke")) return t("weather_condition_smoke");
    if (descLower.includes("dust")) return t("weather_condition_dust");

    // Fallback to original description with capitalization
    return description.charAt(0).toUpperCase() + description.slice(1);
  };

  const getWeatherNews = () => {
    if (!weatherData || !weatherData.current) return [];

    const news = [];
    const current = weatherData.current;
    const forecast = weatherData.forecast;
    const weatherMain = current.weather[0].main;
    const colors = getWeatherColor(weatherMain);
    const Icon = getWeatherIcon(weatherMain);

    // Current weather update
    news.push({
      title: `${t("weather_current_title")}: ${translateWeatherDescription(current.weather[0].description)}`,
      desc: `${t("weather_temperature")}: ${Math.round(current.main.temp)}°C | ${t("weather_feels_like")}: ${Math.round(current.main.feels_like)}°C | ${t("weather_humidity")}: ${current.main.humidity}% | ${t("weather_wind")}: ${current.wind.speed} m/s`,
      time: formatTime(current.dt),
      icon: Icon,
      ...colors,
      priority: "current",
    });

    // Check for rain in forecast (next 24 hours)
    if (forecast && forecast.list) {
      const next24Hours = forecast.list.slice(0, 8);
      const hasRain = next24Hours.some(
        (item) =>
          item.weather[0].main === "Rain" ||
          item.weather[0].main === "Drizzle" ||
          item.weather[0].main === "Thunderstorm",
      );

      if (hasRain) {
        const rainForecast = next24Hours.find(
          (item) =>
            item.weather[0].main === "Rain" ||
            item.weather[0].main === "Drizzle" ||
            item.weather[0].main === "Thunderstorm",
        );
        if (rainForecast) {
          news.push({
            title: t("weather_rain_title"),
            desc: t("weather_rain_desc", {
              time: new Date(rainForecast.dt * 1000).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }),
            time: formatTime(rainForecast.dt),
            icon: CloudRain,
            border: "border-blue-300",
            bg: "bg-blue-50",
            text: "text-blue-700",
            priority: "alert",
          });
        }
      }
    }

    // Temperature alerts
    if (current.main.temp > 35) {
      news.push({
        title: t("weather_heat_title"),
        desc: t("weather_heat_desc", { value: Math.round(current.main.temp) }),
        time: formatTime(current.dt),
        icon: Thermometer,
        border: "border-red-300",
        bg: "bg-red-50",
        text: "text-red-700",
        priority: "alert",
      });
    } else if (current.main.temp < 10) {
      news.push({
        title: t("weather_cold_title"),
        desc: t("weather_cold_desc", { value: Math.round(current.main.temp) }),
        time: formatTime(current.dt),
        icon: Thermometer,
        border: "border-cyan-300",
        bg: "bg-cyan-50",
        text: "text-cyan-700",
        priority: "alert",
      });
    }

    // Wind alert
    if (current.wind.speed > 10) {
      news.push({
        title: t("weather_wind_title"),
        desc: t("weather_wind_desc", { value: current.wind.speed }),
        time: formatTime(current.dt),
        icon: Wind,
        border: "border-orange-300",
        bg: "bg-orange-50",
        text: "text-orange-700",
        priority: "alert",
      });
    }

    // Humidity alert
    if (current.main.humidity > 85) {
      news.push({
        title: t("weather_humidity_title"),
        desc: t("weather_humidity_desc", { value: current.main.humidity }),
        time: formatTime(current.dt),
        icon: CloudDrizzle,
        border: "border-teal-300",
        bg: "bg-teal-50",
        text: "text-teal-700",
        priority: "alert",
      });
    }

    return news;
  };

  const news = getWeatherNews();

  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">
            {t("weather_title")}
          </h2>
          {weatherData && (
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {weatherData.location}
              </p>
              {usingFieldLocation && fieldLocation && (
                <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                  <MapPinned className="h-3 w-3" />
                  {t("weather_using_field")} {fieldLocation.fieldName}
                  {fieldLocation.cropName && ` (${fieldLocation.cropName})`}
                </p>
              )}
              {!usingFieldLocation && (
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {t("weather_using_live")}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {weatherData && !loading && (
            <button
              onClick={handleRetry}
              className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
              title={t("weather_refresh_title")}
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          )}
          {loading && (
            <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading && !weatherData && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 text-green-600 animate-spin mb-3" />
            <span className="text-gray-600 font-medium">
              {t("weather_loading")}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              {usingFieldLocation
                ? t("weather_getting_field")
                : t("weather_getting_live")}
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-300 p-4 rounded-lg">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 font-medium mb-1">
                  {t("weather_location_required")}
                </p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={requestLocationNow}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors shadow-sm"
              >
                <MapPin className="h-4 w-4" />
                {t("weather_enable_now")}
              </button>
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                {t("weather_try_again")}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">{t("weather_tip")}</p>
          </div>
        )}

        {!loading && !error && news.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Cloud className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>{t("weather_no_updates")}</p>
          </div>
        )}

        {news.length > 0 &&
          news.map((item, i) => {
            const Icon = item.icon;

            return (
              <div
                key={i}
                className={`
                ${item.bg} border-l-4 ${item.border} 
                p-4 rounded-lg hover:shadow-md transition-all duration-200 cursor-default
              `}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-6 w-6 ${item.text} flex-shrink-0`} />

                  <div className="flex-1">
                    <h4 className={`font-semibold ${item.text}`}>
                      {item.title}
                    </h4>

                    <p className="text-sm text-gray-600 mt-1">{item.desc}</p>

                    <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default NewsSection;
