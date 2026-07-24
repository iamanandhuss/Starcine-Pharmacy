import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';

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

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(storeLat, storeLon),
        L.latLng(deliveryLat, deliveryLon)
      ],
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: true,
      show: true,
      // Create custom markers to differentiate Start vs End
      createMarker: (i: number, waypoint: any, n: number) => {
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
}

export const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({ storeLat, storeLon, deliveryLat, deliveryLon }) => {
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
      </MapContainer>
    </div>
  );
};
