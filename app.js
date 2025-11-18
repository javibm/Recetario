document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        recipes: [],
        weeklyPlan: {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
        }
    };

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = {
        monday: 'Lunes',
        tuesday: 'Martes',
        wednesday: 'Miércoles',
        thursday: 'Jueves',
        friday: 'Viernes',
        saturday: 'Sábado',
        sunday: 'Domingo'
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
            document.getElementById('page-title').textContent = titleMap[targetId];
        });
    });

    // --- Recipe Management ---

    // Load Data
    function loadData() {
        const savedRecipes = localStorage.getItem('recetario_recipes');
        if (savedRecipes) {
            state.recipes = JSON.parse(savedRecipes);
            renderRecipes();
        }
        const savedPlan = localStorage.getItem('recetario_plan');
        if (savedPlan) {
            state.weeklyPlan = JSON.parse(savedPlan);
        }
    }

    function saveData() {
        localStorage.setItem('recetario_recipes', JSON.stringify(state.recipes));
        localStorage.setItem('recetario_plan', JSON.stringify(state.weeklyPlan));
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

            // Also remove from weekly plan
            Object.keys(state.weeklyPlan).forEach(day => {
                state.weeklyPlan[day] = state.weeklyPlan[day].filter(id => id !== currentRecipeId);
            });

            saveData();
            renderRecipes();
            recipeDetailsDialog.close();
        }
    });

    // --- Weekly Planner Logic ---
    const plannerContainer = document.querySelector('.week-grid');
    const selectRecipeDialog = document.getElementById('select-recipe-dialog');
    const closeSelectDialogBtn = document.getElementById('close-select-dialog');
    const selectRecipeList = document.getElementById('select-recipe-list');
    let currentDayForPlan = null;

    function renderPlanner() {
        plannerContainer.innerHTML = '';
        daysOfWeek.forEach(day => {
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';

            const assignedRecipes = state.weeklyPlan[day].map(id => state.recipes.find(r => r.id === id)).filter(Boolean);

            let recipesHtml = assignedRecipes.map(recipe => `
                <div class="planned-recipe-chip">
                    <span>${recipe.title}</span>
                    <button class="remove-plan-btn" onclick="removeRecipeFromDay('${day}', '${recipe.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                    </button>
                </div>
            `).join('');

            dayCard.innerHTML = `
                <div class="day-header">
                    <h3>${dayLabels[day]}</h3>
                    <button class="add-to-day-btn" onclick="openSelectRecipe('${day}')">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
                    </button>
                </div>
                <div class="day-recipes">
                    ${recipesHtml}
                </div>
            `;
            plannerContainer.appendChild(dayCard);
        });
    }

    // Expose these to global scope for inline onclick handlers
    window.openSelectRecipe = (day) => {
        currentDayForPlan = day;
        renderSelectRecipeList();
        selectRecipeDialog.showModal();
    };

    window.removeRecipeFromDay = (day, recipeId) => {
        state.weeklyPlan[day] = state.weeklyPlan[day].filter(id => id !== recipeId);
        saveData();
        renderPlanner();
    };

    function renderSelectRecipeList() {
        selectRecipeList.innerHTML = '';
        state.recipes.forEach(recipe => {
            const item = document.createElement('div');
            item.className = 'select-recipe-item';
            item.textContent = recipe.title;
            item.addEventListener('click', () => {
                state.weeklyPlan[currentDayForPlan].push(recipe.id);
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

        // Aggregate ingredients
        daysOfWeek.forEach(day => {
            state.weeklyPlan[day].forEach(recipeId => {
                const recipe = state.recipes.find(r => r.id === recipeId);
                if (recipe) {
                    ingredients.push(...recipe.ingredients);
                }
            });
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

            // Toggle strikethrough
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

    // --- Add Recipe Dialog Logic ---
    fabAddRecipe.addEventListener('click', () => {
        recipeForm.reset();
        ingredientsList.innerHTML = '';
        addIngredientInput(); // Add one empty input
        recipeDialog.showModal();
    });

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

    // Save Recipe
    recipeForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(recipeForm);
        const title = document.getElementById('recipe-title').value;
        const instructions = document.getElementById('recipe-instructions').value;

        // Collect ingredients
        const ingredientInputs = document.querySelectorAll('input[name="ingredient"]');
        const ingredients = Array.from(ingredientInputs).map(input => input.value).filter(val => val.trim() !== '');

        const newRecipe = {
            id: Date.now().toString(),
            title,
            ingredients,
            instructions
        };

        state.recipes.push(newRecipe);
        saveData();
        renderRecipes();
        recipeDialog.close();
    });

    // Initialize
    loadData();
});
