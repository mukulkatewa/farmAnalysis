import { useCallback } from "react";
import { authenticatedFetch } from "../api/client";
import { API_BASE } from "../api/endpoints";
import React, { useState, useEffect } from "react";
import Navbar from "../components/dashboard/Navbar";
import Sidebar from "../components/dashboard/Sidebar";
import { useAuth } from "../contexts/authcontext/Authcontext";
import { Navigate, useNavigate } from "react-router-dom";
import { doSignOut } from "../firebase/auth";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  User,
  Package,
  Shield,
  Wrench,
  ShoppingCart,
  Search,
} from "lucide-react";

const getNeededServices = (_farmer) => {
  // This is a placeholder - in a real app, you'd check farmer's needs
  // For now, we'll show all services as potential needs
  return ["Insurance", "Machinery", "Logistics", "Buy Crops"];
};
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};
const VendorOpportunities = () => {
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterService, setFilterService] = useState("all");

  const fetchVendorData = useCallback(async () => {
    try {
      const vendorRef = doc(db, "vendors", currentUser.uid);
      const vendorSnap = await getDoc(vendorRef);
      if (vendorSnap.exists()) {
        setVendorData(vendorSnap.data());
      }
    } catch (error) {
      console.error("Error fetching vendor data:", error);
    }
  }, [currentUser]);

  const fetchOpportunities = useCallback(async () => {
    try {
      const farmersList = await (
        await authenticatedFetch(`${API_BASE}/api/directory`)
      ).json();
      // Get vendor location
      const vendorRef = doc(db, "vendors", currentUser.uid);
      const vendorSnap = await getDoc(vendorRef);
      let vendorLocation = null;
      if (vendorSnap.exists() && vendorSnap.data().locationCoords) {
        vendorLocation = vendorSnap.data().locationCoords;
      }

      // Calculate distances and create opportunities
      const opps = farmersList.map((farmer) => {
        const distance =
          vendorLocation && farmer.location
            ? calculateDistance(
                vendorLocation.latitude,
                vendorLocation.longitude,
                farmer.location.latitude,
                farmer.location.longitude,
              )
            : null;

        return {
          farmerId: farmer.id,
          farmerName:
            farmer.firstName && farmer.lastName
              ? `${farmer.firstName} ${farmer.lastName}`
              : farmer.email?.split("@")[0] || "Farmer",
          farmerEmail: farmer.email,
          farmerPhone: farmer.phone,
          location: farmer.farmAddress || "Location not specified",
          distance: distance,
          needsServices: getNeededServices(farmer),
        };
      });

      setOpportunities(opps);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  useEffect(() => {
    if (currentUser) {
      fetchVendorData();
      fetchOpportunities();
    }
  }, [currentUser, fetchVendorData, fetchOpportunities]);

  const getServiceIcon = (service) => {
    switch (service) {
      case "Insurance":
        return <Shield className="w-4 h-4" />;
      case "Machinery":
        return <Wrench className="w-4 h-4" />;
      case "Logistics":
        return <Package className="w-4 h-4" />;
      case "Buy Crops":
        return <ShoppingCart className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterService === "all" ||
      (vendorData?.services &&
        vendorData.services.some((s) => {
          const serviceMap = {
            insurance: "Insurance",
            machinery: "Machinery",
            logistics: "Logistics",
            buyCrops: "Buy Crops",
          };
          return serviceMap[s] === filterService;
        }));

    return matchesSearch && matchesFilter;
  });

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
    <>
      <Navbar currentUser={currentUser} onLogout={handleLogout} />
      <Sidebar />

      <div className="pt-20 lg:ml-64 px-4 sm:px-6 lg:px-8 pb-8 min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">
              💼 Business Opportunities
            </h1>
            <p className="text-gray-600 text-base">
              Connect with farmers near you who need your services
            </p>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by farmer name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 outline-none text-gray-700"
                />
              </div>
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Services</option>
                {vendorData?.services?.includes("insurance") && (
                  <option value="Insurance">Insurance</option>
                )}
                {vendorData?.services?.includes("machinery") && (
                  <option value="Machinery">Machinery</option>
                )}
                {vendorData?.services?.includes("logistics") && (
                  <option value="Logistics">Logistics</option>
                )}
                {vendorData?.services?.includes("buyCrops") && (
                  <option value="Buy Crops">Buy Crops</option>
                )}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Opportunities Found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "Try a different search term"
                  : "No farmers are currently registered in your area. Check back later!"}
              </p>
              {!vendorData?.locationCoords && (
                <p className="text-sm text-orange-600 mt-2">
                  Tip: Add your location in Vendor Dashboard to see nearby
                  farmers
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOpportunities.map((opp) => (
                <div
                  key={opp.farmerId}
                  className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {opp.farmerName}
                      </h3>
                      {opp.distance && (
                        <p className="text-sm text-green-600 font-medium">
                          {opp.distance} km away
                        </p>
                      )}
                    </div>
                    <User className="w-8 h-8 text-blue-600" />
                  </div>

                  <div className="space-y-2 mb-4">
                    {opp.location && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{opp.location}</span>
                      </div>
                    )}
                    {opp.farmerEmail && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{opp.farmerEmail}</span>
                      </div>
                    )}
                  </div>

                  {/* Services Needed */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Potential Needs:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {opp.needsServices.slice(0, 3).map((service, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs flex items-center gap-1"
                        >
                          {getServiceIcon(service)}
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {opp.farmerPhone && (
                      <a
                        href={`tel:${opp.farmerPhone}`}
                        className="flex-1 bg-green-600 text-white text-center py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                    )}
                    <button
                      onClick={() => navigate(`/chat/${opp.farmerId}`)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default VendorOpportunities;
