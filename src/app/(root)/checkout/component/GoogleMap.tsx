import { useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  Marker,
  useLoadScript,
  Autocomplete,
} from "@react-google-maps/api";

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = [
  "places",
];
const center = { lat: 4.0244, lng: 9.704 }; // Cameroon center

export default function GoogleMapBox() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    region: "CM",
    language: "en",
  });

  const [markerPos, setMarkerPos] = useState(center);
  const [address, setAddress] = useState("");

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPos({ lat, lng });

    const geocoder = new google.maps.Geocoder();
    const result = await geocoder.geocode({ location: { lat, lng } });
    if (result.results[0]) setAddress(result.results[0].formatted_address);
  }, []);

  const onPlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const loc = place.geometry.location;
    const lat = loc.lat();
    const lng = loc.lng();
    setMarkerPos({ lat, lng });
    setAddress(place.formatted_address || "");
    if (mapRef.current) mapRef.current.panTo({ lat, lng });
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Autocomplete
        onLoad={(auto) => (autocompleteRef.current = auto)}
        onPlaceChanged={onPlaceChanged}
      >
        <input
          type="text"
          placeholder="Type your address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", fontSize: "1rem" }}
        />
      </Autocomplete>
      <div style={{ height: "400px", width: "100%" }}>
        <GoogleMap
          mapContainerStyle={{ height: "100%", width: "100%" }}
          center={markerPos}
          zoom={15}
          onLoad={onMapLoad}
        >
          <Marker
            position={markerPos}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
          />
        </GoogleMap>
      </div>

      {/* Hidden fields to submit coordinates */}
      <input type="hidden" name="address_text" value={address} />
      <input type="hidden" name="latitude" value={markerPos.lat} />
      <input type="hidden" name="longitude" value={markerPos.lng} />

      <button type="submit" style={{ padding: "0.75rem", fontSize: "1rem" }}>
        Continue
      </button>
    </div>
  );
}
