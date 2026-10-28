import React, { useEffect, useRef, useState } from "react";
import FieldDetailsDrawer from "./FieldDetailsDrawer";
import { useAuth } from "../../contexts/authcontext/Authcontext";
import { db } from "../../firebase/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { useTranslation } from "react-i18next";

const NewFieldMap = ({ showDrawer, setShowDrawer }) => {
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userLocationMarkerRef = useRef(null);
  const drawnPolygonsRef = useRef([]);
  const { currentUser } = useAuth();
  const [fieldCoordinates, setFieldCoordinates] = useState(null);
  const [centroid, setCentroid] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationFetched, setLocationFetched] = useState(false);
  const [fieldCount, setFieldCount] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const drawingActiveRef = useRef(false);
  const drawControlsRef = useRef(null);

  // Fetch user location and existing fields count
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserData = async () => {
      try {
        // Fetch user location
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.location) {
            setUserLocation({
              lat: userData.location.latitude,
              lng: userData.location.longitude
            });
          }
        }

        // Fetch existing fields to set proper field count
        const fieldsRef = collection(db, "users", currentUser.uid, "fields");
        const fieldsSnapshot = await getDocs(fieldsRef);
        const existingFieldsCount = fieldsSnapshot.size;
        
        // Set field count to next number
        setFieldCount(existingFieldsCount + 1);
        console.log(`Found ${existingFieldsCount} existing fields. Next field will be #${existingFieldsCount + 1}`);

        setLocationFetched(true);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLocationFetched(true);
      }
    };

    fetchUserData();
  }, [currentUser]);

  // -----------------------------------------
  // Load Google Maps and Initialize the Map (only once)
  // -----------------------------------------
  useEffect(() => {
    if (!mapRef.current || !locationFetched || mapInstanceRef.current) return;

    async function initMap() {
      // Use user location if available, otherwise default to Hyderabad
      const startLoc = userLocation || { lat: 17.3266, lng: 78.1695 };

      const map = new window.google.maps.Map(mapRef.current, {
        center: startLoc,
        zoom: userLocation ? 15 : 13,
        mapTypeId: "satellite",
      });

      mapInstanceRef.current = map;

      // Show user location marker if available
      if (userLocation) {
        userLocationMarkerRef.current = new window.google.maps.Marker({
          position: userLocation,
          map,
          title: "Your Location",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
      }

      // ---- SEARCH BOX (Places API New: PlaceAutocompleteElement) ----
      try {
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary("places");
        const autocomplete = new PlaceAutocompleteElement({});
        autocomplete.placeholder = t("field_map_search_placeholder");
        autocomplete.style.margin = "12px";
        autocomplete.style.colorScheme = "light";
        map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(autocomplete);

        const onPlaceSelected = async (event) => {
          // "gmp-select" gives a placePrediction; older "gmp-placeselect" gives a place
          const place = event.placePrediction ? event.placePrediction.toPlace() : event.place;
          if (!place) return;
          await place.fetchFields({ fields: ["location", "viewport"] });
          if (place.viewport) map.fitBounds(place.viewport);
          else if (place.location) {
            map.setCenter(place.location);
            map.setZoom(16);
          }
        };
        autocomplete.addEventListener("gmp-select", onPlaceSelected);
        autocomplete.addEventListener("gmp-placeselect", onPlaceSelected);
      } catch (err) {
        console.error("Place search unavailable:", err);
      }

      // ---- DRAW TOOL ----
      // Custom click-to-draw: Google removed DrawingManager in Maps JS v3.65.
      let previewLine = null;

      const stopDrawing = () => {
        drawingActiveRef.current = false;
        if (previewLine) {
          previewLine.setMap(null);
          previewLine = null;
        }
        map.setOptions({ draggableCursor: null, disableDoubleClickZoom: false });
        setIsDrawing(false);
        setPointCount(0);
      };

      const startDrawing = () => {
        stopDrawing();
        drawingActiveRef.current = true;
        previewLine = new window.google.maps.Polyline({
          map,
          path: [],
          strokeColor: "#00FF00",
          strokeWeight: 3,
          clickable: false,
        });
        map.setOptions({ draggableCursor: "crosshair", disableDoubleClickZoom: true });
        setIsDrawing(true);
      };

      const undoPoint = () => {
        if (!previewLine) return;
        const path = previewLine.getPath();
        if (path.getLength()) {
          path.pop();
          setPointCount(path.getLength());
        }
      };

      // ---- WHEN USER FINISHES DRAWING ----
      const finishDrawing = () => {
        if (!previewLine) return;

        // A double-click adds the same point twice, so drop consecutive duplicates
        const coords = previewLine
          .getPath()
          .getArray()
          .map((p) => ({ lat: p.lat(), lng: p.lng() }))
          .filter((c, i, arr) => i === 0 || c.lat !== arr[i - 1].lat || c.lng !== arr[i - 1].lng);

        if (coords.length < 3) return;

        stopDrawing();

        // Make polygon
        const polygon = new window.google.maps.Polygon({
          paths: coords,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
          fillColor: "#00FF00",
          fillOpacity: 0.4,
          clickable: false,
          map,
        });

        // Centroid
        const computedCentroid = computeCentroid(coords);

        // Dynamic field label
        const fieldLabel = `Field ${fieldCount}`;
        const marker = new window.google.maps.Marker({
          position: computedCentroid,
          map,
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 0 },
          label: {
            text: fieldLabel,
            color: "white",
            fontSize: "16px",
          },
        });

        // Store polygon and marker for later reference
        drawnPolygonsRef.current.push({ polygon, marker, coords, centroid: computedCentroid });

        // Store coordinates in state for the drawer
        setFieldCoordinates(coords);
        setCentroid(computedCentroid);

        // Open drawer to add details
        setShowDrawer(true);
      };

      map.addListener("click", (e) => {
        if (!drawingActiveRef.current || !previewLine) return;
        previewLine.getPath().push(e.latLng);
        setPointCount(previewLine.getPath().getLength());
      });
      map.addListener("dblclick", () => {
        if (drawingActiveRef.current) finishDrawing();
      });

      drawControlsRef.current = { startDrawing, undoPoint, finishDrawing, stopDrawing };
      startDrawing(); // start in drawing mode, as before
    }

    // Only initialize map if Google Maps is loaded
    loadGoogleMaps(() => {
      // Initialize map with user location if available, otherwise use default
      initMap().catch((err) => console.error("Map init failed:", err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationFetched]); // Initialize once when location is fetched, userLocation handled separately

  // Update map center when user location becomes available after initial load
  useEffect(() => {
    // Only update if map is already initialized and user location is available
    if (!mapInstanceRef.current || !userLocation || !locationFetched) return;

    // Update map center to user location
    mapInstanceRef.current.setCenter(userLocation);
    mapInstanceRef.current.setZoom(15);

    // Add or update user location marker
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setMap(null);
    }
    
    userLocationMarkerRef.current = new window.google.maps.Marker({
      position: userLocation,
      map: mapInstanceRef.current,
      title: "Your Location",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });
  }, [userLocation, locationFetched]);

  // -----------------------------------------
  // Helpers
  // -----------------------------------------
  function computeCentroid(coords) {
    let lat = 0,
      lng = 0;
    coords.forEach((c) => {
      lat += c.lat;
      lng += c.lng;
    });
    return { lat: lat / coords.length, lng: lng / coords.length };
  }


  function loadGoogleMaps(callback) {
    if (window.google) return callback();

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = callback;
    document.body.appendChild(script);
  }

  return (
    <>
      {/* MAP CONTAINER (unchanged UI) */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">{t("field_map_title")}</h2>
        </div>

        {/* REAL GOOGLE MAP */}
        <div className="relative h-[620px] bg-gray-100">
          {/* DRAW CONTROLS */}
          <div className="absolute z-10 top-3 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 bg-white/95 border rounded shadow px-3 py-2 max-w-[90%]">
            {isDrawing ? (
              <>
                <span className="text-sm text-gray-700">
                  Click the map to mark corners ({pointCount} added)
                </span>
                <button
                  type="button"
                  className="px-3 py-1 text-sm rounded border hover:bg-gray-100 disabled:opacity-50"
                  onClick={() => drawControlsRef.current?.undoPoint()}
                  disabled={pointCount === 0}
                >
                  Undo
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
                  onClick={() => drawControlsRef.current?.finishDrawing()}
                  disabled={pointCount < 3}
                >
                  Finish
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-sm rounded border hover:bg-gray-100"
                  onClick={() => drawControlsRef.current?.stopDrawing()}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                onClick={() => drawControlsRef.current?.startDrawing()}
              >
                Draw field boundary
              </button>
            )}
          </div>

          <div ref={mapRef} className="w-full h-full"></div>
        </div>
      </div>

      {/* Info Message and Buttons */}
      <div className="space-y-4 mt-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Instructions:</strong> Click on the map to mark the corners of your field, then press Finish (or double-click the last corner). A drawer will open automatically to add field details. You can add multiple fields by drawing them one by one.
          </p>
        </div>

        <div className="flex justify-between">
          <button
            className="w-[48%] py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={() => setShowDrawer(true)}
            disabled={!centroid}
          >
            {centroid ? t("field_add_details") : t("field_draw_first")}
          </button>

          <button
            className="w-[48%] py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={() => setShowDrawer(true)}
            disabled={!centroid}
          >
            {centroid ? t("field_save_field") : t("field_no_field_selected")}
          </button>
        </div>
      </div>

      {/* Drawer */}
      <FieldDetailsDrawer 
        open={showDrawer} 
        onClose={() => {
          setShowDrawer(false);
          // Reset for next field
          setFieldCoordinates(null);
          setCentroid(null);
        }}
        coordinates={fieldCoordinates}
        centroid={centroid}
        suggestedFieldName={`Field ${fieldCount}`}
        onSaveSuccess={() => {
          setFieldCount(prev => prev + 1);
          setShowDrawer(false);
          setFieldCoordinates(null);
          setCentroid(null);
        }}
      />
    </>
  );
};

export default NewFieldMap;
