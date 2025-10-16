import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Header from '../components/Header';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
// O CSS já está incluído no index.html, então a importação aqui é desnecessária.
// import 'leaflet/dist/leaflet.css';

import L from 'leaflet';


const WorldMap: React.FC = () => {
    const { allOperations } = useAuth();

    // Define the icon inside the component and memoize it to prevent re-creation on every render.
    // This avoids potential side-effects from running Leaflet's L.icon() at the module level,
    // which could interfere with React's initialization process.
    const DefaultIcon = useMemo(() => L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41]
    }), []);


    // Filtra operações que têm coordenadas válidas
    const mappableOperations = allOperations.filter(op => 
        op.latitude !== undefined && op.longitude !== undefined
    );

    return (
        <div>
            <Header title="Mapa Global de Operações" />
            <Card>
                <div className="h-[600px] w-full rounded-lg overflow-hidden">
                    <MapContainer center={[10, -30]} zoom={2} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {mappableOperations.map(op => (
                            <Marker key={op.id} position={[op.latitude!, op.longitude!]} icon={DefaultIcon}>
                                <Popup>
                                    <div className="font-sans">
                                        <h3 className="font-bold text-base mb-1">{op.name}</h3>
                                        <p className="text-sm text-slate-600">{op.location}</p>
                                        <hr className="my-2"/>
                                        <p className="text-xs"><strong>Gerente:</strong> {op.manager || 'N/A'}</p>
                                        <p className="text-xs"><strong>Headcount:</strong> {op.totalHeadcount}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
                 {mappableOperations.length < allOperations.length && (
                    <p className="text-center text-sm text-amber-700 bg-amber-50 p-3 mt-4 rounded-md">
                        Aviso: {allOperations.length - mappableOperations.length} operação(ões) não possuem coordenadas geográficas e não puderam ser exibidas no mapa.
                    </p>
                 )}
            </Card>
        </div>
    );
};

export default WorldMap;