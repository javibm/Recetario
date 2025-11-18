document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        recipes: [],
        // Plan structure: { "YYYY-MM-DD": { lunch: "recipeId", dinner: "recipeId" } }
        plan: {},
        currentWeekOffset: 0 // 0 = current week, -1 = previous, 1 = next
    };

    // --- DOM Elements ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const fabAddRecipe = document.getElementById('fab-add-recipe');
    const recipeDialog = document.getElementById('recipe-dialog');
    const closeDialogBtn = document.getElementById('close-dialog');
    const cancelRecipeBtn = document.getElementById('cancel-recipe');
    const recipeForm = document.getElementById('recipe-form');
    const ingredientsList = document.getElementById('ingredients-list');
    const addIngredientBtn = document.getElementById('add-ingredient-btn');
    const recipeListContainer = document.querySelector('.recipe-list');
    const emptyState = document.querySelector('.empty-state');
    const pageTitle = document.getElementById('page-title');

    // --- Navigation Logic ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update UI
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Switch View
            const targetId = item.getAttribute('data-target');
            views.forEach(view => {
                view.classList.remove('active');
                if (view.id === targetId) {
                    view.classList.add('active');
                    if (targetId === 'planner-view') renderPlanner();
                    if (targetId === 'shopping-view') renderShoppingList();
                }
            });

            // Update Header Title
            const titleMap = {
                'recipes-view': 'Recetas',
                'planner-view': 'Plan Semanal',
                'shopping-view': 'Lista de Compra'
            };
            pageTitle.textContent = titleMap[targetId];

            // Show/Hide FAB
            fabAddRecipe.style.display = targetId === 'recipes-view' ? 'flex' : 'none';
        });
    });

    // --- Helper Functions ---
    function getMonday(d) {
        d = new Date(d);
        var day = d.getDay(),
            diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
        return new Date(d.setDate(diff));
    }

    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    function getWeekDays(offset) {
        const today = new Date();
        const currentMonday = getMonday(today);
        currentMonday.setDate(currentMonday.getDate() + (offset * 7));

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(currentMonday);
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    }

    // --- Recipe Management ---

    // Load Data
    function loadData() {
        const savedRecipes = localStorage.getItem('recetario_recipes');
        if (savedRecipes) {
            state.recipes = JSON.parse(savedRecipes);
            renderRecipes();
        }
        const savedPlan = localStorage.getItem('recetario_plan_v2');
        if (savedPlan) {
            state.plan = JSON.parse(savedPlan);
        }
    }

    function saveData() {
        localStorage.setItem('recetario_recipes', JSON.stringify(state.recipes));
        localStorage.setItem('recetario_plan_v2', JSON.stringify(state.plan));
    }

    // Render Recipes
    function renderRecipes() {
        recipeListContainer.innerHTML = '';

        if (state.recipes.length === 0) {
            emptyState.style.display = 'flex';
            return;
        } else {
            emptyState.style.display = 'none';
        }

        state.recipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <h3>${recipe.title}</h3>
                <span class="material-icon">chevron_right</span>
            `;
            card.addEventListener('click', () => openRecipeDetails(recipe));
            recipeListContainer.appendChild(card);
        });
    }

    // Recipe Details & Deletion
    const recipeDetailsDialog = document.getElementById('recipe-details-dialog');
    const closeDetailDialogBtn = document.getElementById('close-detail-dialog');
    const deleteRecipeBtn = document.getElementById('delete-recipe-btn');
    const editRecipeBtn = document.getElementById('edit-recipe-btn'); // New Edit Button
    let currentRecipeId = null;

    function openRecipeDetails(recipe) {
        currentRecipeId = recipe.id;
        document.getElementById('detail-title').textContent = recipe.title;

        const ingredientsUl = document.getElementById('detail-ingredients');
        ingredientsUl.innerHTML = recipe.ingredients.map(ing => `<li>${ing}</li>`).join('');

        document.getElementById('detail-instructions').textContent = recipe.instructions;

        recipeDetailsDialog.showModal();
    }

    closeDetailDialogBtn.addEventListener('click', () => recipeDetailsDialog.close());

    deleteRecipeBtn.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres eliminar esta receta?')) {
            state.recipes = state.recipes.filter(r => r.id !== currentRecipeId);
            // Cleanup plan? Optional, but good practice
            saveData();
            renderRecipes();
            recipeDetailsDialog.close();
        }
    });

    // Edit Recipe Logic
    editRecipeBtn.addEventListener('click', () => {
        const recipe = state.recipes.find(r => r.id === currentRecipeId);
        if (recipe) {
            recipeDetailsDialog.close();
            openRecipeDialog(recipe);
        }
    });

    // --- Add/Edit Recipe Dialog Logic ---
    let editingRecipeId = null;

    function openRecipeDialog(recipeToEdit = null) {
        recipeForm.reset();
        ingredientsList.innerHTML = '';
        editingRecipeId = null;

        if (recipeToEdit) {
            editingRecipeId = recipeToEdit.id;
            document.getElementById('dialog-title').textContent = 'Editar Receta';
            document.getElementById('recipe-title').value = recipeToEdit.title;
            document.getElementById('recipe-instructions').value = recipeToEdit.instructions;
            recipeToEdit.ingredients.forEach(ing => addIngredientInput(ing));
        } else {
            document.getElementById('dialog-title').textContent = 'Nueva Receta';
            addIngredientInput(); // Add one empty input
        }

        recipeDialog.showModal();
    }

    fabAddRecipe.addEventListener('click', () => openRecipeDialog());

    closeDialogBtn.addEventListener('click', () => recipeDialog.close());
    cancelRecipeBtn.addEventListener('click', () => recipeDialog.close());

    // Dynamic Ingredients
    function addIngredientInput(value = '') {
        const div = document.createElement('div');
        div.className = 'ingredient-row';
        div.innerHTML = `
            <input type="text" name="ingredient" placeholder="Ingrediente" value="${value}" required style="flex:1">
            <button type="button" class="btn-text" onclick="this.parentElement.remove()" style="padding: 0 8px; min-width: auto;">✕</button>
        `;
        ingredientsList.appendChild(div);
    }

    addIngredientBtn.addEventListener('click', () => addIngredientInput());

    // Save Recipe (Create or Update)
    recipeForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('recipe-title').value;
        const instructions = document.getElementById('recipe-instructions').value;
        const ingredientInputs = document.querySelectorAll('input[name="ingredient"]');
        const ingredients = Array.from(ingredientInputs).map(input => input.value).filter(val => val.trim() !== '');

        if (editingRecipeId) {
            // Update
            const index = state.recipes.findIndex(r => r.id === editingRecipeId);
            if (index !== -1) {
                state.recipes[index] = { ...state.recipes[index], title, ingredients, instructions };
            }
        } else {
            // Create
            const newRecipe = {
                id: Date.now().toString(),
                title,
                ingredients,
                instructions
            };
            state.recipes.push(newRecipe);
        }

        saveData();
        renderRecipes();
        recipeDialog.close();
    });


    // --- Weekly Planner Logic V2 ---
    const plannerContainer = document.querySelector('.week-grid');
    const selectRecipeDialog = document.getElementById('select-recipe-dialog');
    const closeSelectDialogBtn = document.getElementById('close-select-dialog');
    const selectRecipeList = document.getElementById('select-recipe-list');

    let targetDate = null;
    let targetSlot = null; // 'lunch' or 'dinner'

    function renderPlanner() {
        const weekDays = getWeekDays(state.currentWeekOffset);
        const todayStr = formatDate(new Date());

        // Update Header Info
        const start = weekDays[0];
        const end = weekDays[6];
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const weekLabel = `${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]}`;

        // Inject Week Navigation Header if not exists
        let navHeader = document.querySelector('.planner-header');
        if (!navHeader) {
            navHeader = document.createElement('div');
            navHeader.className = 'planner-header';
            plannerContainer.parentElement.insertBefore(navHeader, plannerContainer);
        }
        navHeader.innerHTML = `
            <button class="week-nav-btn" id="prev-week">←</button>
            <h2>${weekLabel}</h2>
            <button class="week-nav-btn" id="next-week">→</button>
        `;

        // Bind Nav Buttons
        document.getElementById('prev-week').onclick = () => { state.currentWeekOffset--; renderPlanner(); };
        document.getElementById('next-week').onclick = () => { state.currentWeekOffset++; renderPlanner(); };

        plannerContainer.innerHTML = '';

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        weekDays.forEach(dateObj => {
            const dateKey = formatDate(dateObj);
            const isToday = dateKey === todayStr;
            const dayPlan = state.plan[dateKey] || {};

            const dayCard = document.createElement('div');
            dayCard.className = `day-card ${isToday ? 'today' : ''}`;

            const lunchRecipe = state.recipes.find(r => r.id === dayPlan.lunch);
            const dinnerRecipe = state.recipes.find(r => r.id === dayPlan.dinner);

            dayCard.innerHTML = `
                <div class="day-header">
                    <h3>${dayNames[dateObj.getDay()]} <span class="date-label">${dateObj.getDate()}</span></h3>
                </div>
                <div class="day-slots">
                    <div class="slot">
                        <span class="slot-label">Comida</span>
                        <div class="slot-content ${lunchRecipe ? 'filled' : ''}" onclick="openSelectRecipe('${dateKey}', 'lunch')">
                            ${lunchRecipe ? `
                                <span class="planned-recipe-chip">
                                    ${lunchRecipe.title}
                                    <button class="remove-plan-btn" onclick="event.stopPropagation(); removeRecipeFromPlan('${dateKey}', 'lunch')">✕</button>
                                </span>
                            ` : '<span style="color:var(--md-sys-color-outline); font-size:24px;">+</span>'}
                        </div>
                    </div>
                    <div class="slot">
                        <span class="slot-label">Cena</span>
                        <div class="slot-content ${dinnerRecipe ? 'filled' : ''}" onclick="openSelectRecipe('${dateKey}', 'dinner')">
                            ${dinnerRecipe ? `
                                <span class="planned-recipe-chip">
                                    ${dinnerRecipe.title}
                                    <button class="remove-plan-btn" onclick="event.stopPropagation(); removeRecipeFromPlan('${dateKey}', 'dinner')">✕</button>
                                </span>
                            ` : '<span style="color:var(--md-sys-color-outline); font-size:24px;">+</span>'}
                        </div>
                    </div>
                </div>
            `;
            plannerContainer.appendChild(dayCard);
        });
    }

    // Global handlers for inline clicks
    window.openSelectRecipe = (date, slot) => {
        targetDate = date;
        targetSlot = slot;
        renderSelectRecipeList();
        selectRecipeDialog.showModal();
    };

    window.removeRecipeFromPlan = (date, slot) => {
        if (state.plan[date]) {
            delete state.plan[date][slot];
            // Clean up empty days
            if (!state.plan[date].lunch && !state.plan[date].dinner) {
                delete state.plan[date];
            }
            saveData();
            renderPlanner();
        }
    };

    function renderSelectRecipeList() {
        selectRecipeList.innerHTML = '';
        state.recipes.forEach(recipe => {
            const item = document.createElement('div');
            item.className = 'select-recipe-item';
            item.textContent = recipe.title;
            item.addEventListener('click', () => {
                if (!state.plan[targetDate]) state.plan[targetDate] = {};
                state.plan[targetDate][targetSlot] = recipe.id;
                saveData();
                renderPlanner();
                selectRecipeDialog.close();
            });
            selectRecipeList.appendChild(item);
        });
    }

    closeSelectDialogBtn.addEventListener('click', () => selectRecipeDialog.close());


    // --- Shopping List Logic ---
    const shoppingListContainer = document.querySelector('.shopping-list');

    function renderShoppingList() {
        shoppingListContainer.innerHTML = '';
        const ingredients = [];
        const weekDays = getWeekDays(state.currentWeekOffset);

        // Aggregate ingredients for the CURRENTLY VIEWED week
        weekDays.forEach(dateObj => {
            const dateKey = formatDate(dateObj);
            const dayPlan = state.plan[dateKey];
            if (dayPlan) {
                if (dayPlan.lunch) {
                    const r = state.recipes.find(recipe => recipe.id === dayPlan.lunch);
                    if (r) ingredients.push(...r.ingredients);
                }
                if (dayPlan.dinner) {
                    const r = state.recipes.find(recipe => recipe.id === dayPlan.dinner);
                    if (r) ingredients.push(...r.ingredients);
                }
            }
        });

        if (ingredients.length === 0) {
            shoppingListContainer.innerHTML = '<p style="text-align:center; color: var(--md-sys-color-outline); margin-top: 24px;">No hay ingredientes para esta semana.</p>';
            return;
        }

        // Simple list for now
        ingredients.forEach((ing, index) => {
            const item = document.createElement('div');
            item.className = 'shopping-item';
            item.innerHTML = `
                <input type="checkbox" id="shop-item-${index}">
                <span>${ing}</span>
            `;

            const checkbox = item.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    item.classList.add('checked');
                } else {
                    item.classList.remove('checked');
                }
            });

            shoppingListContainer.appendChild(item);
        });
    }

    // Initialize
    loadData();
});
