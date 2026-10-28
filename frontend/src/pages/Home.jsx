import { useCallback } from "react";
import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authcontext/Authcontext";
import { doSignOut } from "../firebase/auth";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import VendorHome from "./VendorHome";

const Home = () => {
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserType = useCallback(async () => {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserType(data.userType || "farmer");
      } else {
        setUserType("farmer");
      }
    } catch (error) {
      console.error("Error fetching user type:", error);
      setUserType("farmer");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  useEffect(() => {
    if (currentUser && userLoggedIn) {
      fetchUserType();
    }
  }, [currentUser, userLoggedIn, fetchUserType]);

  const handleLogout = async () => {
    try {
      await doSignOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!userLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-100">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect vendors to vendor home using Navigate to prevent flash
  if (userType === "vendor") {
    return <VendorHome />;
  }

  return <DashboardLayout currentUser={currentUser} onLogout={handleLogout} />;
};

export default Home;
