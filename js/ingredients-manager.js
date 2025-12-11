// Ingredients Manager Logic

function initIngredientsManager() {
    console.log("DEBUG: [ingredients-manager.js] Initializing...");

    // 1. Profile Dropdown Logic
    const profileBtn = document.getElementById('user-profile-btn');
    const dropdown = document.getElementById('profile-menu-dropdown');

    if (profileBtn && dropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent closing immediately
            const rect = profileBtn.getBoundingClientRect();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdown.style.display === 'block' && !dropdown.contains(e.target) && !profileBtn.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    // 2. Open Ingredients View Logic
    const manageBtn = document.getElementById('btn-manage-ingredients');
    if (manageBtn) {
        manageBtn.addEventListener('click', () => {
            openIngredientsView();
            if (dropdown) dropdown.style.display = 'none';
        });
    }

    // 3. Listen for section updates
    if (state.groupId) {
        db.collection("groups").doc(state.groupId).collection("metadata").doc("ingredient_sections")
            .onSnapshot(doc => {
                state.ingredientSections = doc.exists ? doc.data() : {};
                // Re-render if view is active
                if (document.getElementById('ingredients-view').classList.contains('active')) {
                    filterIngredientsList(document.getElementById('ingredients-search')?.value || '');
                }
            });
    }
}

function openIngredientsView() {
    const container = document.getElementById('ingredients-view');
    if (!container) return;

    // Inject View if it doesn't have the header
    if (!container.querySelector('.dialog-header') && window.IngredientsView) {
        container.innerHTML = window.IngredientsView.template;
        // Attach View Listeners
        document.getElementById('close-ingredients-view').addEventListener('click', () => {
            container.classList.remove('active');
        });

        const searchInput = document.getElementById('ingredients-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => filterIngredientsList(e.target.value));
        }

        // Section Selector Close
        const closeSelector = document.getElementById('close-section-selector');
        if (closeSelector) closeSelector.addEventListener('click', () => {
            document.getElementById('section-selector-dialog').close();
        });
    }

    container.classList.add('active');
    loadIngredientsForManager();
}

function loadIngredientsForManager() {
    console.log("DEBUG: Loading ingredients for manager...");
    const listContainer = document.getElementById('ingredients-manager-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="loader-container"><div class="spinner"></div></div>';

    if (!state.groupId) return;

    db.collection("groups").doc(state.groupId).collection("metadata").doc("ingredients")
        .get()
        .then((doc) => {
            if (doc.exists && doc.data().list) {
                const list = doc.data().list.sort();
                state.ingredientsList = list; // Cache
                filterIngredientsList(document.getElementById('ingredients-search')?.value || ''); // Use filter to render
            } else {
                listContainer.innerHTML = '<div class="empty-state"><p>No hay ingredientes guardados.</p></div>';
            }
        })
        .catch(err => {
            console.error("Error loading ingredients:", err);
            listContainer.innerHTML = '<p class="error-text">Error al cargar ingredientes</p>';
        });
}

function renderIngredientsList(list) {
    const listContainer = document.getElementById('ingredients-manager-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    // Ensure sections are loaded
    const sections = state.ingredientSections || {};

    // Sort properly for Spanish
    list.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    let currentLetter = '';

    list.forEach(ingName => {
        // Normalize to get base letter (Á -> A)
        const firstLetter = ingName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").charAt(0).toUpperCase();

        // Insert Header if letter changes
        if (firstLetter !== currentLetter) {
            currentLetter = firstLetter;
            const header = document.createElement('div');
            header.className = 'alpha-section-header';
            header.textContent = currentLetter;
            // Sticky positioning: Top = Main Header Height (approx 136px)
            header.style.cssText = `
                position: sticky;
                top: 136px; 
                background-color: var(--md-sys-color-background);
                padding: 8px 16px;
                font-family: var(--font-family-serif);
                font-size: 18px;
                font-weight: bold;
                color: var(--md-sys-color-primary);
                z-index: 50; 
                border-bottom: 1px solid var(--md-sys-color-outline-variant);
                margin-bottom: 8px;
            `;
            listContainer.appendChild(header);
        }

        const lowerName = ingName.toLowerCase();
        const currentSection = sections[lowerName];

        const item = document.createElement('div');
        item.className = 'ingredient-manager-item';

        item.innerHTML = `
            <div class="ingredient-info">
                <span class="ingredient-name">${ingName}</span>
                <span class="section-chip ${currentSection ? '' : 'unassigned'}">
                    ${currentSection || 'Asignar Sección'}
                </span>
            </div>
            <button class="icon-btn delete-ing" style="color: var(--md-sys-color-error); opacity: 0.7;">
                <span class="material-icons">delete_outline</span>
            </button>
        `;

        // Interaction: Delete
        item.querySelector('.delete-ing').onclick = (e) => {
            e.stopPropagation();
            deleteIngredient(ingName);
        };

        // Interaction: Open Section Selector
        item.querySelector('.section-chip').onclick = (e) => {
            e.stopPropagation();
            openSectionSelector(ingName, currentSection);
        };

        listContainer.appendChild(item);
    });
}

function openSectionSelector(ingName, currentSection) {
    const dialog = document.getElementById('section-selector-dialog');
    const optionsList = document.getElementById('section-options-list');
    if (!dialog || !optionsList) return;

    const standardSections = [
        "Verduras y Frutas",
        "Carnes y Proteínas",
        "Lácteos",
        "Panadería",
        "Congelados",
        "Bebidas",
        "Despensa",
        "Limpieza",
        "Otros"
    ];

    optionsList.innerHTML = `<div class="section-options-grid"></div>`;
    const grid = optionsList.querySelector('.section-options-grid');

    standardSections.forEach(section => {
        const btn = document.createElement('button');
        btn.className = `section-option-btn ${currentSection === section ? 'active' : ''}`;
        btn.textContent = section;
        btn.onclick = () => assignSection(ingName, section);
        grid.appendChild(btn);
    });

    dialog.showModal();
}

function assignSection(ingName, section) {
    console.log(`Assigning ${ingName} to ${section}`);
    const lowerName = ingName.toLowerCase();

    // Optimistic Update
    if (!state.ingredientSections) state.ingredientSections = {};
    state.ingredientSections[lowerName] = section;

    // Re-render immediately for responsiveness
    filterIngredientsList(document.getElementById('ingredients-search')?.value || '');
    document.getElementById('section-selector-dialog').close();

    // Persist
    const update = {};
    update[lowerName] = section;

    db.collection("groups").doc(state.groupId).collection("metadata").doc("ingredient_sections")
        .set(update, { merge: true })
        .catch(err => console.error("Error saving section:", err));
}

function filterIngredientsList(query) {
    const list = state.ingredientsList || [];
    const filtered = list.filter(i => i.toLowerCase().includes(query.toLowerCase()));
    renderIngredientsList(filtered);
}

function deleteIngredient(name) {
    if (!confirm(`¿Eliminar "${name}" de la lista de ingredientes conocidos?`)) return;

    db.collection("groups").doc(state.groupId).collection("metadata").doc("ingredients")
        .update({
            list: firebase.firestore.FieldValue.arrayRemove(name)
        })
        .then(() => {
            loadIngredientsForManager(); // Reload
        });
}
