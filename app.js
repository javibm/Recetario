console.log("DEBUG: [app.js] Script execution started");

// Firebase is now initialized in js/firebase-init.js
// We use the global variables declared there (db, auth)
if (typeof firebase === 'undefined') {
    console.error("CRITICAL ERROR: [app.js] 'firebase' is undefined. firebase-init.js might have failed or not loaded.");
} else {
    console.log("DEBUG: [app.js] 'firebase' global is available.");
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: [app.js] DOMContentLoaded event fired");

    // --- State Management ---
    const state = {
        recipes: [],
        plan: {},
        currentWeekOffset: 0,
        user: null,
        groupId: null
    };

    // --- DOM Elements ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    // const fabAddRecipe = document.getElementById('fab-add-recipe'); // MOVED DOWN

    // Views (formerly dialogs)
    const recipeFormView = document.getElementById('recipe-form-view');
    const recipeDetailsView = document.getElementById('recipe-details-view');

    // Auth Elements (Declared here for global access within DOMContentLoaded)
    const authDialog = document.getElementById('auth-dialog');
    const authForm = document.getElementById('auth-form');
    const authEmailInput = document.getElementById('auth-email');
    const authPasswordInput = document.getElementById('auth-password');
    const authGroupCodeInput = document.getElementById('auth-group-code');
    const groupCodeContainer = document.getElementById('group-code-container');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const logoutBtn = document.getElementById('logout-btn');

    // Recipe List Elements
    // Selectors must match RecipesView.js template: .recipe-grid, .empty-state
    // Note: These will only be found AFTER injection
    let recipeListContainer = null;
    let emptyState = null;
    let pageTitle = null;

    // INJECT RECIPES VIEW TEMPLATE (Restoring missing logic)
    const recipesViewContainer = document.getElementById('recipes-view');
    if (recipesViewContainer && window.RecipesView) {
        console.log("DEBUG: [app.js] Injecting RecipesView template");
        recipesViewContainer.innerHTML = window.RecipesView.template;

        // Initialize elements AFTER injection
        recipeListContainer = document.querySelector('.recipe-grid');
        emptyState = document.querySelector('.empty-state');
        pageTitle = document.querySelector('.top-app-bar h1');

        // Initialize FAB (Now that it exists)
        const fabAddRecipe = document.getElementById('fab-add-recipe');
        if (fabAddRecipe) {
            fabAddRecipe.addEventListener('click', () => openRecipeDialog());
        }

        // Initialize Category Filters
        const categoryPills = document.querySelectorAll('.category-pill');
        categoryPills.forEach(pill => {
            pill.addEventListener('click', () => {
                // Remove active class from all
                categoryPills.forEach(p => p.classList.remove('active'));
                // Add active class to clicked
                pill.classList.add('active');

                const category = pill.dataset.category;
                console.log("Filter by:", category);
                renderRecipes(category);
            });
        });
    } else {
        console.error("CRITICAL ERROR: [app.js] RecipesView container or template missing!");
    }

    // INJECT PLANNER VIEW TEMPLATE
    const plannerViewContainer = document.getElementById('planner-view');
    if (plannerViewContainer && window.PlannerView) {
        console.log("DEBUG: [app.js] Injecting PlannerView template");
        plannerViewContainer.innerHTML = window.PlannerView.template;
    }

    // INJECT SHOPPING VIEW TEMPLATE
    const shoppingViewContainer = document.getElementById('shopping-view');
    if (shoppingViewContainer && window.ShoppingListView) {
        console.log("DEBUG: [app.js] Injecting ShoppingListView template");
        shoppingViewContainer.innerHTML = window.ShoppingListView.template;
    }

    const closeFormViewBtn = document.getElementById('close-form-view');
    const cancelRecipeBtn = document.getElementById('cancel-recipe');
    const recipeForm = document.getElementById('recipe-form');
    const ingredientsList = document.getElementById('ingredients-list');
    const addIngredientBtn = document.getElementById('add-ingredient-btn');

    // Logout Logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("¿Cerrar sesión?")) {
                auth.signOut().then(() => {
                    console.log("User signed out");
                });
            }
        });
    }

    // Profile Button Logic
    const userProfileBtn = document.getElementById('user-profile-btn');
    const profileMenuDropdown = document.getElementById('profile-menu-dropdown');
    const btnManageIngredients = document.getElementById('btn-manage-ingredients'); // NEW

    if (userProfileBtn && profileMenuDropdown) {
        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = profileMenuDropdown.style.display === 'block';
            profileMenuDropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!userProfileBtn.contains(e.target) && !profileMenuDropdown.contains(e.target)) {
                profileMenuDropdown.style.display = 'none';
            }
        });
    }

    // Manage Ingredients Logic
    if (btnManageIngredients) {
        btnManageIngredients.addEventListener('click', () => {
            alert("Gestión de ingredientes próximamente."); // Placeholder for now to prevent "nothing happens"
            profileMenuDropdown.style.display = 'none';
        });
    }

    // Main Search Logic
    // We need to attach this AFTER RecipesView injection, but we can also delegate or check existence
    // Since we are inside DOMContentLoaded, and we injected RecipesView above, we can query it now.
    const mainRecipeSearch = document.getElementById('main-recipe-search');
    if (mainRecipeSearch) {
        mainRecipeSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            console.log("Searching:", query);
            renderRecipes(query); // Pass query to renderRecipes
        });
    }

    let isRegistering = false;

    // --- Auth Logic ---
    auth.onAuthStateChanged((user) => {
        console.log("DEBUG: Auth State Changed. User:", user);

        if (user) {
            console.log("DEBUG: User is logged in. UID:", user.uid);
            state.user = user;
            // Fetch User Data to get Group ID
            db.collection("users").doc(user.uid).get().then((userDoc) => {
                if (userDoc.exists) {
                    state.groupId = userDoc.data().groupId;
                    console.log("Joined Group:", state.groupId);
                    if (authDialog) authDialog.close();
                    initRealtimeListeners();
                } else {
                    // RECOVERY: User exists in Auth but not in Firestore
                    console.warn("User document missing. Attempting auto-recovery...");
                    const recoveryGroupId = user.uid;

                    db.collection("users").doc(user.uid).set({
                        email: user.email,
                        groupId: recoveryGroupId
                    }).then(() => {
                        return db.collection("groups").doc(recoveryGroupId).set({
                            createdAt: new Date(),
                            members: [user.uid],
                            plan: {}
                        });
                    }).then(() => {
                        console.log("Recovery successful. Created new group.");
                        state.groupId = recoveryGroupId;
                        if (authDialog) authDialog.close();
                        initRealtimeListeners();
                    }).catch(err => {
                        console.error("Recovery failed:", err);
                        alert("Error crítico: No se pudo recuperar el perfil de usuario. " + err.message);
                        auth.signOut();
                    });
                }
            }).catch(error => {
                console.error("Error fetching user doc:", error);
                alert("Error al obtener datos de usuario: " + error.message);
                auth.signOut();
            });
        } else {
            console.log("DEBUG: No user logged in. Opening Auth Dialog.");
            state.user = null;
            state.groupId = null;
            state.recipes = [];
            state.plan = {};
            renderRecipes(); // Clear UI

            recipeFormView.classList.remove('active');
            recipeDetailsView.classList.remove('active');
            recipeForm.reset();

            console.log("DEBUG: Calling authDialog.showModal()");
            if (authDialog) authDialog.showModal();
        }
    });

    if (toggleAuthModeBtn) {
        toggleAuthModeBtn.addEventListener('click', () => {
            isRegistering = !isRegistering;
            if (isRegistering) {
                authTitle.textContent = 'Crear Cuenta';
                authSubtitle.textContent = 'Únete a tu pareja o crea un grupo nuevo.';
                authSubmitBtn.textContent = 'Registrarse';
                toggleAuthModeBtn.textContent = '¿Ya tienes cuenta? Inicia Sesión';
                groupCodeContainer.style.display = 'block';
                authGroupCodeInput.required = true;
            } else {
                authTitle.textContent = 'Bienvenido';
                authSubtitle.textContent = 'Inicia sesión para sincronizar tus recetas.';
                authSubmitBtn.textContent = 'Iniciar Sesión';
                toggleAuthModeBtn.textContent = '¿No tienes cuenta? Regístrate';
                groupCodeContainer.style.display = 'none';
                authGroupCodeInput.required = false;
            }
        });
    }

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        const groupCode = authGroupCodeInput.value.toUpperCase().trim();

        if (isRegistering) {
            // --- BLIND JOIN STRATEGY (Auth First -> Try Join -> Rollback if fail) ---

            // 1. Create Auth User
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    const groupRef = db.collection("groups").doc(groupCode);

                    // 2. Try to JOIN the group (Blind Update)
                    // This works with strict rules because we are adding OURSELVES to members
                    return groupRef.update({
                        members: firebase.firestore.FieldValue.arrayUnion(user.uid)
                    }).then(() => {
                        // 3. Success! Group exists and we joined. Now create profile.
                        return db.collection("users").doc(user.uid).set({
                            email: email,
                            groupId: groupCode
                        });
                    }).catch((error) => {
                        // 4. Failure (Group doesn't exist OR permission denied)
                        console.error("Join Group Failed:", error);
                        // Rollback: Delete the auth user we just created
                        user.delete().then(() => {
                            if (error.code === 'not-found') {
                                alert("El código de grupo NO existe. Pídelo a tu administrador.");
                            } else {
                                alert("No se pudo unir al grupo: " + error.message);
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error("Registration Error:", error);
                    if (error.code === 'auth/email-already-in-use') {
                        alert("Este email ya está registrado. Inicia sesión.");
                    } else {
                        alert("Error de registro: " + error.message);
                    }
                });

        } else {
            // Login
            auth.signInWithEmailAndPassword(email, password)
                .catch((error) => {
                    console.error("Auth Error:", error);
                    alert("Error de autenticación: " + error.message);
                });
        }
    });

    // --- Realtime Data Sync ---
    let unsubscribeRecipes = null;
    let unsubscribePlan = null;

    function initRealtimeListeners() {
        console.log("DEBUG: [app.js] initRealtimeListeners called. GroupID:", state.groupId);
        if (!state.groupId) {
            console.warn("DEBUG: [app.js] No GroupID, skipping listeners.");
            return;
        }

        // 1. Listen to Plan (Document)
        unsubscribePlan = db.collection("groups").doc(state.groupId).onSnapshot((doc) => {
            console.log("DEBUG: [app.js] Plan snapshot received. Exists:", doc.exists);
            if (doc.exists) {
                const data = doc.data();
                state.plan = data.plan || {};
                if (document.getElementById('planner-view').classList.contains('active')) renderPlanner();
                if (document.getElementById('shopping-view').classList.contains('active')) renderShoppingList();
            }
        }, error => {
            console.error("Error listening to plan:", error);
        });

        // 2. Listen to Recipes (Subcollection)
        unsubscribeRecipes = db.collection("groups").doc(state.groupId).collection("recipes")
            .onSnapshot((snapshot) => {
                state.recipes = [];
                snapshot.forEach((doc) => {
                    state.recipes.push({ id: doc.id, ...doc.data() });
                });
                renderRecipes();
                // Also refresh planner/shopping list as they depend on recipe details
                if (document.getElementById('planner-view').classList.contains('active')) renderPlanner();
                if (document.getElementById('shopping-view').classList.contains('active')) renderShoppingList();
            }, error => {
                console.error("Error listening to recipes:", error);
            });

        // 3. Load Known Ingredients
        db.collection("groups").doc(state.groupId).collection("metadata").doc("ingredients").get()
            .then(doc => {
                if (doc.exists) {
                    const list = doc.data().list || [];
                    const datalist = document.getElementById('known-ingredients');
                    if (datalist) {
                        datalist.innerHTML = list.map(item => `<option value="${item}">`).join('');
                    }
                }
            });
    }

    function updateKnownIngredients(newIngredients) {
        if (!state.groupId || newIngredients.length === 0) return;

        const metadataRef = db.collection("groups").doc(state.groupId).collection("metadata").doc("ingredients");

        // Use arrayUnion to add only new unique items
        metadataRef.set({
            list: firebase.firestore.FieldValue.arrayUnion(...newIngredients)
        }, { merge: true }).catch(err => console.error("Error updating ingredients metadata:", err));

        // Update local datalist immediately for better UX
        const datalist = document.getElementById('known-ingredients');
        if (datalist) {
            newIngredients.forEach(ing => {
                if (!Array.from(datalist.options).some(opt => opt.value === ing)) {
                    const option = document.createElement('option');
                    option.value = ing;
                    datalist.appendChild(option);
                }
            });
        }
    }

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

    function getInitials(name) {
        return name.substring(0, 2).toUpperCase();
    }

    function getRandomColor(name) {
        const colors = ['#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9', '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB', '#C8E6C9', '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3', '#FFE0B2', '#FFCCBC'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    // Render Recipes
    function renderRecipes(filterCategory = 'Todas') {
        console.log("DEBUG: [app.js] renderRecipes called. Category:", filterCategory);

        if (!recipeListContainer) {
            console.error("CRITICAL ERROR: [app.js] recipeListContainer not found in DOM!");
            return;
        }

        recipeListContainer.innerHTML = '';

        if (state.recipes.length === 0) {
            console.log("DEBUG: [app.js] No recipes to render. Showing empty state.");
            emptyState.style.display = 'flex';
            return;
        }

        // Filter Recipes
        let recipesToRender = state.recipes;
        // Check if filter is a category (Capitalized) or search query (lowercase)
        const knownCategories = ['Todas', 'Desayuno', 'Almuerzo', 'Cena', 'Snack', 'Postre'];

        if (knownCategories.includes(filterCategory)) {
            if (filterCategory !== 'Todas') {
                recipesToRender = state.recipes.filter(r => r.tags && r.tags.includes(filterCategory));
            }
        } else {
            // Assume it's a search query
            const query = filterCategory.toLowerCase();
            recipesToRender = state.recipes.filter(r =>
                r.title.toLowerCase().includes(query) ||
                (r.ingredients && r.ingredients.some(i => i.name.toLowerCase().includes(query)))
            );
        }

        if (recipesToRender.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
        }

        recipesToRender.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card';

            // Image or Placeholder
            let imageHtml = '';
            if (recipe.image) {
                imageHtml = `
                    <div class="recipe-image-container">
                        <img src="${recipe.image}" alt="${recipe.title}">
                    </div>
                `;
            } else {
                const color = getRandomColor(recipe.title);
                imageHtml = `
                    <div class="recipe-image-container" style="background-color: ${color}20;">
                        <div class="recipe-placeholder" style="color: ${color};">
                            ${getInitials(recipe.title)}
                        </div>
                    </div>
                `;
            }

            card.innerHTML = `
                ${imageHtml}
                <div class="recipe-info">
                    <h3 class="recipe-title">${recipe.title}</h3>
                    <div class="recipe-meta-row">
                        <div class="meta-item">
                            <span class="material-icons">schedule</span>
                            <span>${recipe.prepTime || '15 min'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="material-icons">restaurant</span>
                            <span>${recipe.servings || '2'}</span>
                        </div>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => openRecipeDetails(recipe));
            recipeListContainer.appendChild(card);
        });
    }

    // Recipe Details & Deletion
    const deleteRecipeBtn = document.getElementById('delete-recipe-btn');
    const editRecipeBtn = document.getElementById('edit-recipe-btn');
    let currentRecipeId = null;

    function openRecipeDetails(recipe) {
        currentRecipeId = recipe.id;


        const hero = document.getElementById('detail-hero');
        if (recipe.image) {
            hero.style.backgroundImage = `url('${recipe.image}')`;
            hero.innerHTML = `
                <button type="button" class="close-btn-floating" id="close-detail-view-btn">
                    <span class="material-icons">arrow_back</span>
                </button>
                <div class="hero-overlay">
                    <h2 id="detail-title">${recipe.title}</h2>
                </div>
            `;
        } else {
            const color = getRandomColor(recipe.title);
            hero.style.backgroundImage = 'none';
            hero.style.backgroundColor = color;
            hero.innerHTML = `
                <button type="button" class="close-btn-floating" id="close-detail-view-btn" style="background-color:rgba(0,0,0,0.1); color:#333;">
                    <span class="material-icons">arrow_back</span>
                </button>
                <div class="hero-overlay" style="background: linear-gradient(to top, rgba(0,0,0,0.1), transparent); color: #333;">
                    <h2 id="detail-title" style="text-shadow:none;">${recipe.title}</h2>
                </div>
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size: 80px; opacity: 0.2; font-weight:bold; color:#000;">
                    ${getInitials(recipe.title)}
                </div>
            `;
        }

        // Re-bind close button (Back behavior)
        document.getElementById('close-detail-view-btn').onclick = () => {
            recipeDetailsView.classList.remove('active');
        };

        const ingredientsUl = document.getElementById('detail-ingredients');
        ingredientsUl.innerHTML = recipe.ingredients.map(ing => {
            if (typeof ing === 'string') {
                return `<li>${ing}</li>`;
            } else {
                return `<li><strong>${ing.quantity} ${ing.unit}</strong> ${ing.name}</li>`;
            }
        }).join('');

        document.getElementById('detail-instructions').textContent = recipe.instructions;

        recipeDetailsView.classList.add('active');
    }

    deleteRecipeBtn.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres eliminar esta receta?')) {
            // Firestore Delete
            db.collection("groups").doc(state.groupId).collection("recipes").doc(currentRecipeId).delete()
                .then(() => {
                    recipeDetailsView.classList.remove('active');
                })
                .catch(error => {
                    console.error("Error deleting recipe:", error);
                    alert("Error al eliminar la receta: " + error.message);
                });
        }
    });

    // Edit Recipe Logic
    editRecipeBtn.addEventListener('click', () => {
        const recipe = state.recipes.find(r => r.id === currentRecipeId);
        if (recipe) {
            recipeDetailsView.classList.remove('active');
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
            document.getElementById('recipe-image').value = recipeToEdit.image || '';
            document.getElementById('recipe-instructions').value = recipeToEdit.instructions;
            recipeToEdit.ingredients.forEach(ing => addIngredientInput(ing));
        } else {
            document.getElementById('dialog-title').textContent = 'Nueva Receta';
            addIngredientInput(); // Add one empty input
        }

        recipeFormView.classList.add('active');
    }

    // fabAddRecipe.addEventListener('click', () => openRecipeDialog()); // MOVED UP

    closeFormViewBtn.addEventListener('click', () => recipeFormView.classList.remove('active'));
    cancelRecipeBtn.addEventListener('click', () => recipeFormView.classList.remove('active'));

    // Dynamic Ingredients
    function addIngredientInput(value = null) {
        const div = document.createElement('div');
        div.className = 'ingredient-row';

        let qty = '', unit = 'unidad', name = '';
        if (typeof value === 'string') {
            name = value;
        } else if (value) {
            qty = value.quantity || '';
            unit = value.unit || 'unidad';
            name = value.name || '';
        }

        div.innerHTML = `
            <input type="number" step="any" name="ing-qty" class="ing-qty" placeholder="0" value="${qty}">
            <select name="ing-unit" class="ing-unit">
                <option value="unidad" ${unit === 'unidad' ? 'selected' : ''}>unidad</option>
                <option value="g" ${unit === 'g' ? 'selected' : ''}>g</option>
                <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
                <option value="ml" ${unit === 'ml' ? 'selected' : ''}>ml</option>
                <option value="l" ${unit === 'l' ? 'selected' : ''}>l</option>
                <option value="cda" ${unit === 'cda' ? 'selected' : ''}>cda</option>
                <option value="cdta" ${unit === 'cdta' ? 'selected' : ''}>cdta</option>
                <option value="taza" ${unit === 'taza' ? 'selected' : ''}>taza</option>
            </select>
            <input type="text" name="ing-name" class="ing-name" list="known-ingredients" placeholder="Ingrediente" value="${name}" required>
            <button type="button" class="ing-remove-btn" onclick="this.parentElement.remove()">
                <span class="material-icons">close</span>
            </button>
        `;
        ingredientsList.appendChild(div);
    }

    // Make addIngredientInput globally available for the onclick handler in HTML string
    window.addIngredientInput = addIngredientInput;

    addIngredientBtn.addEventListener('click', () => addIngredientInput());

    // Save Recipe (Create or Update)
    recipeForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('recipe-title').value;
        const image = document.getElementById('recipe-image').value;
        const instructions = document.getElementById('recipe-instructions').value;

        const rows = document.querySelectorAll('.ingredient-row');
        const ingredients = Array.from(rows).map(row => {
            const qty = row.querySelector('.ing-qty').value;
            const unit = row.querySelector('.ing-unit').value;
            const name = row.querySelector('.ing-name').value;

            if (!name.trim()) return null;

            return {
                name: name.trim(),
                quantity: qty ? parseFloat(qty) : 0,
                unit: unit
            };
        }).filter(i => i !== null);

        const recipeData = {
            title,
            image,
            ingredients,
            instructions,
            updatedAt: new Date()
        };

        // Update Known Ingredients
        updateKnownIngredients(ingredients.map(i => i.name));

        if (editingRecipeId) {
            // Update Firestore
            recipeData.updatedBy = state.user.uid;

            db.collection("groups").doc(state.groupId).collection("recipes").doc(editingRecipeId).update(recipeData)
                .then(() => recipeFormView.classList.remove('active'))
                .catch(error => {
                    console.error("Error updating recipe:", error);
                    alert("Error al actualizar la receta: " + error.message);
                });
        } else {
            // Create Firestore
            recipeData.createdBy = state.user.uid;
            recipeData.createdAt = new Date();

            db.collection("groups").doc(state.groupId).collection("recipes").add(recipeData)
                .then(() => recipeFormView.classList.remove('active'))
                .catch(error => {
                    console.error("Error adding recipe:", error);
                    alert("Error al añadir la receta: " + error.message);
                });
        }
    });


    // --- Shared Week Navigation ---
    function renderWeekControls(container, callback) {
        const weekDays = getWeekDays(state.currentWeekOffset);
        const start = weekDays[0];
        const end = weekDays[6];
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const weekLabel = `${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]}`;

        let navHeader = container.querySelector('.planner-header');
        if (!navHeader) {
            navHeader = document.createElement('div');
            navHeader.className = 'planner-header';
            container.insertBefore(navHeader, container.firstChild);
        }

        navHeader.innerHTML = `
            <button class="week-nav-btn prev-week">
                <span class="material-icons">chevron_left</span>
            </button>
            <h2>${weekLabel}</h2>
            <button class="week-nav-btn next-week">
                <span class="material-icons">chevron_right</span>
            </button>
        `;

        navHeader.querySelector('.prev-week').onclick = () => {
            state.currentWeekOffset--;
            callback();
        };
        navHeader.querySelector('.next-week').onclick = () => {
            state.currentWeekOffset++;
            callback();
        };
    }


    // --- Weekly Planner Logic V2 ---
    // Selectors moved inside renderPlanner for robustness
    const selectRecipeDialog = document.getElementById('select-recipe-dialog');
    const closeSelectDialogBtn = document.getElementById('close-select-dialog');
    const selectRecipeList = document.getElementById('select-recipe-list');
    const recipeSearchInput = document.getElementById('recipe-search');

    let targetDate = null;
    let targetSlot = null; // 'lunch' or 'dinner'

    function renderPlanner() {
        console.log("DEBUG: [app.js] renderPlanner called. Week Offset:", state.currentWeekOffset);

        const plannerContainer = document.querySelector('.planner-container');
        const weekGrid = document.querySelector('.week-grid');

        if (!plannerContainer || !weekGrid) {
            console.error("CRITICAL ERROR: [app.js] Planner container or grid not found!");
            return;
        }

        renderWeekControls(plannerContainer, renderPlanner);

        weekGrid.innerHTML = '';
        const weekDays = getWeekDays(state.currentWeekOffset);
        const todayStr = formatDate(new Date());
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        weekDays.forEach(dateObj => {
            const dateKey = formatDate(dateObj);
            const isToday = dateKey === todayStr;
            const dayPlan = state.plan[dateKey] || {};

            const dayCard = document.createElement('div');
            dayCard.className = `day-card ${isToday ? 'today' : ''}`;

            // Helper to render a slot (lunch/dinner)
            const renderMealSection = (slotName, label) => {
                let items = dayPlan[slotName];
                if (!items) items = [];
                if (typeof items === 'string') items = [items]; // Legacy support

                // Resolve recipes
                const recipesInSlot = items.map(id => state.recipes.find(r => r.id === id)).filter(r => r);

                let html = `<div class="meal-section">`;

                // --- PLATO 1 ---
                const recipe1 = recipesInSlot[0];
                html += `<div class="slot">
                    <span class="slot-label">${label} - PLATO 1</span>`;

                if (recipe1) {
                    html += `
                        <div class="slot-content filled">
                            <span class="planned-recipe-chip">
                                ${recipe1.title}
                                <button class="remove-plan-btn" onclick="event.stopPropagation(); removeRecipeFromPlan('${dateKey}', '${slotName}', 0)">✕</button>
                            </span>
                        </div>`;
                } else {
                    html += `
                        <div class="slot-content" onclick="openSelectRecipe('${dateKey}', '${slotName}')">
                            <span class="material-icons" style="font-size: 20px; color: var(--md-sys-color-primary);">add</span>
                        </div>`;
                }
                html += `</div>`;

                // --- PLATO 2 (Only if Plato 1 is filled) ---
                if (recipe1) {
                    const recipe2 = recipesInSlot[1];
                    html += `<div class="slot" style="margin-top: 8px;">
                        <span class="slot-label">${label} - PLATO 2</span>`;

                    if (recipe2) {
                        html += `
                            <div class="slot-content filled">
                                <span class="planned-recipe-chip">
                                    ${recipe2.title}
                                    <button class="remove-plan-btn" onclick="event.stopPropagation(); removeRecipeFromPlan('${dateKey}', '${slotName}', 1)">✕</button>
                                </span>
                            </div>`;
                    } else {
                        html += `
                            <div class="slot-content" onclick="openSelectRecipe('${dateKey}', '${slotName}')">
                                <span class="material-icons" style="font-size: 20px; color: var(--md-sys-color-primary);">add</span>
                            </div>`;
                    }
                    html += `</div>`;
                }

                html += `</div>`;
                return html;
            };

            dayCard.innerHTML = `
                <div class="day-header">
                    <h3>${dayNames[dateObj.getDay()]} <span class="date-label">${dateObj.getDate()}</span></h3>
                </div>
                <div class="day-slots">
                    ${renderMealSection('lunch', 'COMIDA')}
                    <div style="height: 16px;"></div>
                    ${renderMealSection('dinner', 'CENA')}
                </div>
            `;
            weekGrid.appendChild(dayCard);
        });
    }

    // Global handlers for inline clicks
    window.openSelectRecipe = (date, slot) => {
        targetDate = date;
        targetSlot = slot;
        recipeSearchInput.value = ''; // Reset search
        renderSelectRecipeList();
        selectRecipeDialog.showModal();
    };

    window.removeRecipeFromPlan = (date, slot, index) => {
        // Firestore Update: remove item at index
        // Since Firestore arrayRemove only removes by value, and we might have duplicates, 
        // we need to read, modify, write. But for simplicity in this app, we can just read the current plan from state (which is synced)
        // and write it back.

        let currentItems = state.plan[date] ? state.plan[date][slot] : [];
        if (!currentItems) return;
        if (typeof currentItems === 'string') currentItems = [currentItems];

        const newItems = [...currentItems];
        newItems.splice(index, 1);

        const updateData = {};
        updateData[`plan.${date}.${slot}`] = newItems;

        db.collection("groups").doc(state.groupId).update(updateData)
            .then(() => renderPlanner())
            .catch(error => {
                console.error("Error removing recipe from plan:", error);
                alert("Error al eliminar receta del plan: " + error.message);
            });
    };

    function renderSelectRecipeList(filter = '') {
        selectRecipeList.innerHTML = '';

        const filteredRecipes = state.recipes.filter(r =>
            r.title.toLowerCase().includes(filter.toLowerCase())
        );

        if (filteredRecipes.length === 0) {
            selectRecipeList.innerHTML = '<p style="text-align:center; color:var(--md-sys-color-outline);">No se encontraron recetas.</p>';
            return;
        }

        filteredRecipes.forEach(recipe => {
            const item = document.createElement('div');
            item.className = 'select-recipe-item';

            // Reuse avatar logic
            let imageHtml = '';
            if (recipe.image) {
                imageHtml = `<img src="${recipe.image}" alt="${recipe.title}" class="recipe-avatar" style="width:32px; height:32px; font-size:12px;">`;
            } else {
                const color = getRandomColor(recipe.title);
                imageHtml = `<div class="recipe-avatar" style="background-color: ${color}; color: #333; width:32px; height:32px; font-size:12px;">${getInitials(recipe.title)}</div>`;
            }

            item.innerHTML = `
                ${imageHtml}
                <span>${recipe.title}</span>
            `;

            item.addEventListener('click', () => {
                // Firestore Update: Array Union
                const updateData = {};
                // We use arrayUnion to add. Note: arrayUnion adds unique only. 
                // If user wants same recipe twice, arrayUnion won't work.
                // But for now, let's assume unique recipes per slot is fine, or we use the read-modify-write pattern if we really need duplicates.
                // Let's use arrayUnion for simplicity and robustness.
                updateData[`plan.${targetDate}.${targetSlot}`] = firebase.firestore.FieldValue.arrayUnion(recipe.id);

                db.collection("groups").doc(state.groupId).update(updateData)
                    .then(() => {
                        selectRecipeDialog.close();
                    })
                    .catch(error => {
                        console.error("Error adding recipe to plan:", error);
                        alert("Error al añadir receta al plan: " + error.message);
                    });
            });
            selectRecipeList.appendChild(item);
        });
    }

    recipeSearchInput.addEventListener('input', (e) => {
        renderSelectRecipeList(e.target.value);
    });

    // --- Shopping List Logic ---
    function renderShoppingList() {
        console.log("DEBUG: [app.js] renderShoppingList called.");
        // Re-query to ensure element exists
        const shoppingList = document.getElementById('shopping-list-content');
        if (!shoppingList) {
            console.error("CRITICAL ERROR: [app.js] shoppingList container not found!");
            return;
        }

        const aggregatedIngredients = {}; // Key: "name|unit", Value: quantity
        const weekDays = getWeekDays(state.currentWeekOffset);

        // Aggregate ingredients for the CURRENTLY VIEWED week
        weekDays.forEach(dateObj => {
            const dateKey = formatDate(dateObj);
            const dayPlan = state.plan[dateKey];
            if (dayPlan) {
                ['lunch', 'dinner'].forEach(slot => {
                    let items = dayPlan[slot];
                    if (items) {
                        if (typeof items === 'string') items = [items];
                        items.forEach(recipeId => {
                            const r = state.recipes.find(recipe => recipe.id === recipeId);
                            if (r) {
                                r.ingredients.forEach(ing => {
                                    if (typeof ing === 'string') {
                                        // Legacy: treat as unit=unidad, qty=1, but mark as legacy to not mix weirdly?
                                        // Actually, let's just use the string as key
                                        const key = `LEGACY|${ing}`;
                                        aggregatedIngredients[key] = (aggregatedIngredients[key] || 0) + 1;
                                    } else {
                                        const key = `${ing.unit}|${ing.name}`;
                                        aggregatedIngredients[key] = (aggregatedIngredients[key] || 0) + ing.quantity;
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });

        const keys = Object.keys(aggregatedIngredients).sort();

        if (keys.length === 0) {
            shoppingList.innerHTML = '<p style="text-align:center; color: var(--md-sys-color-outline); margin-top: 24px;">No hay ingredientes para esta semana.</p>';
            return;
        }

        keys.forEach((key, index) => {
            const [unit, name] = key.split('|');
            let displayText = '';

            if (unit === 'LEGACY') {
                // For legacy strings, we just show the name. If count > 1, maybe show count?
                // "Tomate (x2)"
                const count = aggregatedIngredients[key];
                displayText = count > 1 ? `${name} (x${count})` : name;
            } else {
                const qty = aggregatedIngredients[key];
                // Format qty nicely (e.g. no decimals if integer)
                const formattedQty = Number.isInteger(qty) ? qty : qty.toFixed(1);
                displayText = `<strong>${formattedQty} ${unit}</strong> ${name}`;
            }

            const item = document.createElement('div');
            item.className = 'shopping-item';
            item.innerHTML = `
                <input type="checkbox" id="shop-item-${index}">
                <span>${displayText}</span>
            `;

            const checkbox = item.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    item.classList.add('checked');
                } else {
                    item.classList.remove('checked');
                }
            });

            shoppingList.appendChild(item);
        });
    }
});
