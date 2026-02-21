import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () => import("@/components/shared/location-picker"),
  { ssr: false, loading: () => <div className="rounded-md border bg-muted animate-pulse" style={{ height: 300 }} /> }
);

export default LocationPicker;
