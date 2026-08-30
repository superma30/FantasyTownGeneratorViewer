import { initMap, renderTownLayers } from './mapEngine.js';
import { updateSidebar } from './uiEngine.js';

// Helper function to read uploaded files as JSON
function readJsonFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                resolve(JSON.parse(e.target.result));
            } catch (err) {
                reject(new Error(`Failed to parse ${file.name}`));
            }
        };
        reader.onerror = () => reject(new Error(`Error reading ${file.name}`));
        reader.readAsText(file);
    });
}

function setupFilePicker() {
    return new Promise((resolve) => {
        const modal = document.getElementById('file-modal');
        const loadBtn = document.getElementById('load-files-btn');
        const geojsonInput = document.getElementById('geojson-input');
        const jsonInput = document.getElementById('json-input');
        const errorEl = document.getElementById('modal-error');

        loadBtn.addEventListener('click', async () => {
            errorEl.classList.add('hidden');

            const geoFile = geojsonInput.files[0];
            const jsonFile = jsonInput.files[0];

            if (!geoFile || !jsonFile) {
                errorEl.textContent = 'Please select both files before continuing.';
                errorEl.classList.remove('hidden');
                return;
            }

            try {
                const [geoJSON, rawMetadata] = await Promise.all([
                    readJsonFile(geoFile),
                    readJsonFile(jsonFile)
                ]);

                // Hide modal and pass parsed datasets back
                modal.style.display = 'none';
                resolve({ geoJSON, rawMetadata });
            } catch (err) {
                errorEl.textContent = err.message || 'Error parsing uploaded JSON files.';
                errorEl.classList.remove('hidden');
            }
        });
    });
}

async function bootstrapApp() {
    // 1. Wait for user to select files and parse them
    const { geoJSON, rawMetadata } = await setupFilePicker();

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
            description: building.description,
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
            appearance: person.appearance,
            race: person.race || "Unknown",
            job: person.jobTitle || "Resident",
            religion: person.religion,
            stats: person.stats || null,
            coreValues: person.coreValues || null,
            placeOfWorkId: person.placeOfWork,
            placeOfResidenceId: person.placeOfResidence,
            childInFamilies: person.childInFamilies,
            parentInFamilies: person.parentInFamilies
        }));
}

bootstrapApp();