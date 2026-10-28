import { useCallback } from "react";
import React, { useState, useEffect } from "react";
import Navbar from "../components/dashboard/Navbar";
import Sidebar from "../components/dashboard/Sidebar";
import { useAuth } from "../contexts/authcontext/Authcontext";
import { Navigate, useNavigate } from "react-router-dom";
import { doSignOut } from "../firebase/auth";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Briefcase, Store, TrendingUp, Users } from "lucide-react";

const VendorHome = () => {
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchVendorData = useCallback(async () => {
    try {
      const vendorRef = doc(db, "vendors", currentUser.uid);
      const vendorSnap = await getDoc(vendorRef);
      if (vendorSnap.exists()) {
        setVendorData(vendorSnap.data());
      }
    } catch (error) {
      console.error("Error fetching vendor data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  useEffect(() => {
    if (currentUser) {
      fetchVendorData();
    }
  }, [currentUser, fetchVendorData]);

  const handleLogout = async () => {
    try {
      await doSignOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!userLoggedIn) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-100">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const hasProfile =
    vendorData &&
    vendorData.name &&
    vendorData.services &&
    vendorData.services.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />
      <Sidebar />

      <div className="pt-20 lg:ml-64 px-4 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">
              Welcome back, {vendorData?.name || "Vendor"}! 👋
            </h1>
            <p className="text-gray-600 text-base">
              Manage your business and connect with farmers
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Services Offered</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {vendorData?.services?.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Store className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Profile Status</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {hasProfile ? "Complete" : "Incomplete"}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Quick Actions</p>
                  <p className="text-lg font-semibold text-gray-900">
                    View All
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Store className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Vendor Profile
                  </h2>
                  <p className="text-sm text-gray-600">
                    Manage your business information
                  </p>
                </div>
              </div>
              {!hasProfile ? (
                <div className="space-y-3">
                  <p className="text-gray-600 text-sm">
                    Complete your vendor profile to start connecting with
                    farmers
                  </p>
                  <button
                    onClick={() => navigate("/vendor-dashboard")}
                    className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Complete Profile
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Business:</span>{" "}
                      {vendorData.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Location:</span>{" "}
                      {vendorData.location || "Not set"}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Services:</span>{" "}
                      {vendorData.services.length} active
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/vendor-dashboard")}
                    className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </div>

            {/* Opportunities Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Business Opportunities
                  </h2>
                  <p className="text-sm text-gray-600">Find farmers near you</p>
                </div>
              </div>
              {!hasProfile ? (
                <div className="space-y-3">
                  <p className="text-gray-600 text-sm">
                    Complete your profile first to see business opportunities
                  </p>
                  <button
                    onClick={() => navigate("/vendor-dashboard")}
                    disabled
                    className="w-full py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-medium"
                  >
                    Complete Profile First
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-600 text-sm">
                    Discover farmers in your area who need your services
                  </p>
                  <button
                    onClick={() => navigate("/vendor-opportunities")}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    View Opportunities →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Services Overview */}
          {hasProfile && vendorData.services.length > 0 && (
            <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Your Services
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {vendorData.services.map((service) => {
                  const serviceLabels = {
                    insurance: "Insurance",
                    machinery: "🚜 Machinery",
                    logistics: "🚚 Logistics",
                    buyCrops: "🛒 Buy Crops",
                  };
                  return (
                    <div
                      key={service}
                      className="p-4 bg-green-50 border border-green-200 rounded-lg text-center"
                    >
                      <p className="text-sm font-medium text-green-800">
                        {serviceLabels[service] || service}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorHome;
