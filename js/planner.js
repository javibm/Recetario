// Planner Logic
let currentWeekStart = getMonday(new Date());
let selectedSlot = null; // { date: 'YYYY-MM-DD', type: 'lunch'|'dinner'|'breakfast' }

function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
}

function initPlanner() {
    // This function is called by main.js when the view is loaded
    renderPlanner();
}

function renderPlanner() {
    const container = document.getElementById('planner-grid');
    if (!container) return; // View might not be active

    container.innerHTML = '';

    // Update Header Dates
    const startStr = currentWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    const endStr = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

    const label = document.getElementById('current-week-label');
    if (label) label.textContent = `${startStr} - ${endStr}`;

    // Wire up buttons (if not already wired - check if listeners exist? simpler to re-attach or use delegation)
    // For simplicity in this modular approach, we'll re-attach since the view might be re-rendered
    const prevBtn = document.getElementById('prev-week');
    const nextBtn = document.getElementById('next-week');

    if (prevBtn) prevBtn.onclick = () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderPlanner();
    };
    if (nextBtn) nextBtn.onclick = () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderPlanner();
    };

    // Generate 7 Days
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
        const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
        const isToday = new Date().toISOString().split('T')[0] === dateStr;

        const dayCard = document.createElement('div');
        dayCard.className = `day-card ${isToday ? 'today' : ''}`;
        dayCard.id = `day-${dateStr}`; // Add ID for scrolling

        const dayPlan = state.plan[dateStr] || {};

        dayCard.innerHTML = `
            <div class="day-header" onclick="toggleDay('${dateStr}')">
                <div>
                    <h3 class="day-title">${capitalize(dayName)}</h3>
                    <span class="day-date">${date.getDate()} ${capitalize(monthName)}</span>
                </div>
                <span class="material-icons day-toggle-icon">expand_more</span>
            </div>
            <div class="day-divider"></div>
            <div class="day-slots">
                <div class="meal-section-group">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--md-sys-color-primary); font-weight: 600;">Comida</h4>
                    ${renderMealSlot('Principal', 'lunch_main', dayPlan.lunch_main, dateStr)}
                    ${dayPlan.lunch_main ? renderMealSlot('Acompañante', 'lunch_side', dayPlan.lunch_side, dateStr) : ''}
                </div>
                
                <div class="day-divider-small" style="height: 1px; background-color: var(--md-sys-color-outline-variant); margin: 12px 0; opacity: 0.5;"></div>

                <div class="meal-section-group">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--md-sys-color-primary); font-weight: 600;">Cena</h4>
                    ${renderMealSlot('Principal', 'dinner_main', dayPlan.dinner_main, dateStr)}
                    ${dayPlan.dinner_main ? renderMealSlot('Acompañante', 'dinner_side', dayPlan.dinner_side, dateStr) : ''}
                </div>
            </div>
        `;
        container.appendChild(dayCard);
    }

    // Auto-scroll to today
    setTimeout(() => {
        const todayCard = container.querySelector('.day-card.today');
        if (todayCard) {
            todayCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

function toggleDay(dateStr) {
    const card = document.getElementById(`day-${dateStr}`);
    if (card) {
        card.classList.toggle('collapsed');
    }
}

function renderMealSlot(label, type, recipeId, dateStr) {
    let content = '';

    if (recipeId) {
        const recipe = state.recipes.find(r => r.id === recipeId);
        if (recipe) {
            let imageHtml = '';
            if (recipe.image) {
                imageHtml = `<img src="${recipe.image}" class="meal-image" alt="${recipe.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`;
                // Fallback for broken image: hide img, show initials div (which we'll add next to it, hidden by default)
                // Actually, simpler: just use the initials if no image property.
                // User said: "solamente si no hay imagen" (only if there is no image).
                // So we stick to the property check.
            }

            // Re-evaluating logic based on strict user request:
            // IF recipe.image exists -> Show IMG
            // ELSE -> Show Initials DIV

            if (recipe.image) {
                imageHtml = `<img src="${recipe.image}" class="meal-image" alt="${recipe.title}">`;
            } else {
                const initials = getInitials(recipe.title);
                imageHtml = `<div class="meal-initials">${initials}</div>`;
            }

            content = `
                <div class="meal-card">
                    ${imageHtml}
                    <div class="meal-info">
                        <h4 class="meal-title">${recipe.title}</h4>
                        <div class="meal-meta">
                            <span><span class="material-icons" style="font-size: 14px;">schedule</span> 20 min</span>
                            <span><span class="material-icons" style="font-size: 14px;">local_fire_department</span> 320 kcal</span>
                        </div>
                    </div>
                    <button class="remove-meal-btn" onclick="removeFromPlan('${dateStr}', '${type}')">
                        <span class="material-icons">close</span>
                    </button>
                </div>
            `;
        } else {
            content = renderEmptySlot(dateStr, type); // Fallback if recipe not found
        }
    } else {
        content = renderEmptySlot(dateStr, type);
    }

    return `
        <div class="meal-slot">
            <span class="meal-label">${label}</span>
            ${content}
        </div>
    `;
}

function renderEmptySlot(dateStr, type) {
    return `
        <button class="add-meal-btn" onclick="openRecipeSelector('${dateStr}', '${type}')">
            <span class="material-icons">add_circle</span> Añadir receta
        </button>
    `;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function openRecipeSelector(date, type) {
    selectedSlot = { date, type };
    const dialog = document.getElementById('planner-recipe-selector');
    console.log("DEBUG: openRecipeSelector", { date, type, dialog });
    if (!dialog) {
        console.error("CRITICAL: planner-recipe-selector not found in DOM");
        return;
    }

    // Reset search
    const searchInput = document.getElementById('recipe-search');
    if (searchInput) {
        searchInput.value = '';
        searchInput.oninput = (e) => renderRecipeSelector(e.target.value);
    }

    renderRecipeSelector(); // Render all recipes initially
    dialog.showModal();
}

function renderRecipeSelector(query = '') {
    const list = document.getElementById('select-recipe-list');
    if (!list) return;
    list.innerHTML = '';

    // Filter recipes locally
    const allRecipes = state.recipes || [];
    const filtered = allRecipes.filter(r => r.title.toLowerCase().includes(query.toLowerCase()));

    // Sort alpha
    filtered.sort((a, b) => a.title.localeCompare(b.title));

    filtered.forEach(recipe => {
        const selectItem = document.createElement('div');
        // Reuse meal-card class for consistent styling + our new hover class
        selectItem.className = 'meal-card select-recipe-card';

        // Image handling (copied from renderMealSlot logic)
        let imageContent;
        if (recipe.image) {
            imageContent = `<img src="${recipe.image}" class="meal-image" alt="${recipe.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                            <div class="meal-initials" style="display: none;">${getInitials(recipe.title)}</div>`;
        } else {
            imageContent = `<div class="meal-initials">${getInitials(recipe.title)}</div>`;
        }

        const time = recipe.prepTime ? `${recipe.prepTime} min` : '20 min';
        const cals = recipe.calories ? `${recipe.calories} kcal` : '--- kcal';

        selectItem.innerHTML = `
            ${imageContent}
            <div class="meal-info">
                <h4 class="meal-title">${recipe.title}</h4>
                <div class="meal-meta">
                    <span><span class="material-icons" style="font-size: 14px;">schedule</span> ${time}</span>
                    <span><span class="material-icons" style="font-size: 14px;">local_fire_department</span> ${cals}</span>
                </div>
            </div>
            <span class="material-icons" style="color: var(--color-orange-primary); opacity: 0; transition: opacity 0.2s;">add_circle</span>
        `;

        // Add visual cue on hover via JS or rely on CSS. 
        // Let's rely on CSS for the hover effect on the card, but maybe show the icon?
        selectItem.onmouseenter = () => { selectItem.querySelector('.material-icons').style.opacity = '1'; };
        selectItem.onmouseleave = () => { selectItem.querySelector('.material-icons').style.opacity = '0'; };

        selectItem.onclick = () => selectRecipeForSlot(recipe.id);
        list.appendChild(selectItem);
    });
}

function selectRecipeForSlot(recipeId) {
    if (!selectedSlot || !state.groupId) return;

    const { date, type } = selectedSlot;
    const update = {};
    update[`plan.${date}.${type}`] = recipeId;

    db.collection("groups").doc(state.groupId).update(update)
        .then(() => {
            const dialog = document.getElementById('planner-recipe-selector');
            if (dialog) dialog.close();
            selectedSlot = null;
            // The listener in state.js will trigger a re-render, but we can also manually update if needed
        });
}

function removeFromPlan(date, type) {
    if (!state.groupId) return;
    const update = {};
    update[`plan.${date}.${type}`] = firebase.firestore.FieldValue.delete();

    db.collection("groups").doc(state.groupId).update(update);
}

function getInitials(title) {
    if (!title) return '';
    const words = title.trim().split(' ');
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
}
