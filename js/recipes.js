// Recipe Management Logic

let currentCategory = 'Todas';

// Initialize search listener
function initRecipeSearchListener() {
    const searchInput = document.getElementById('main-recipe-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderRecipes());
    }
    initCategoryListeners();
}

function initCategoryListeners() {
    const pills = document.querySelectorAll('.category-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            // Update State
            currentCategory = pill.dataset.category;

            // Update Visuals
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            // Re-render
            renderRecipes();
        });
    });
}

function renderRecipes() {
    try {
        console.log('Recipes.js: renderRecipes called');
        const recipeGrid = document.querySelector('.recipe-grid');
        console.log('Recipes.js: recipeGrid found?', !!recipeGrid);
        const searchInput = document.getElementById('main-recipe-search');
        const query = searchInput ? searchInput.value.toLowerCase() : '';

        if (recipeGrid) recipeGrid.innerHTML = '';

        const selectList = document.getElementById('select-recipe-list');
        if (selectList) selectList.innerHTML = '';

        if (!state.recipes) {
            state.recipes = [];
        }

        let filteredRecipes = state.recipes.filter(r => {
            const matchesQuery = r.title.toLowerCase().includes(query);
            const matchesCategory = currentCategory === 'Todas' || r.mealType === currentCategory || (currentCategory === 'Postre' && r.mealType === 'Postres');
            return matchesQuery && matchesCategory;
        });

        // Sort (Alphabetical still makes sense as default, but no headers)
        filteredRecipes.sort((a, b) => a.title.localeCompare(b.title));

        if (filteredRecipes.length === 0) {
            const emptyState = document.querySelector('.empty-state');
            if (emptyState) {
                emptyState.style.display = 'flex';
                if (query) {
                    emptyState.querySelector('p').textContent = 'No se encontraron recetas.';
                } else {
                    emptyState.querySelector('p').textContent = 'No hay recetas aún. ¡Añade una!';
                }
            }
        } else {
            const emptyState = document.querySelector('.empty-state');
            if (emptyState) emptyState.style.display = 'none';

            filteredRecipes.forEach(recipe => {
                // Render directly to grid
                if (typeof createRecipeCard === 'function') {
                    const card = createRecipeCard(recipe);
                    if (recipeGrid) recipeGrid.appendChild(card);
                }

                // Populate Select List for Planner (Keep this logic)
                if (selectList) {
                    const selectItem = document.createElement('div');
                    selectItem.className = 'select-recipe-item';
                    // Use similar styling to meal-card but simplified
                    selectItem.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 8px 12px;
                        background-color: var(--md-sys-color-surface-container-low);
                        border-radius: 12px;
                        margin-bottom: 8px;
                        cursor: pointer;
                        border: 1px solid transparent;
                        transition: all 0.2s;
                    `;
                    selectItem.onmouseover = () => selectItem.style.backgroundColor = 'var(--md-sys-color-surface-container-high)';
                    selectItem.onmouseout = () => selectItem.style.backgroundColor = 'var(--md-sys-color-surface-container-low)';

                    // Image handling for select item
                    let imageContent;
                    if (recipe.image) {
                        imageContent = `<img src="${recipe.image}" alt="${recipe.title}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                                        <div class="recipe-avatar" style="width: 40px; height: 40px; font-size: 16px; border-radius: 8px; background-color: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); display: none; align-items: center; justify-content: center; font-weight: bold;">
                                            ${recipe.title.charAt(0).toUpperCase()}
                                        </div>`;
                    } else {
                        imageContent = `<div class="recipe-avatar" style="width: 40px; height: 40px; font-size: 16px; border-radius: 8px; background-color: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                            ${recipe.title.charAt(0).toUpperCase()}
                                        </div>`;
                    }

                    selectItem.innerHTML = `
                        ${imageContent}
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 500; font-size: 14px; color: var(--md-sys-color-on-surface);">${recipe.title}</span>
                            <span style="font-size: 12px; color: var(--md-sys-color-outline);">${recipe.prepTime ? recipe.prepTime + ' min' : '20 min'} • ${recipe.calories ? recipe.calories + ' kcal' : 'Fácil'}</span>
                        </div>
                    `;
                    selectItem.onclick = () => selectRecipeForSlot(recipe.id);
                    selectList.appendChild(selectItem);
                }
            });
        }
    } catch (e) {
        console.error("CRITICAL ERROR in renderRecipes:", e);
    }
}

function openRecipeDetails(recipe) {
    const view = document.getElementById('recipe-details-view');

    // Top Bar Title
    document.getElementById('detail-title').textContent = recipe.title;

    // Wire up Edit Button
    document.getElementById('edit-recipe-action').onclick = () => openEditRecipe(recipe);

    // Hero Image
    const hero = document.getElementById('detail-hero');
    if (recipe.image) {
        hero.innerHTML = `<img src="${recipe.image}" alt="${recipe.title}">`;
    } else {
        hero.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: var(--md-sys-color-primary-container);">
                <span class="material-icons" style="font-size: 64px; opacity: 0.5; color: var(--md-sys-color-on-primary-container);">restaurant</span>
            </div>
        `;
    }

    // Meta Row (Time, Calories, difficulty)
    const metaRow = document.getElementById('detail-meta-row');
    const time = recipe.prepTime ? `${recipe.prepTime} min` : '20 min';
    const cals = recipe.calories ? `${recipe.calories} kcal` : '--- kcal';
    const type = recipe.mealType || '---';

    metaRow.innerHTML = `
        <div class="detail-meta-item">
            <span class="material-icons">schedule</span>
            <span>${time}</span>
        </div>
        <div class="detail-meta-item">
            <span class="material-icons">local_fire_department</span>
            <span>${cals}</span>
        </div>
        <div class="detail-meta-item">
            <span class="material-icons">restaurant_menu</span>
            <span>${type}</span>
        </div>
    `;

    // Ingredients (Pill Style)
    const ingredientsList = document.getElementById('detail-ingredients');
    ingredientsList.innerHTML = recipe.ingredients.map(ing => `
        <div class="ingredient-item-display">
            <span class="ing-name">${ing.name}</span>
            <span class="ing-qty">${ing.quantity} ${ing.unit}</span>
        </div>
    `).join('');

    // Instructions
    let stepsData = [];
    if (recipe.steps && Array.isArray(recipe.steps) && recipe.steps.length > 0) {
        stepsData = recipe.steps;
    } else if (recipe.instructions) {
        stepsData = recipe.instructions.split('\n').filter(s => s.trim().length > 0);
    }

    const instructionsContainer = document.getElementById('detail-instructions-list');
    if (instructionsContainer) {
        if (stepsData.length > 0) {
            instructionsContainer.innerHTML = stepsData.map((step, index) => `
                <div class="instruction-step-card">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-content">${step}</div>
                </div>
            `).join('');
        } else {
            instructionsContainer.innerHTML = '<p style="color: var(--color-grey-text); font-style: italic;">Sin instrucciones.</p>';
        }
    }

    // Actions (Delete)
    document.getElementById('delete-recipe-btn').onclick = () => deleteRecipe(recipe.id);

    // Show View
    view.classList.add('active');
    document.getElementById('close-details-btn').onclick = () => {
        view.classList.remove('active');
    };
}

function openEditRecipe(recipe) {
    if (typeof openRecipeForm === 'function') {
        openRecipeForm(recipe);
    } else {
        console.error("openRecipeForm is not defined. Make sure add-recipe.js is loaded.");
    }
}

function deleteRecipe(id) {
    if (confirm('¿Seguro que quieres eliminar esta receta?')) {
        db.collection("groups").doc(state.groupId).collection("recipes").doc(id).delete()
            .then(() => {
                document.getElementById('recipe-details-view').classList.remove('active');
            })
            .catch(err => console.error("Error deleting:", err));
    }
}

