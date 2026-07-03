// Keep track of the currently highlighted building layer globally within the engine
let currentSelectedLayer = null;

export function initMap() {
    const map = L.map('map-viewport', {
        crs: L.CRS.Simple,
        minZoom: -3,
        maxZoom: 5,
        zoomSnap: 0.2
    }).setView([0, 0], 0);
    
    const bgPane = map.createPane('background');
    bgPane.style.zIndex = 200; 
    bgPane.style.pointerEvents = 'none'; 

    const waterPane = map.createPane('water');
    waterPane.style.zIndex = 250;
    waterPane.style.pointerEvents = 'none';
    
    const roadCasingPane = map.createPane('roadCasing');
    roadCasingPane.style.zIndex = 280;
    roadCasingPane.style.pointerEvents = 'none';

    const roadFillPane = map.createPane('roadFill');
    roadFillPane.style.zIndex = 290;
    roadFillPane.style.pointerEvents = 'none';

    const edgePane = map.createPane('edge');
    edgePane.style.zIndex = 300;
    edgePane.style.pointerEvents = 'none';

    return map;
}

export function renderTownLayers(map, geoJSON, onBuildingClick) {
    const buildingLayers = {};
    const roadTypes = ['MAIN_ROAD', 'ROAD', 'SMALL_ROAD', 'DIRT_ROAD', 'TRAIL'];

    geoJSON.features.forEach(feature => {
        if (feature.properties.type === 'EDGE' && roadTypes.includes(feature.properties.edgeType)) {
            addRoadToMap(map, feature)
        }
    });

    L.geoJSON(geoJSON, {
        coordsToLatLng: function (coords) {
            return new L.LatLng(coords[1], coords[0]);
        },
        
        filter: function(feature) {
            if (feature.properties.type === 'EDGE' && roadTypes.includes(feature.properties.edgeType)) {
                return false;
            }
            return true;
        },

        style: function (feature) {
            switch (feature.properties.type) {
                case 'BACKGROUND':
                    switch (feature.properties.backgroundType) {
                        case 'CATTLE_TEXTURE_TYPE':
                            return { fillColor: '#1d3a22', fillOpacity: 0.5, stroke: false, interactive: false, pane: 'background' };
                        case 'CLIFF':
                            return { fillColor: '#4f4f4f', fillOpacity: 0.5, stroke: false, interactive: false, pane: 'background' };
                        case 'FOREST':
                            return { fillColor: '#1d4822', fillOpacity: 0.5, stroke: false, interactive: false, pane: 'background' };
                        case 'GRAIN':
                            return { fillColor: '#9dd4a1', fillOpacity: 0.5, stroke: false, interactive: false, pane: 'background' };
                        case 'GRASS':
                            return { fillColor: '#91c99c', fillOpacity: 0.5, stroke: false, interactive: false, pane: 'background' };
                        case 'LAWN_TEXTURE_TYPE':
                            return { fillColor: '#8db695', fillOpacity: 0.5, stroke: false, interactive: false, pane: 'background' };
                        case 'LIGHT_GRASS':
                        case 'PEBBLE_BEACH':
                        case 'PIGS_TEXTURE_TYPE':
                        case 'ROAD_TEXTURE_TYPE':
                        case 'SAND':
                        case 'TILLED':
                        case 'WHEAT':
                            return { fillColor: '#c2b28f', fillOpacity: 0.5, stroke: false, interactive: false, pane: 'background' };
                        case 'SHEEP_TEXTURE_TYPE':
                            return { fillColor: feature.properties.backgroundType === 'SAND' ? '#dfcfb3' : '#c2b28f', fillOpacity: 0.5, stroke: false, interactive: false, pane: 'background' };
                    }
                case 'EDGE':
                    switch (feature.properties.edgeType) {
                        case 'BORDER':
                        case 'WATERFRONT':
                        case 'WOOD_PIER':
                            return { color: '#7a6752', weight: 2.5, opacity: 0.85, interactive: false, pane: 'edge' };
                        case 'DIRT_ROAD':
                            return { color: '#7a6752', weight: 2, opacity: 0.85, interactive: false, pane: 'edge' };
                        case 'MAIN_ROAD':
                        case 'ROAD':
                            return { color: '#a29688', weight: 2.5, opacity: 0.85, interactive: false, pane: 'edge' };
                        case 'SMALL_ROAD':
                            return { color: '#a29688', weight: 2, opacity: 0.85, interactive: false, pane: 'edge' };
                        case 'STONE_FENCE':
                            return { color: '#6a6a6a', weight: 2, opacity: 0.85, interactive: false, pane: 'edge' };
                        case 'STONE_PIER':
                            return { color: '#848484', weight: 2.5, opacity: 0.85, interactive: false, pane: 'edge' };
                        case 'TRAIL':
                            return { color: '#7a6752', weight: 2.5, opacity: 0.85, interactive: false, pane: 'edge' };
                        case 'INVISIBLE':
                        default:
                            return { stroke: false, interactive: false, pane: 'edge' };
                    }
                case 'WATER':
                    return { fillColor: '#517aa6', fillOpacity: 1, fill: true, stroke: false, interactive: false, pane: 'water' };
                case 'BUILDING':
                    return { fillColor: '#b08f70', fillOpacity: 1, color: '#3a2b1d', weight: 0.5, stroke: true, interactive: true, pane: 'edge' };
                default:
                    return { color: '#333', weight: 1, interactive: false };
            }
        },

        onEachFeature: function (feature, layer) {
            if (feature.properties.type === 'BUILDING') {
                buildingLayers[feature.properties.id] = layer;

                layer.on('click', () => {
                    highlightBuildingLayer(layer);
                    onBuildingClick(feature.properties.id);
                });

                layer.on('mouseover', function () {
                    if (currentSelectedLayer !== this) {
                        this.setStyle({ fillColor: '#967354' });
                    }
                });
                layer.on('mouseout', function () {
                    if (currentSelectedLayer !== this) {
                        this.setStyle({ fillColor: '#b08f70' });
                    }
                });
            }
        }
    }).addTo(map);

    window.highlightBuildingById = function(id) {
        const targetLayer = buildingLayers[id];
        if (targetLayer) {
            highlightBuildingLayer(targetLayer);
            if (typeof targetLayer.getBounds === 'function') {
                map.panTo(targetLayer.getBounds().getCenter());
            }
        }
    };

    const townBounds = L.geoJSON(geoJSON, {
        coordsToLatLng: function(coords) { return new L.LatLng(coords[1], coords[0]); }
    }).getBounds();
    
    if (townBounds.isValid()) {
        map.fitBounds(townBounds, { padding: [30, 30] });
    }
}

function highlightBuildingLayer(layer) {
    if (currentSelectedLayer) {
        currentSelectedLayer.setStyle({ fillColor: '#b08f70', color: '#3a2b1d', weight: 0.5 });
    }
    currentSelectedLayer = layer;
    layer.setStyle({ fillColor: '#a27c5a', color: '#d32f2f', weight: 3 });
}

const roadTypeOptions = {
    "MAIN_ROAD": [
        {
            corridor: 2 + 0.5, 
            color: '#7a6752',
            opacity: 1,
            stroke: true,
            interactive: false,
            pane: 'roadCasing'
        },
        {
            corridor: 2,     
            color: '#e3dad0',
            opacity: 1,
            stroke: true,
            interactive: false,
            pane: 'roadFill'
        }
    ],
    "ROAD": [
        {
            corridor: 1 + 0.5, 
            color: '#7a6752',
            opacity: 1,
            stroke: true,
            interactive: false,
            pane: 'roadCasing'
        },
        {
            corridor: 1,     
            color: '#e3dad0',
            opacity: 1,
            stroke: true,
            interactive: false,
            pane: 'roadFill'
        }
    ],
    "SMALL_ROAD": [
        {
            corridor: 0.5 + 0.5, 
            color: '#7a6752',
            opacity: 1,
            stroke: true,
            interactive: false,
            pane: 'roadCasing'
        },
        {
            corridor: 0.5,     
            color: '#e3dad0',
            opacity: 1,
            stroke: true,
            interactive: false,
            pane: 'roadFill'
        }
    ],
    "DIRT_ROAD": [
        {
            corridor: 0.5, 
            color: '#665335',
            opacity: 1,
            stroke: true,
            interactive: false,
            pane: 'roadFill'
        }
    ],
    "TRAIL": [
        {
            corridor: 0.5, 
            color: '#777776',
            opacity: 0.4,
            stroke: true,
            interactive: false,
            pane: 'roadFill'
        }
    ],
}

function addRoadToMap(map, feature){
    const latLngs = feature.geometry.coordinates.map(coord => new L.LatLng(coord[1], coord[0]));

    roadTypeOptions[feature.properties.edgeType].forEach(element => {
        L.corridor(latLngs, element).addTo(map);
    });
}