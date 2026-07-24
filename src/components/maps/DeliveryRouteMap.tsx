import React, { useEffect, useState } from 'react';
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
}

const RoutingMachine: React.FC<RoutingMachineProps> = ({ storeLat, storeLon, deliveryLat, deliveryLon }) => {
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

    return () => {
      try {
        map.removeControl(routingControl);
      } catch (e) {
        console.error(e);
      }
    };
  }, [map, storeLat, storeLon, deliveryLat, deliveryLon]);

  return null;
};

interface DeliveryRouteMapProps {
  storeLat: number;
  storeLon: number;
  deliveryLat: number;
  deliveryLon: number;
  driverId?: string;
}

const TruckIcon = L.divIcon({
  html: '<div style="font-size: 24px; text-align: center; transform: translateY(-50%); line-height: 1;">🚚</div>',
  className: 'custom-truck-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

export const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({ storeLat, storeLon, deliveryLat, deliveryLon, driverId }) => {
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!driverId) return;

    const channel = supabase.channel('driver_tracking_channel')
      .on('broadcast', { event: 'location_update' }, (payload) => {
        if (payload.payload?.driverId === driverId) {
          setDriverPos([payload.payload.latitude, payload.payload.longitude]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);
  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-dark-200 dark:border-dark-700 relative z-0">
      <style>{`
        .leaflet-routing-container {
          background-color: white !important;
          padding: 10px !important;
          border-radius: 8px !important;
          max-height: 400px;
          overflow-y: auto;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
        }
        .dark .leaflet-routing-container {
          background-color: #1a1a1a !important;
          color: white !important;
        }
        .dark .leaflet-routing-alt, .dark .leaflet-routing-alt table {
          color: white !important;
        }
        .leaflet-routing-alt h2 {
          font-size: 14px;
          margin-bottom: 8px;
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
        />
        {driverPos && (
          <Marker position={driverPos} icon={TruckIcon} zIndexOffset={1000} />
        )}
      </MapContainer>
    </div>
  );
};
