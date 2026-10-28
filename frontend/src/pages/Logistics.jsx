import { useCallback } from "react";
import React, { useState, useEffect } from "react";
import Navbar from "../components/dashboard/Navbar";
import Sidebar from "../components/dashboard/Sidebar";
import { useAuth } from "../contexts/authcontext/Authcontext";
import { Navigate, useNavigate } from "react-router-dom";
import { doSignOut } from "../firebase/auth";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { MapPin, Phone, Mail, Clock, Package, Search } from "lucide-react";

const Logistics = () => {
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [coldStorages, setColdStorages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userLocation, setUserLocation] = useState(null);

  const fetchUserLocation = useCallback(async () => {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().location) {
        setUserLocation({
          lat: userSnap.data().location.latitude,
          lng: userSnap.data().location.longitude,
        });
      }
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  }, [currentUser]);
  useEffect(() => {
    if (currentUser) {
      fetchUserLocation();
      fetchColdStorages();
    }
  }, [currentUser, fetchUserLocation]);

  const fetchColdStorages = async () => {
    try {
      const q = query(
        collection(db, "vendors"),
        where("services", "array-contains", "logistics"),
      );
      const querySnapshot = await getDocs(q);
      const storages = [];
      querySnapshot.forEach((doc) => {
        storages.push({ id: doc.id, ...doc.data() });
      });
      setColdStorages(storages);
    } catch (error) {
      console.error("Error fetching cold storages:", error);
    } finally {
      setLoading(false);
    }
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

  const filteredStorages = coldStorages.filter(
    (storage) =>
      storage.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      storage.location?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
      <Navbar currentUser={currentUser} onLogout={handleLogout} />
      <Sidebar />

      <div className="pt-20 lg:ml-64 px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">
              🚚 Logistics & Cold Storage
            </h1>
            <p className="text-gray-600 text-base">
              Find cold storage facilities near you to store your crops
            </p>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-gray-700"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : filteredStorages.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Cold Storage Found
              </h3>
              <p className="text-gray-600">
                {searchTerm
                  ? "Try a different search term"
                  : "No cold storage facilities are currently listed. Check back later!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStorages.map((storage) => {
                const distance =
                  userLocation && storage.locationCoords
                    ? calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        storage.locationCoords.latitude,
                        storage.locationCoords.longitude,
                      )
                    : null;

                return (
                  <div
                    key={storage.id}
                    className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {storage.name || "Cold Storage"}
                        </h3>
                        {distance && (
                          <p className="text-sm text-green-600 font-medium">
                            {distance} km away
                          </p>
                        )}
                      </div>
                      <Package className="w-8 h-8 text-green-600" />
                    </div>

                    <div className="space-y-2 mb-4">
                      {storage.location && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">{storage.location}</span>
                        </div>
                      )}
                      {storage.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          <a
                            href={`tel:${storage.phone}`}
                            className="text-sm hover:text-green-600"
                          >
                            {storage.phone}
                          </a>
                        </div>
                      )}
                      {storage.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <a
                            href={`mailto:${storage.email}`}
                            className="text-sm hover:text-green-600"
                          >
                            {storage.email}
                          </a>
                        </div>
                      )}
                      {storage.capacity && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Package className="w-4 h-4" />
                          <span className="text-sm">
                            Capacity: {storage.capacity}
                          </span>
                        </div>
                      )}
                    </div>

                    {storage.description && (
                      <p className="text-sm text-gray-600 mb-4">
                        {storage.description}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <a
                        href={`tel:${storage.phone || ""}`}
                        className="flex-1 bg-green-600 text-white text-center py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Call Now
                      </a>
                      <button
                        onClick={() => navigate(`/chat/${storage.id}`)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Logistics;
