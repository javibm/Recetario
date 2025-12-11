console.log("DEBUG: [main.js] Starting initialization...");

// --- Navigation Logic ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('header-title');
    const fabAddRecipe = document.getElementById('fab-add-recipe');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update UI
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Reset Scroll
            window.scrollTo(0, 0);
            const mainContainer = document.querySelector('main');
            if (mainContainer) mainContainer.scrollTop = 0;

            // Switch View
            const targetId = item.getAttribute('data-target');
            views.forEach(view => {
                view.classList.remove('active');
                if (view.id === targetId) {
                    view.classList.add('active');
                    // Trigger specific view renders
                    if (targetId === 'planner-view') {
                        if (typeof renderPlanner === 'function') renderPlanner();
                    }
                    if (targetId === 'shopping-view') {
                        if (typeof renderShoppingList === 'function') renderShoppingList();
                    }
                }
            });

            // Update Header Title & Subtitle
            const titleMap = {
                'recipes-view': { title: 'Mis Recetas', subtitle: '¿Qué vamos a cocinar hoy?' },
                'planner-view': { title: 'Plan Semanal', subtitle: 'Organiza tus comidas' },
                'shopping-view': { title: 'Lista de Compra', subtitle: 'Ingredientes necesarios' }
            };

            const info = titleMap[targetId] || { title: 'Recetario', subtitle: '' };
            if (pageTitle) pageTitle.textContent = info.title;

            const pageSubtitle = document.getElementById('header-subtitle');
            if (pageSubtitle) {
                pageSubtitle.textContent = info.subtitle;
                pageSubtitle.style.display = info.subtitle ? 'block' : 'none';
            }

            // Show/Hide FAB
            if (fabAddRecipe) {
                fabAddRecipe.style.display = targetId === 'recipes-view' ? 'flex' : 'none';
            }
        });
    });
}

// --- View Injection ---
function injectViews() {
    const recipesViewContainer = document.getElementById('recipes-view');
    if (recipesViewContainer && window.RecipesView) {
        recipesViewContainer.innerHTML = window.RecipesView.template;
    }

    const plannerViewContainer = document.getElementById('planner-view');
    if (plannerViewContainer && window.PlannerView) {
        plannerViewContainer.innerHTML = window.PlannerView.template;
    }

    const shoppingViewContainer = document.getElementById('shopping-view');
    if (shoppingViewContainer && window.ShoppingListView) {
        shoppingViewContainer.innerHTML = window.ShoppingListView.template;
    }

    // Inject Recipe Details View (Global container)
    if (!document.getElementById('recipe-details-view') && window.RecipeDetailsView) {
        const div = document.createElement('div');
        div.innerHTML = window.RecipeDetailsView.template;
        const container = document.querySelector('.app-container') || document.body;
        container.appendChild(div.firstElementChild);
    }
}

// --- Loader Logic ---
window.showAppLoader = function (text = 'Cargando...') {
    let loader = document.getElementById('app-loader');
    if (!loader) {
        // Inject if missing
        loader = document.createElement('div');
        loader.id = 'app-loader';
        loader.innerHTML = `
            <div class="loader-spinner"></div>
            <div id="app-loader-text">${text}</div>
        `;
        document.body.appendChild(loader);
    } else {
        const textEl = document.getElementById('app-loader-text');
        if (textEl) textEl.textContent = text;
        loader.classList.remove('hidden');
    }
};

window.hideAppLoader = function () {
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.classList.add('hidden');
    }
};

// --- Realtime Listeners ---
// Make it global so auth.js can call it
window.initRealtimeListeners = function () {
    console.log("DEBUG: [main.js] initRealtimeListeners called. GroupID:", state.groupId);
    if (!state.groupId) {
        console.warn("DEBUG: [main.js] No GroupID, skipping listeners.");
        hideAppLoader(); // Ensure loader is hidden if no group logic runs
        return;
    }

    window.showAppLoader("Evitando conflictos de pareja...");

    // 1. Listen to Recipes
    db.collection("groups").doc(state.groupId).collection("recipes")
        .onSnapshot((snapshot) => {
            state.recipes = [];
            snapshot.forEach((doc) => {
                state.recipes.push({ id: doc.id, ...doc.data() });
            });
            console.log(`DEBUG: [main.js] Loaded ${state.recipes.length} recipes.`);

            // Update UI
            if (typeof renderRecipes === 'function') renderRecipes();

            // Also refresh planner/shopping which depend on recipes
            if (document.getElementById('planner-view').classList.contains('active') && typeof renderPlanner === 'function') {
                renderPlanner();
            }
            if (document.getElementById('shopping-view').classList.contains('active') && typeof renderShoppingList === 'function') {
                renderShoppingList();
            }

            // Allow a small delay for smooth transition then hide loader
            setTimeout(() => {
                window.hideAppLoader();
            }, 500);

        }, error => {
            console.error("Error listening to recipes:", error);
            window.hideAppLoader(); // Hide on error too
        });

    // 2. Listen to Plan
    db.collection("groups").doc(state.groupId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            state.plan = data.plan || {};
            console.log("DEBUG: [main.js] Plan updated.");

            if (document.getElementById('planner-view').classList.contains('active') && typeof renderPlanner === 'function') {
                renderPlanner();
            }
            // Shopping list listens to its own own subcollection mostly, but might depend on plan for generation
            if (document.getElementById('shopping-view').classList.contains('active') && typeof renderShoppingList === 'function') {
                renderShoppingList();
            }
        }
    }, error => {
        console.error("Error listening to plan:", error);
    });

    // 3. Listen to Shopping List (Custom init to handle week/auth)
    if (typeof loadShoppingListForWeek === 'function') {
        loadShoppingListForWeek();
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: [main.js] DOM Content Loaded");

    // 1. Inject Views
    injectViews();

    // 2. Initialize Navigation
    initNavigation();

    // 3. Initialize Auth
    if (typeof initAuthListeners === 'function') {
        initAuthListeners();
    } else {
        console.error("CRITICAL: initAuthListeners not found.");
    }

    // 4. Initialize Feature Logic
    if (typeof initRecipeSearchListener === 'function') initRecipeSearchListener();
    if (typeof initAddRecipeLogic === 'function') initAddRecipeLogic();
    if (typeof initShoppingList === 'function') initShoppingList();
    if (typeof initPlanner === 'function') initPlanner();
    if (typeof initIngredientsManager === 'function') initIngredientsManager();

    // Initial Render of Recipes (empty until auth returns data)
    if (typeof renderRecipes === 'function') renderRecipes();

    console.log("DEBUG: [main.js] Initialization complete.");
});
