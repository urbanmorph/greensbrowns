import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WhatsAppMessage {
  from: string;
  body: string;
  mediaUrl?: string;
  mediaContentType?: string;
  latitude?: number;
  longitude?: number;
}

function normalizePhone(phone: string): string {
  // Strip leading + and any spaces/dashes
  return phone.replace(/[\s\-\+]/g, "");
}

function parseIncomingMessage(body: Record<string, unknown>): WhatsAppMessage | null {
  // Twilio format
  if (body.From && body.Body !== undefined) {
    return {
      from: (body.From as string).replace("whatsapp:", ""),
      body: (body.Body as string) || "",
      mediaUrl: body.MediaUrl0 as string | undefined,
      mediaContentType: body.MediaContentType0 as string | undefined,
      latitude: body.Latitude ? Number(body.Latitude) : undefined,
      longitude: body.Longitude ? Number(body.Longitude) : undefined,
    };
  }

  // Meta Cloud API format
  if (body.entry) {
    const entries = body.entry as Array<Record<string, unknown>>;
    const changes = entries?.[0]?.changes as Array<Record<string, unknown>>;
    const value = changes?.[0]?.value as Record<string, unknown>;
    const messages = value?.messages as Array<Record<string, unknown>>;
    if (!messages?.length) return null;

    const msg = messages[0];
    const contact = (value?.contacts as Array<Record<string, unknown>>)?.[0];

    let mediaUrl: string | undefined;
    let lat: number | undefined;
    let lng: number | undefined;

    if (msg.type === "image") {
      const image = msg.image as Record<string, unknown>;
      mediaUrl = image?.id as string; // Media ID, needs download via Graph API
    }
    if (msg.type === "location") {
      const location = msg.location as Record<string, unknown>;
      lat = location?.latitude as number;
      lng = location?.longitude as number;
    }

    return {
      from: (contact?.wa_id as string) || (msg.from as string),
      body: (msg.text as Record<string, unknown>)?.body as string || "",
      mediaUrl,
      latitude: lat,
      longitude: lng,
    };
  }

  return null;
}

async function findDriverByPhone(phone: string) {
  const normalized = normalizePhone(phone);
  // Try matching with and without country code
  const { data, error } = await supabase
    .from("drivers")
    .select("id, name, phone")
    .eq("is_active", true);

  if (error || !data) return null;

  return data.find((d: { phone: string | null }) => {
    if (!d.phone) return false;
    const driverPhone = normalizePhone(d.phone);
    return normalized.endsWith(driverPhone) || driverPhone.endsWith(normalized);
  }) || null;
}

async function findVehicleForDriver(driverId: string) {
  const { data } = await supabase
    .from("vehicle_drivers")
    .select("vehicle_id")
    .eq("driver_id", driverId)
    .limit(1)
    .single();

  return data?.vehicle_id || null;
}

async function findActivePickup(vehicleId: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("pickups")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .in("status", ["assigned", "in_transit"])
    .eq("scheduled_date", today)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return data || null;
}

async function getCurrentTrip(pickupId: string) {
  const { data } = await supabase
    .from("pickup_trips")
    .select("*")
    .eq("pickup_id", pickupId)
    .eq("status", "in_transit")
    .order("trip_number", { ascending: false })
    .limit(1)
    .single();

  return data || null;
}

async function getMaxTripNumber(pickupId: string): Promise<number> {
  const { data } = await supabase
    .from("pickup_trips")
    .select("trip_number")
    .eq("pickup_id", pickupId)
    .order("trip_number", { ascending: false })
    .limit(1)
    .single();

  return data?.trip_number || 0;
}

async function handlePhotoMessage(
  pickup: Record<string, unknown>,
  mediaUrl: string,
  lat?: number,
  lng?: number
) {
  const pickupId = pickup.id as string;

  // Upload photo to storage
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  let currentTrip = await getCurrentTrip(pickupId);

  if (!currentTrip) {
    // Create a new trip
    const nextTripNumber = (await getMaxTripNumber(pickupId)) + 1;
    const { data: newTrip, error } = await supabase
      .from("pickup_trips")
      .insert({
        pickup_id: pickupId,
        trip_number: nextTripNumber,
        status: "in_transit",
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create trip: ${error.message}`);
    currentTrip = newTrip;
  }

  // Download photo from provider and upload to Supabase Storage
  const photoPath = `trips/${pickupId}/${currentTrip.trip_number}/${timestamp}.jpg`;
  try {
    const photoResponse = await fetch(mediaUrl);
    if (photoResponse.ok) {
      const photoBlob = await photoResponse.blob();
      await supabase.storage
        .from("pickup-photos")
        .upload(photoPath, photoBlob, { contentType: "image/jpeg" });
    }
  } catch {
    // If download fails, store the original URL
  }

  const { data: urlData } = supabase.storage
    .from("pickup-photos")
    .getPublicUrl(photoPath);
  const publicUrl = urlData?.publicUrl || mediaUrl;

  // Append photo to trip
  const updatedUrls = [...(currentTrip.photo_urls || []), publicUrl];
  const existingMeta = (currentTrip.photo_metadata as Array<Record<string, unknown>>) || [];
  const updatedMeta = [
    ...existingMeta,
    {
      url: publicUrl,
      lat: lat ?? null,
      lng: lng ?? null,
      timestamp: new Date().toISOString(),
    },
  ];

  await supabase
    .from("pickup_trips")
    .update({ photo_urls: updatedUrls, photo_metadata: updatedMeta })
    .eq("id", currentTrip.id);

  // If pickup is still "assigned", move to "in_transit"
  if (pickup.status === "assigned") {
    await supabase
      .from("pickups")
      .update({ status: "in_transit" })
      .eq("id", pickupId);

    // Insert pickup event using a system identifier
    await supabase.from("pickup_events").insert({
      pickup_id: pickupId,
      status: "in_transit",
      changed_by: pickup.requested_by as string,
      notes: "Driver started first trip (via WhatsApp)",
    });
  }

  return currentTrip.trip_number;
}

async function handleFinishedMessage(pickup: Record<string, unknown>) {
  const pickupId = pickup.id as string;

  // Mark current in_transit trip as delivered
  const currentTrip = await getCurrentTrip(pickupId);
  if (currentTrip) {
    await supabase
      .from("pickup_trips")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", currentTrip.id);
  }

  // Update pickup status to picked_up
  await supabase
    .from("pickups")
    .update({ status: "picked_up" })
    .eq("id", pickupId);

  await supabase.from("pickup_events").insert({
    pickup_id: pickupId,
    status: "picked_up",
    changed_by: pickup.requested_by as string,
    notes: "Driver completed all trips (via WhatsApp)",
  });
}

Deno.serve(async (req: Request) => {
  // Handle WhatsApp webhook verification (Meta Cloud API)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (mode === "subscribe" && token === verifyToken) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let body: Record<string, unknown>;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Twilio sends form-encoded
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    } else {
      body = await req.json();
    }

    const message = parseIncomingMessage(body);
    if (!message) {
      return new Response(JSON.stringify({ ok: true, message: "No actionable message" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Find driver by phone
    const driver = await findDriverByPhone(message.from);
    if (!driver) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unknown phone number — not a registered driver" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Find vehicle for this driver
    const vehicleId = await findVehicleForDriver(driver.id);
    if (!vehicleId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Driver has no assigned vehicle" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Find active pickup for this vehicle
    const pickup = await findActivePickup(vehicleId);
    if (!pickup) {
      return new Response(
        JSON.stringify({ ok: false, error: "No active pickup found for today" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Process message
    const bodyLower = message.body.toLowerCase().trim();

    if (message.mediaUrl) {
      const tripNumber = await handlePhotoMessage(
        pickup,
        message.mediaUrl,
        message.latitude,
        message.longitude
      );
      return new Response(
        JSON.stringify({
          ok: true,
          message: `Photo received for trip ${tripNumber}. Pickup ${pickup.pickup_number}.`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (bodyLower === "finished" || bodyLower === "done" || bodyLower === "complete") {
      await handleFinishedMessage(pickup);
      return new Response(
        JSON.stringify({
          ok: true,
          message: `All trips completed for pickup ${pickup.pickup_number}. Admin will verify delivery.`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Hi ${driver.name}! Send a photo to log a trip, or say "finished" when done. Active pickup: ${pickup.pickup_number}.`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
