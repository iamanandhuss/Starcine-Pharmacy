import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import { supabase } from '../../services/supabase';

// Fix missing Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface RoutingMachineProps {
  storeLat: number;
  storeLon: number;
  deliveryLat: number;
  deliveryLon: number;
  onRouteFound?: (points: Array<{ lat: number; lng: number }>) => void;
}

const RoutingMachine: React.FC<RoutingMachineProps> = ({ storeLat, storeLon, deliveryLat, deliveryLon, onRouteFound }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const routingControl = (L.Routing as any).control({
      waypoints: [
        L.latLng(storeLat, storeLon),
        L.latLng(deliveryLat, deliveryLon)
      ],
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: true,
      show: false,
      addWaypoints: false,
      // Create custom markers to differentiate Start vs End
      createMarker: (i: number, waypoint: any) => {
        const marker = L.marker(waypoint.latLng, {
          draggable: false,
        });
        marker.bindPopup(i === 0 ? "<b>Pharmacy Store</b>" : "<b>Customer Delivery</b>");
        return marker;
      }
    }).addTo(map);

    routingControl.on('routesfound', (e: any) => {
      const routes = e.routes;
      if (routes && routes[0] && routes[0].coordinates && onRouteFound) {
        console.log(`🗺️ Route found with ${routes[0].coordinates.length} geometry points for snapping.`);
        onRouteFound(routes[0].coordinates);
      }
    });

    return () => {
      try {
        map.removeControl(routingControl);
      } catch (e) {
        console.error(e);
      }
    };
  }, [map, storeLat, storeLon, deliveryLat, deliveryLon, onRouteFound]);

  return null;
};

interface DeliveryRouteMapProps {
  storeLat: number;
  storeLon: number;
  deliveryLat: number;
  deliveryLon: number;
  driverId?: string | null;
}

const BikeIcon = L.divIcon({
  html: '<div style="font-size: 26px; text-align: center; transform: translateY(-50%); line-height: 1;">🛵</div>',
  className: 'custom-bike-icon smooth-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// Helper function to calculate distance squared between two lat/lng points
function getDistanceSq(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return dLat * dLat + dLng * dLng;
}

// Snap raw GPS coordinates to nearest point on the road geometry
function snapToRoute(rawLat: number, rawLng: number, routePoints: Array<{ lat: number; lng: number }>): [number, number] {
  if (!routePoints || routePoints.length === 0) {
    return [rawLat, rawLng];
  }

  let minDistanceSq = Infinity;
  let closestPoint = { lat: rawLat, lng: rawLng };

  for (let i = 0; i < routePoints.length; i++) {
    const p = routePoints[i];
    const distSq = getDistanceSq(rawLat, rawLng, p.lat, p.lng);
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      closestPoint = p;
    }
  }

  return [closestPoint.lat, closestPoint.lng];
}

export const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({ storeLat, storeLon, deliveryLat, deliveryLon, driverId }) => {
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const routePointsRef = useRef<Array<{ lat: number; lng: number }>>([]);

  const handleRouteFound = useCallback((points: Array<{ lat: number; lng: number }>) => {
    routePointsRef.current = points;
  }, []);

  useEffect(() => {
    if (!driverId) return;

    // 1. Fetch initial location from the database
    const fetchInitialLocation = async () => {
      const { data, error } = await supabase
        .from('driver_tracking')
        .select('latitude, longitude')
        .eq('driver_id', driverId)
        .maybeSingle();

      if (error) {
        console.error('❌ Failed to fetch initial driver location:', error);
      } else if (data) {
        console.log(`✅ Found initial database location for driver ${driverId}: [${data.latitude}, ${data.longitude}]`);
        const snapped = snapToRoute(data.latitude, data.longitude, routePointsRef.current);
        setDriverPos(snapped);
      } else {
        console.log(`⚠️ No existing location found in database for driver ${driverId}. Waiting for driver to connect...`);
      }
    };
    fetchInitialLocation();

    // 2. Subscribe to Postgres changes on the driver_tracking table
    const channel = supabase.channel(`tracking_${driverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_tracking', filter: `driver_id=eq.${driverId}` },
        (payload) => {
          console.log(`📡 Received Database GPS Update for driver ${driverId}:`, payload.new);
          const newRow = payload.new as any;
          if (newRow && newRow.latitude && newRow.longitude) {
            const rawLat = newRow.latitude;
            const rawLng = newRow.longitude;
            const snapped = snapToRoute(rawLat, rawLng, routePointsRef.current);
            console.log(`✅ Moving bike marker: Raw [${rawLat}, ${rawLng}] -> Snapped [${snapped[0]}, ${snapped[1]}]`);
            setDriverPos(snapped);
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔌 Database Realtime Subscription Status: ${status} (Listening for driver: ${driverId})`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-dark-200 dark:border-dark-700 relative z-0">
      <style>{`
        .leaflet-routing-container {
          display: none !important;
        }
        .smooth-marker {
          transition: transform 1.2s linear !important;
        }
      `}</style>
      <MapContainer
        center={[storeLat, storeLon]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RoutingMachine
          storeLat={storeLat}
          storeLon={storeLon}
          deliveryLat={deliveryLat}
          deliveryLon={deliveryLon}
          onRouteFound={handleRouteFound}
        />
        {driverPos && (
          <Marker position={driverPos} icon={BikeIcon} zIndexOffset={1000} />
        )}
      </MapContainer>
    </div>
  );
};
