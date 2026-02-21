"use client";

import { useCallback, useMemo, useRef, useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon (broken by webpack/next.js bundling)
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function DraggableMarker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const position = useMemo(() => ({ lat, lng }), [lat, lng]);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const pos = marker.getLatLng();
          onChange(pos.lat, pos.lng);
        }
      },
    }),
    [onChange]
  );

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={defaultIcon}
    />
  );
}

export default function LocationPicker({
  lat,
  lng,
  onChange,
  height = 300,
}: LocationPickerProps) {
  const mapRef = useRef<L.Map>(null);
  const hasMarker = lat !== null && lng !== null;

  // Bengaluru default center
  const center: [number, number] = hasMarker
    ? [lat!, lng!]
    : [12.9716, 77.5946];

  // Pan map when marker position changes
  useEffect(() => {
    if (hasMarker && mapRef.current) {
      mapRef.current.setView([lat!, lng!], mapRef.current.getZoom());
    }
  }, [lat, lng, hasMarker]);

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(
          parseFloat(pos.coords.latitude.toFixed(6)),
          parseFloat(pos.coords.longitude.toFixed(6))
        );
        toast.success("Location detected");
      },
      () => {
        toast.error("Unable to get your location");
      }
    );
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div
        className="rounded-md overflow-hidden border"
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onChange={onChange} />
          {hasMarker && (
            <DraggableMarker lat={lat!} lng={lng!} onChange={onChange} />
          )}
        </MapContainer>
      </div>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGeolocate}
        >
          <MapPin className="mr-1 h-4 w-4" />
          Use my location
        </Button>
        {hasMarker && (
          <p className="text-xs text-muted-foreground">
            {lat!.toFixed(6)}, {lng!.toFixed(6)}
          </p>
        )}
      </div>
    </div>
  );
}
