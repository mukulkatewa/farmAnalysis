import React, { useState, useEffect } from "react";
import Navbar from "../components/dashboard/Navbar";
import Sidebar from "../components/dashboard/Sidebar";
import { useAuth } from "../contexts/authcontext/Authcontext";
import { Navigate, useNavigate } from "react-router-dom";
import { doSignOut } from "../firebase/auth";
import { db } from "../firebase/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Shield, Phone, Mail, MapPin, Search, CheckCircle } from "lucide-react";

const Insurance = () => {
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [insuranceProviders, setInsuranceProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (currentUser) {
      fetchInsuranceProviders();
    }
  }, [currentUser]);

  const fetchInsuranceProviders = async () => {
    try {
      const q = query(collection(db, "vendors"), where("services", "array-contains", "insurance"));
      const querySnapshot = await getDocs(q);
      const providers = [];
      querySnapshot.forEach((doc) => {
        providers.push({ id: doc.id, ...doc.data() });
      });
      setInsuranceProviders(providers);
    } catch (error) {
      console.error("Error fetching insurance providers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = insuranceProviders.filter(
    (provider) =>
      provider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.location?.toLowerCase().includes(searchTerm.toLowerCase())
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
              Crop Insurance
            </h1>
            <p className="text-gray-600 text-base">
              Protect your crops with insurance from trusted providers
            </p>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search insurance providers..."
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
          ) : filteredProviders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Insurance Providers Found</h3>
              <p className="text-gray-600">
                {searchTerm
                  ? "Try a different search term"
                  : "No insurance providers are currently listed. Check back later!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {provider.name || "Insurance Provider"}
                      </h3>
                      {provider.verified && (
                        <div className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>Verified</span>
                        </div>
                      )}
                    </div>
                    <Shield className="w-8 h-8 text-blue-600" />
                  </div>

                  <div className="space-y-2 mb-4">
                    {provider.location && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{provider.location}</span>
                      </div>
                    )}
                    {provider.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        <a
                          href={`tel:${provider.phone}`}
                          className="text-sm hover:text-green-600"
                        >
                          {provider.phone}
                        </a>
                      </div>
                    )}
                    {provider.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <a
                          href={`mailto:${provider.email}`}
                          className="text-sm hover:text-green-600"
                        >
                          {provider.email}
                        </a>
                      </div>
                    )}
                  </div>

                  {provider.description && (
                    <p className="text-sm text-gray-600 mb-4">{provider.description}</p>
                  )}

                  {provider.coverageTypes && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Coverage Types:</p>
                      <div className="flex flex-wrap gap-2">
                        {provider.coverageTypes.map((type, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <a
                      href={`tel:${provider.phone || ""}`}
                      className="flex-1 bg-green-600 text-white text-center py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Contact
                    </a>
                    <button
                      onClick={() => navigate(`/chat/${provider.id}`)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Insurance;

