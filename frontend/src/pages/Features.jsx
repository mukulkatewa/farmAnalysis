import React from "react";
import Navbar from "../components/dashboard/Navbar";
import Sidebar from "../components/dashboard/Sidebar";
import { useAuth } from "../contexts/authcontext/Authcontext";
import { Navigate, useNavigate } from "react-router-dom";
import { doSignOut } from "../firebase/auth";

const Features = () => {
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await doSignOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!userLoggedIn) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100">


      {/* NAV + SIDEBAR */}
      <Navbar currentUser={currentUser} onLogout={handleLogout} />
      <Sidebar />

      {/* MAIN CONTENT (SHIFTED LIKE FARM SELECTION) */}
      <div className="pt-20 lg:ml-64 px-8">

        {/* =================== SECTION WRAPPER =================== */}
        <section id="features" className="py-8">
          <div className="max-w-7xl mx-auto">

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Features</h2>
              <p className="mt-2 text-gray-600">
                Real-time insights from your fields
              </p>
            </div>

            {/* =================== FIRST ROW =================== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

              {/* Vegetation Indices */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Vegetation Indices
                  </h3>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Healthy
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">NDVI</span>
                    <span className="font-medium">0.78</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">NDWI</span>
                    <span className="font-medium">0.45</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">SAVI</span>
                    <span className="font-medium">0.62</span>
                  </div>
                </div>
              </div>

              {/* Soil Conditions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Soil Conditions
                  </h3>
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    Moderate
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Moisture</span>
                    <span className="font-medium">42%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Temperature</span>
                    <span className="font-medium">18°C</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">pH Level</span>
                    <span className="font-medium">6.8</span>
                  </div>
                </div>
              </div>

              {/* AI Risk Score */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    AI Risk Score
                  </h3>
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    High
                  </span>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">7.2/10</div>
                  <p className="text-sm text-gray-600">
                    Potential pest outbreak detected
                  </p>
                </div>
              </div>
            </div>

            {/* =================== SECOND ROW =================== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

              {/* GIS MAP */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Interactive GIS Map
                </h3>

                <div className="relative h-64 bg-gray-100 rounded-md overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1749039420082-fa9a52e7fcb7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                    alt="Aerial"
                    className="w-full h-full object-cover opacity-30"
                  />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white rounded-md p-4 shadow-lg border border-gray-200/30">
                      <p className="text-sm font-medium text-gray-900">
                        Risk Zone: Northeast Corner
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        High moisture + pest activity
                      </p>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 bg-white rounded-md p-2 shadow-sm border border-gray-300">
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Low Risk</span>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Medium Risk</span>
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>High Risk</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* WEATHER FORECAST */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Weather Forecast
                </h3>

                <div className="space-y-4">

                  {/* TODAY */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-200/40">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                        <svg
                          className="w-4 h-4 text-yellow-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-900">Today</p>
                        <p className="text-xs text-gray-600">Partly cloudy</p>
                      </div>
                    </div>

                    <span className="text-lg font-semibold text-gray-900">24°C</span>
                  </div>

                  {/* TOMORROW */}
                  <div className="flex items-center justify-between py-2 border-b border-gray-200/40">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <svg
                          className="w-4 h-4 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9z"
                          />
                        </svg>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-900">Tomorrow</p>
                        <p className="text-xs text-gray-600">Light rain</p>
                      </div>
                    </div>

                    <span className="text-lg font-semibold text-gray-900">
                      19°C
                    </span>
                  </div>

                  {/* WEDNESDAY */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <svg
                          className="w-4 h-4 text-orange-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Wednesday
                        </p>
                        <p className="text-xs text-gray-600">Sunny</p>
                      </div>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      26°C
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* =================== IOT SENSORS =================== */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                IoT Sensor Readings
              </h3>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Moisture */}
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="mx-auto h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                    <svg
                      className="h-4 w-4 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4 4 0 003 15z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">Moisture</p>
                  <p className="text-lg font-semibold text-gray-900">42%</p>
                </div>

                {/* Temperature */}
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="mx-auto h-8 w-8 bg-red-100 rounded-full flex items-center justify-center mb-2">
                    <svg
                      className="h-4 w-4 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">Temperature</p>
                  <p className="text-lg font-semibold text-gray-900">18°C</p>
                </div>

                {/* Humidity */}
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="mx-auto h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mb-2">
                    <svg
                      className="h-4 w-4 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4 4 0 003 15z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">Humidity</p>
                  <p className="text-lg font-semibold text-gray-900">67%</p>
                </div>

                {/* Light */}
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="mx-auto h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                    <svg
                      className="h-4 w-4 text-yellow-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">Light</p>
                  <p className="text-lg font-semibold text-gray-900">850 lx</p>
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
};

export default Features;
