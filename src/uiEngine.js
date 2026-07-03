// Keep track of the active tab state, building data, and currently inspected NPC
let currentBuildingData = null;
let activeTab = 'currently-here';
let selectedNPC = null;

export function updateSidebar(data) {
    const emptyState = document.getElementById('empty-state');
    const displayState = document.getElementById('data-display');

    if (!data) {
        emptyState.classList.remove('hidden');
        displayState.classList.add('hidden');
        currentBuildingData = null;
        selectedNPC = null;
        return;
    }

    // Save data reference for tab switches
    currentBuildingData = data;
    selectedNPC = null; // Reset inspected NPC when a new building is clicked
    
    emptyState.classList.add('hidden');
    displayState.classList.remove('hidden');

    // 1. Refresh Header Layout
    renderHeaderInfo();

    // 2. Initialize or refresh the tab interaction handlers once
    setupTabListeners();

    // 3. Render the contents of whichever tab is currently selected
    renderActiveTabContent();
}

function renderHeaderInfo() {
    if (!currentBuildingData) return;

    const nameEl = document.getElementById('bldg-name');
    const typeEl = document.getElementById('bldg-type');
    const countEl = document.getElementById('bldg-count');
    const hoursEl = document.getElementById('bldg-hours');
    const backBtnContainer = document.getElementById('back-button-container');

    if (selectedNPC) {
        // Show the top escape hatch button frame
        backBtnContainer.classList.remove('hidden');

        // Wire up the button callback routine
        const backBtn = document.getElementById('back-to-bldg-btn');
        backBtn.replaceWith(backBtn.cloneNode(true)); // Clear old listener stacks
        document.getElementById('back-to-bldg-btn').addEventListener('click', () => {
            selectedNPC = null;
            renderHeaderInfo();
            setupTabListeners();
            renderActiveTabContent();
        });

        // Change header details to show character info
        nameEl.textContent = selectedNPC.fullName;
        typeEl.textContent = `${selectedNPC.race.toUpperCase()} • ${selectedNPC.job.toUpperCase()}`;
        countEl.textContent = `Employed or residing at this structure`; // TODO maybe change to reside/work/reside and work based on npc data residence and workplace
        hoursEl.textContent = `Status: Active`; // TODO what is this? change so maybe it's "working" or remove it entirely
    } else {
        // Hide top button row when looking at standard building files
        backBtnContainer.classList.add('hidden');

        // Standard building info header layout
        nameEl.textContent = currentBuildingData.name || "Unnamed Structure";
        typeEl.textContent = currentBuildingData.type || "Structure";
        countEl.textContent = `${currentBuildingData.population.length} people live/work here`;
        hoursEl.textContent = currentBuildingData.isOpen ? "Open" : "Closed / Private"; // TODO change if maybe the building is private it's written "private" so pass extra data bc if no opening hours data exists that means the building is private
    }
}

function setupTabListeners() {
    const tabContainer = document.querySelector('.tab-container');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    // 1. Reclone to clear out stale event listener piles
    tabButtons.forEach(button => {
        button.replaceWith(button.cloneNode(true));
    });

    const freshButtons = document.querySelectorAll('.tab-btn');
    freshButtons.forEach(button => {
        if (button.getAttribute('data-tab') === activeTab) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }

        button.addEventListener('click', (e) => {
            freshButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            activeTab = e.target.getAttribute('data-tab');
            renderActiveTabContent();
        });
    });

    // 2. Safely apply the layout hide rule down here instead of returning early
    if (selectedNPC) {
        tabContainer.classList.add('hidden');
    } else {
        tabContainer.classList.remove('hidden');
    }
}

function renderActiveTabContent() {
    const contentPanel = document.getElementById('tab-content');
    if (!currentBuildingData) return;

    contentPanel.innerHTML = ''; // Clear layout panel frame

    // IF an NPC is selected, bypass normal tabs and render the Profile sheet instead
    if (selectedNPC) {
        renderNPCProfileSheet(contentPanel);
        return;
    }

    if (activeTab === 'currently-here') {
        contentPanel.innerHTML = `<div class="empty-text">No travelers or temporary visitors tracked here right now.</div>`;
    } else if (activeTab === 'related') {
        renderPeopleGrid(contentPanel, currentBuildingData.population);
    } else if (activeTab === 'notes') {
        const noteText = currentBuildingData.notes || "No historical logs or GM notes recorded for this location.";
        const attributes = 'class="notes-block' + (currentBuildingData.notes==null ? ' empty-text"' : '" style="font-style: italic; line-height: 1.5; color: #4a5568;"');
        contentPanel.innerHTML = `<div ${attributes}>${noteText}</div>`;
    }
}
// TODO change rooms definitions to a dict for each specific type of building because each building has different rooms, but not on related people, just on active ones, but while that isn't implement this isn't needed
function renderPeopleGrid(container, people) {
    if (!people || people.length === 0) {
        container.innerHTML = '<div class="empty-text">No residential or professional connections documented.</div>';
        return;
    }

    const roomDefinitions = {
        "Management": ["master", "owner", "manager", "proprietor", "captain"],
        "Service Floor / Bar": ["bartender", "maid", "assistant", "server", "innkeeper", "clerk"],
        "Kitchen & Pantry": ["cook", "chef", "baker", "brewer"],
        "Workshops & Labs": ["smith", "alchemist", "artisan", "weaver", "apprentice"],
        "Common Areas": []
    };

    const rooms = {};
    Object.keys(roomDefinitions).forEach(roomName => { rooms[roomName] = []; });

    people.forEach(npc => {
        const jobLower = (npc.job || "").toLowerCase();
        let assigned = false;

        for (const [roomName, keywords] of Object.entries(roomDefinitions)) {
            if (keywords.some(keyword => jobLower.includes(keyword))) {
                rooms[roomName].push(npc);
                assigned = true;
                break;
            }
        }
        if (!assigned) rooms["Common Areas"].push(npc);
    });

    Object.entries(rooms).forEach(([roomName, occupants]) => {
        if (occupants.length === 0) return;

        const section = document.createElement('div');
        section.className = 'room-section';
        section.innerHTML = `<div class="room-title">${roomName}</div>`;

        const grid = document.createElement('div');
        grid.className = 'person-grid';

        occupants.forEach(npc => {
            const card = document.createElement('div');
            card.className = 'person-card';
            card.innerHTML = `
                <div class="person-icon">👤</div>
                <div class="person-info">
                    <div class="person-name" title="${npc.fullName}">${npc.fullName}</div>
                    <div class="person-role">${npc.job}</div>
                </div>
            `;
            
            // Handle clicking a card to open individual NPC layout rules
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedNPC = npc;       // Save target NPC profile state
                renderHeaderInfo();      // Refresh header with identity data
                setupTabListeners();     // Hide tab bar container links
                renderActiveTabContent(); // Shift template engine to sheet profile layout
            });

            grid.appendChild(card);
        });

        section.appendChild(grid);
        container.appendChild(section);
    });
}

function renderNPCProfileSheet(container) {
    const profileWrapper = document.createElement('div');
    profileWrapper.className = 'npc-profile-sheet';
    profileWrapper.style.cssText = "display: flex; flex-direction: column; gap: 15px; max-height: 100%;";

    // 1. Resolve matching names for our related properties
    const buildingsList = currentBuildingData.allBuildingsRaw || [];
    
    const workBuilding = buildingsList.find(b => Number(b.id) === Number(selectedNPC.placeOfWorkId));
    const residenceBuilding = buildingsList.find(b => Number(b.id) === Number(selectedNPC.placeOfResidenceId));

    const workName = workBuilding ? workBuilding.name : `Structure #${selectedNPC.placeOfWorkId}`;
    const residenceName = residenceBuilding ? residenceBuilding.name : `Structure #${selectedNPC.placeOfResidenceId}`;

    // Helper functions for attribute badges and core value bars
    const renderStats = (stats) => {
        if (!stats) return '<div class="empty-text">No stats listed.</div>';
        return Object.entries(stats).map(([stat, val]) => `
            <div style="background: #e6dfcd; border: 1px solid #c8beab; border-radius: 3px; padding: 6px; text-align: center;">
                <div style="font-size: 0.7rem; text-transform: uppercase; font-weight: bold; color: #555;">${stat.substring(0, 3)}</div>
                <div style="font-size: 1.1rem; font-weight: bold; color: #0b1a30;">${val}</div>
            </div>
        `).join('');
    };

    const renderValues = (values) => {
        if (!values) return '<div class="empty-text">No personality profiling.</div>';
        return Object.entries(values).map(([trait, rating]) => {
            const percentage = (rating / 5) * 100;
            return `
                <div style="margin-bottom: 6px; font-size: 0.8rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="text-transform: capitalize; font-weight: bold;">${trait}</span>
                        <span>${rating}/5</span>
                    </div>
                    <div style="background: #e6dfcd; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="background: #b13434; height: 100%; width: ${percentage}%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    };

    profileWrapper.innerHTML = `
        <!-- Primary Profile Block -->
        <div class="profile-details-card" style="background: #f1ede0; border: 1px solid #b8a98f; padding: 15px; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; border-bottom: 1px solid #d3cbb5; padding-bottom: 4px; text-transform: uppercase; font-size: 0.9rem;">Character Dossier</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
                <div><strong>Given Name:</strong> ${selectedNPC.firstName}</div>
                <div><strong>Surname:</strong> ${selectedNPC.lastName}</div>
                <div><strong>Ancestry / Race:</strong> ${selectedNPC.race}</div>
                <div><strong>Vocation:</strong> ${selectedNPC.job}</div>
                <div><strong>Age:</strong> ${selectedNPC.age} cycles</div>
                <div><strong>Gender:</strong> <span style="text-transform: capitalize;">${selectedNPC.gender}</span></div>
                <div><strong>Height:</strong> ${selectedNPC.heightCm} cm</div>
            </div>
        </div>

        <!-- NEW: Related Infrastructure Section -->
        <div style="background: #f1ede0; border: 1px solid #b8a98f; padding: 15px; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; border-bottom: 1px solid #d3cbb5; padding-bottom: 4px; text-transform: uppercase; font-size: 0.9rem;">Affiliated Properties</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                
                <div class="location-link-card" id="go-to-workplace" data-id="${selectedNPC.placeOfWorkId}" style="
                    background: #e6dfcd; border: 1px solid #c8beab; border-radius: 3px; padding: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.15s;
                ">
                    <div>
                        <div style="font-size: 0.7rem; text-transform: uppercase; font-weight: bold; color: #666;">Place of Employment</div>
                        <div style="font-size: 0.85rem; font-weight: bold; color: #0b1a30;">💼 ${workName}</div>
                    </div>
                    <span style="font-size: 0.8rem; color: #b13434;">View →</span>
                </div>

                <div class="location-link-card" id="go-to-residence" data-id="${selectedNPC.placeOfResidenceId}" style="
                    background: #e6dfcd; border: 1px solid #c8beab; border-radius: 3px; padding: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.15s;
                ">
                    <div>
                        <div style="font-size: 0.7rem; text-transform: uppercase; font-weight: bold; color: #666;">Place of Residence</div>
                        <div style="font-size: 0.85rem; font-weight: bold; color: #0b1a30;">🏠 ${residenceName}</div>
                    </div>
                    <span style="font-size: 0.8rem; color: #b13434;">View →</span>
                </div>

            </div>
        </div>

        <!-- RPG Attributes Grid -->
        <div style="background: #f1ede0; border: 1px solid #b8a98f; padding: 15px; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; border-bottom: 1px solid #d3cbb5; padding-bottom: 4px; text-transform: uppercase; font-size: 0.9rem;">Attributes</h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                ${renderStats(selectedNPC.stats)}
            </div>
        </div>

        <!-- Behavioral Mind Profile -->
        <div style="background: #f1ede0; border: 1px solid #b8a98f; padding: 15px; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; border-bottom: 1px solid #d3cbb5; padding-bottom: 4px; text-transform: uppercase; font-size: 0.9rem;">Core Dispositions</h4>
            <div>
                ${renderValues(selectedNPC.coreValues)}
            </div>
        </div>
    `;

    container.appendChild(profileWrapper);

    // Add simple hover backgrounds to our link blocks via JavaScript
    const links = profileWrapper.querySelectorAll('.location-link-card');
    links.forEach(link => {
        link.addEventListener('mouseenter', () => link.style.backgroundColor = '#dfcfb3');
        link.addEventListener('mouseleave', () => link.style.backgroundColor = '#e6dfcd');
        
        // When clicked, trigger a simulated map node click to update everything!
        link.addEventListener('click', (e) => {
            const bldgId = link.getAttribute('data-id');
            console.log(`Navigating directly to affiliated construction node: ${bldgId}`);
            
            // Dispatch a global custom event so mapEngine or main can intercept it if needed,
            // or directly trigger a synthetic click behavior if we have access.
            // For now, let's dispatch a custom event to make it completely modular:
            const navEvent = new CustomEvent('navigateToBuilding', { detail: { id: bldgId } });
            window.dispatchEvent(navEvent);
        });
    });

    // Wire up the escape hatch handler back to the building layout view
    document.getElementById('back-to-bldg-btn').addEventListener('click', () => {
        selectedNPC = null;
        renderHeaderInfo();
        setupTabListeners();
        renderActiveTabContent();
    });
}