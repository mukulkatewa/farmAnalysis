import { useCallback } from "react";
import React, { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/authcontext/Authcontext";
import { doSignOut } from "../firebase/auth";
import Navbar from "../components/dashboard/Navbar";
import Sidebar from "../components/dashboard/Sidebar";
import { API_ENDPOINTS } from "../api/endpoints";

const Profile = () => {
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    farmAddress: "",
    acres: "",
    directoryOptIn: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadProfile = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    // Always set email from currentUser first
    setFormData((prev) => ({
      ...prev,
      email: currentUser.email || "",
    }));

    try {
      // Check if getIdToken method exists
      if (typeof currentUser.getIdToken !== "function") {
        console.error(
          "currentUser.getIdToken is not a function. CurrentUser:",
          currentUser,
        );
        return;
      }

      const token = await currentUser.getIdToken();

      const response = await fetch(API_ENDPOINTS.USER.PROFILE, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.user) {
          setFormData({
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            email: data.user.email || currentUser.email || "",
            farmAddress: data.user.farmAddress || "",
            acres: data.user.acres || "",
            directoryOptIn: data.user.directoryOptIn === true,
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Profile fetch error:", errorData);
        // Email is already set above, so just log the error
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // Email is already set above, error is just logged
    }
  }, [currentUser]);
  useEffect(() => {
    // Load user profile data when currentUser is available
    if (currentUser) {
      loadProfile();
    }
  }, [currentUser, loadProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear message when user starts typing
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Check if currentUser and getIdToken exist
      if (!currentUser || typeof currentUser.getIdToken !== "function") {
        setMessage({
          type: "error",
          text: "Authentication error. Please log out and log in again.",
        });
        setLoading(false);
        return;
      }

      const token = await currentUser.getIdToken();

      const response = await fetch(API_ENDPOINTS.USER.UPDATE, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Profile updated successfully!" });
      } else {
        setMessage({
          type: "error",
          text:
            data.error ||
            `Failed to update profile (Status: ${response.status})`,
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        type: "error",
        text: `An error occurred: ${error.message || "Please check if the backend server is running."}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await doSignOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!userLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />
      <Sidebar />

      <div className="pt-24 lg:ml-64 px-8 pb-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-semibold text-gray-900 tracking-tight">
              Account Settings
            </h1>
            <p className="text-gray-500 text-lg mt-1">
              Update your personal details and farm information.
            </p>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-10">
              <label className="flex items-center gap-2 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={formData.directoryOptIn === true}
                  onChange={(e) =>
                    setFormData((previous) => ({
                      ...previous,
                      directoryOptIn: e.target.checked,
                    }))
                  }
                />
                Show my name and approximate farm location in the vendor
                directory. My account contact details stay private.
              </label>

              {/* Success/Error Message */}
              {message.text && (
                <div
                  className={`p-4 rounded-xl text-sm font-medium ${
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* PERSONAL INFORMATION */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Personal Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-800"
                      placeholder="John"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-800"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="mt-6">
                  <label className="block text-sm text-gray-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-800"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200"></div>

              {/* FARM INFORMATION */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Farm Information
                </h2>

                {/* Address */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Farm Address / Location
                  </label>
                  <textarea
                    name="farmAddress"
                    value={formData.farmAddress}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-800 resize-none"
                    placeholder="Enter farm address"
                  ></textarea>
                </div>

                {/* Acres */}
                <div className="mt-6">
                  <label className="block text-sm text-gray-600 mb-1">
                    Farm Size (Acres)
                  </label>
                  <input
                    type="number"
                    name="acres"
                    value={formData.acres}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-800"
                    placeholder="Ex: 2.5"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    px-6 py-3 rounded-xl
                    bg-blue-600 text-white font-medium 
                    hover:bg-blue-700 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    shadow-sm transition
                  "
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
