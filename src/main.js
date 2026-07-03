import { initMap, renderTownLayers } from './mapEngine.js';
import { updateSidebar } from './uiEngine.js';

async function bootstrapApp() {
    // 1. Fetch your clean datasets
    const [geoJSON, rawMetadata] = await Promise.all([
        fetch('./public/data/Karimwani.geojson').then(res => res.json()),
        fetch('./public/data/Karimwani.json').then(res => res.json())
    ]);

    // 2. Fire up the flat canvas layout engine
    const map = initMap();

    // 3. Render features and listen for user clicks
    renderTownLayers(map, geoJSON, (buildingId) => {
        const building = buildingById(rawMetadata, buildingId);

        if (!building) {
            console.warn(`Could not find a structural metadata record matching ID: ${buildingId}`);
            updateSidebar(null);
            return;
        }

        const occupants = getPeopleRelatedToBuilding(rawMetadata, buildingId);

        updateSidebar(buildBuildingPayload(rawMetadata.buildings, building, occupants));
    });

    window.addEventListener('navigateToBuilding', (event) => {
        if (typeof window.highlightBuildingById === 'function') {
            window.highlightBuildingById(event.detail.id);
        }
        
        const building = buildingById(rawMetadata, event.detail.id);
        if (!building) return;

        const occupants = getPeopleRelatedToBuilding(rawMetadata, event.detail.id);

        updateSidebar(buildBuildingPayload(rawMetadata.buildings, building, occupants));
    });
}

// Gets the building from its id
function buildingById(data, id){
    return data.buildings.find(b => Number(b.id) === Number(id));
}

// Builds building payload
function buildBuildingPayload(buildings, building, occupants){
    return {
            name: building.name,
            type: building.specificBuildingType ? building.specificBuildingType.toUpperCase() : "STRUCTURE",
            notes: building.notes,
            isOpen: building.openingTimes ? true : false, // TODO integrate with clock (and eventually with opened and closed days)
            population: occupants,
            allBuildingsRaw: buildings
        };
}

// Returns all people related to a building (work there or live there)
function getPeopleRelatedToBuilding(data, buildingId){
    return data.people
        .filter(person => 
            Number(person.placeOfWork) === Number(buildingId) || 
            Number(person.placeOfResidence) === Number(buildingId)
        )
        .map(person => ({
            firstName: person.firstName || "Unknown",
            lastName: person.lastName || "Unknown",
            fullName: `${person.firstName} ${person.lastName}`,
            gender: person.gender || "Unknown",
            age: person.age || "Unknown",
            heightCm: person.appearance?.heightCm || "Unknown",
            race: person.race || "Unknown",
            job: person.jobTitle || "Resident",
            stats: person.stats || null,
            coreValues: person.coreValues || null,
            placeOfWorkId: person.placeOfWork,
            placeOfResidenceId: person.placeOfResidence
        }));
}

bootstrapApp();