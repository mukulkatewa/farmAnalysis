import { useCallback } from "react";
import React, { useState, useEffect } from "react";
import Navbar from "../components/dashboard/Navbar";
import Sidebar from "../components/dashboard/Sidebar";
import { useAuth } from "../contexts/authcontext/Authcontext";
import { Navigate, useNavigate } from "react-router-dom";
import { doSignOut } from "../firebase/auth";
import { db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Save, MapPin, Plus, X, CheckCircle } from "lucide-react";

const VendorDashboard = () => {
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    location: "",
    description: "",
    services: [],
    machineryList: [],
    storageList: [],
    insuranceList: [],
    cropsInterested: [],
  });

  const [newMachinery, setNewMachinery] = useState({
    name: "",
    type: "",
    price: "",
    priceUnit: "day",
    description: "",
  });

  const [newStorage, setNewStorage] = useState({
    name: "",
    address: "",
    capacity: "",
    capacityUnit: "tonnes",
    temperature: "",
    description: "",
  });

  const [newInsurance, setNewInsurance] = useState({
    type: "",
    coverage: "",
    premium: "",
    premiumUnit: "year",
    description: "",
  });

  const [newCrop, setNewCrop] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null);

  const serviceOptions = [
    { id: "insurance", label: "Insurance", icon: "I" },
    { id: "machinery", label: "Machinery Rental", icon: "🚜" },
    { id: "logistics", label: "Logistics/Cold Storage", icon: "🚚" },
    { id: "buyCrops", label: "Buy Crops from Farmers", icon: "🛒" },
  ];

  const fetchVendorData = useCallback(async () => {
    try {
      const vendorRef = doc(db, "vendors", currentUser.uid);
      const vendorSnap = await getDoc(vendorRef);
      if (vendorSnap.exists()) {
        const data = vendorSnap.data();
        setFormData({
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || currentUser.email || "",
          location: data.location || "",
          description: data.description || "",
          services: data.services || [],
          machineryList: data.machineryList || [],
          storageList: data.storageList || [],
          insuranceList: data.insuranceList || [],
          cropsInterested: data.cropsInterested || [],
        });
        if (data.locationCoords) {
          setLocationCoords(data.locationCoords);
        }
      } else {
        // Initialize with user email if document doesn't exist
        setFormData((prev) => ({
          ...prev,
          email: currentUser.email || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching vendor data:", error);
      if (error.code === "permission-denied") {
        console.error(
          "Permission denied. Please check Firestore security rules.",
        );
        alert(
          "Permission denied. Please make sure Firestore security rules are configured correctly.",
        );
      }
    }
  }, [currentUser]);
  useEffect(() => {
    if (currentUser) {
      fetchVendorData();
    }
  }, [currentUser, fetchVendorData]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your location. Please enter it manually.");
        },
      );
    }
  };

  const handleServiceToggle = (serviceId) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter((s) => s !== serviceId)
        : [...prev.services, serviceId],
    }));
  };

  const addMachinery = () => {
    if (newMachinery.name && newMachinery.type) {
      setFormData((prev) => ({
        ...prev,
        machineryList: [...prev.machineryList, newMachinery],
      }));
      setNewMachinery({
        name: "",
        type: "",
        price: "",
        priceUnit: "day",
        description: "",
      });
    }
  };

  const removeMachinery = (index) => {
    setFormData((prev) => ({
      ...prev,
      machineryList: prev.machineryList.filter((_, i) => i !== index),
    }));
  };

  const addStorage = () => {
    if (newStorage.name && newStorage.address) {
      setFormData((prev) => ({
        ...prev,
        storageList: [...prev.storageList, newStorage],
      }));
      setNewStorage({
        name: "",
        address: "",
        capacity: "",
        capacityUnit: "tonnes",
        temperature: "",
        description: "",
      });
    }
  };

  const removeStorage = (index) => {
    setFormData((prev) => ({
      ...prev,
      storageList: prev.storageList.filter((_, i) => i !== index),
    }));
  };

  const addInsurance = () => {
    if (newInsurance.type && newInsurance.coverage) {
      setFormData((prev) => ({
        ...prev,
        insuranceList: [...prev.insuranceList, newInsurance],
      }));
      setNewInsurance({
        type: "",
        coverage: "",
        premium: "",
        premiumUnit: "year",
        description: "",
      });
    }
  };

  const removeInsurance = (index) => {
    setFormData((prev) => ({
      ...prev,
      insuranceList: prev.insuranceList.filter((_, i) => i !== index),
    }));
  };

  const addCrop = () => {
    if (newCrop.trim()) {
      setFormData((prev) => ({
        ...prev,
        cropsInterested: [...prev.cropsInterested, newCrop.trim()],
      }));
      setNewCrop("");
    }
  };

  const removeCrop = (index) => {
    setFormData((prev) => ({
      ...prev,
      cropsInterested: prev.cropsInterested.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const vendorRef = doc(db, "vendors", currentUser.uid);
      await setDoc(
        vendorRef,
        {
          ...formData,
          locationCoords: locationCoords,
          updatedAt: new Date().toISOString(),
          userId: currentUser.uid,
          createdAt: formData.name ? new Date().toISOString() : undefined,
        },
        { merge: true },
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Refresh vendor data after saving
      await fetchVendorData();

      // Show success message with link to opportunities
      if (formData.services.length > 0 && locationCoords) {
        setTimeout(() => {
          if (
            window.confirm(
              "Profile saved! Would you like to view business opportunities near you?",
            )
          ) {
            navigate("/vendor-opportunities");
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Error saving vendor data:", error);
      if (error.code === "permission-denied") {
        alert(
          "Permission denied. Please check Firestore security rules. Make sure you have deployed the firestore.rules file to Firebase.",
        );
      } else {
        alert("Error saving data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

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

      <div className="pt-20 lg:ml-64 px-4 lg:px-8 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-2">
              Vendor Dashboard
            </h1>
            <p className="text-gray-600 text-base">
              Manage your vendor profile and services
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter business name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter location"
                    />
                    <button
                      onClick={getCurrentLocation}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Use current location"
                    >
                      <MapPin className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Describe your business..."
                />
              </div>
            </div>

            {/* Services */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Services Offered
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {serviceOptions.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceToggle(service.id)}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      formData.services.includes(service.id)
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-2xl mb-2">{service.icon}</div>
                    <div className="text-sm font-medium">{service.label}</div>
                    {formData.services.includes(service.id) && (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto mt-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Machinery List - Only show when machinery service is selected */}
            {formData.services.includes("machinery") && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  🚜 Machinery Rental
                </h2>
                <div className="space-y-4">
                  {formData.machineryList.map((machinery, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-lg flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{machinery.name}</h3>
                        <p className="text-sm text-gray-600">
                          {machinery.type}
                        </p>
                        {machinery.price && (
                          <p className="text-sm text-green-600">
                            ₹{machinery.price} / {machinery.priceUnit}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeMachinery(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Machinery name"
                        value={newMachinery.name}
                        onChange={(e) =>
                          setNewMachinery({
                            ...newMachinery,
                            name: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Type (e.g., Cultivator)"
                        value={newMachinery.type}
                        onChange={(e) =>
                          setNewMachinery({
                            ...newMachinery,
                            type: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={newMachinery.price}
                        onChange={(e) =>
                          setNewMachinery({
                            ...newMachinery,
                            price: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <select
                        value={newMachinery.priceUnit}
                        onChange={(e) =>
                          setNewMachinery({
                            ...newMachinery,
                            priceUnit: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="day">Per Day</option>
                        <option value="hour">Per Hour</option>
                        <option value="week">Per Week</option>
                      </select>
                    </div>
                    <button
                      onClick={addMachinery}
                      className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Machinery
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Insurance List - Only show when insurance service is selected */}
            {formData.services.includes("insurance") && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Insurance Services
                </h2>
                <div className="space-y-4">
                  {formData.insuranceList.map((insurance, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-lg flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{insurance.type}</h3>
                        <p className="text-sm text-gray-600">
                          Coverage: {insurance.coverage}
                        </p>
                        {insurance.premium && (
                          <p className="text-sm text-green-600">
                            Premium: ₹{insurance.premium} /{" "}
                            {insurance.premiumUnit}
                          </p>
                        )}
                        {insurance.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {insurance.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeInsurance(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Insurance Type (e.g., Crop Insurance, Livestock Insurance)"
                        value={newInsurance.type}
                        onChange={(e) =>
                          setNewInsurance({
                            ...newInsurance,
                            type: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Coverage Details (e.g., Up to ₹5 Lakhs)"
                        value={newInsurance.coverage}
                        onChange={(e) =>
                          setNewInsurance({
                            ...newInsurance,
                            coverage: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Premium Amount"
                        value={newInsurance.premium}
                        onChange={(e) =>
                          setNewInsurance({
                            ...newInsurance,
                            premium: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <select
                        value={newInsurance.premiumUnit}
                        onChange={(e) =>
                          setNewInsurance({
                            ...newInsurance,
                            premiumUnit: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="year">Per Year</option>
                        <option value="month">Per Month</option>
                        <option value="season">Per Season</option>
                        <option value="crop">Per Crop Cycle</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Description - Optional"
                        value={newInsurance.description}
                        onChange={(e) =>
                          setNewInsurance({
                            ...newInsurance,
                            description: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg md:col-span-2"
                      />
                    </div>
                    <button
                      onClick={addInsurance}
                      className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Insurance Service
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Logistics/Cold Storage - Only show when logistics service is selected */}
            {formData.services.includes("logistics") && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  🚚 Logistics/Cold Storage
                </h2>
                <div className="space-y-4">
                  {formData.storageList.map((storage, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-lg flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{storage.name}</h3>
                        <p className="text-sm text-gray-600">
                          {storage.address}
                        </p>
                        {storage.capacity && (
                          <p className="text-sm text-blue-600">
                            Capacity: {storage.capacity} {storage.capacityUnit}
                          </p>
                        )}
                        {storage.temperature && (
                          <p className="text-sm text-blue-600">
                            Temperature: {storage.temperature}°C
                          </p>
                        )}
                        {storage.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {storage.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeStorage(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Storage name (e.g., Cold Storage Unit 1)"
                        value={newStorage.name}
                        onChange={(e) =>
                          setNewStorage({ ...newStorage, name: e.target.value })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Address/Location"
                        value={newStorage.address}
                        onChange={(e) =>
                          setNewStorage({
                            ...newStorage,
                            address: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Capacity"
                        value={newStorage.capacity}
                        onChange={(e) =>
                          setNewStorage({
                            ...newStorage,
                            capacity: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <select
                        value={newStorage.capacityUnit}
                        onChange={(e) =>
                          setNewStorage({
                            ...newStorage,
                            capacityUnit: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="tonnes">Tonnes</option>
                        <option value="kg">Kilograms</option>
                        <option value="quintals">Quintals</option>
                        <option value="bags">Bags</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Temperature (°C) - Optional"
                        value={newStorage.temperature}
                        onChange={(e) =>
                          setNewStorage({
                            ...newStorage,
                            temperature: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Description - Optional"
                        value={newStorage.description}
                        onChange={(e) =>
                          setNewStorage({
                            ...newStorage,
                            description: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <button
                      onClick={addStorage}
                      className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Storage Location
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Crops Interested */}
            {formData.services.includes("buyCrops") && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Crops You're Interested In Buying
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.cropsInterested.map((crop, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-2"
                    >
                      {crop}
                      <button
                        onClick={() => removeCrop(index)}
                        className="text-green-700 hover:text-green-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter crop name (e.g., Wheat, Rice)"
                    value={newCrop}
                    onChange={(e) => setNewCrop(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addCrop()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    onClick={addCrop}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <button
                onClick={handleSave}
                disabled={
                  loading ||
                  !formData.name ||
                  !formData.phone ||
                  !formData.location
                }
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Profile
                  </>
                )}
              </button>
              {saved && (
                <div className="space-y-2">
                  <p className="text-center text-green-600 flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Profile saved successfully!
                  </p>
                  {formData.services.length > 0 && (
                    <button
                      onClick={() => navigate("/vendor-opportunities")}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      View Business Opportunities →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
