// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBv-E1Z6Chy3jX_OHdOxY1XLk75Rjt6muU",
    authDomain: "recetario-6f700.firebaseapp.com",
    projectId: "recetario-6f700",
    storageBucket: "recetario-6f700.firebasestorage.app",
    messagingSenderId: "1074447371366",
    appId: "1:1074447371366:web:e0689be620d903fe1671a7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {

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

    // Auth Elements
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

    // Logout Logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("¿Cerrar sesión?")) {
                auth.signOut().then(() => {
                    console.log("User signed out");
                    // Optional: Clear local state if needed, but onAuthStateChanged handles UI
                });
            }
        });
    }

    let isRegistering = false;

    // --- Auth Logic ---
    auth.onAuthStateChanged((user) => {

        if (user) {
            state.user = user;
            // Fetch User Data to get Group ID
            db.collection("users").doc(user.uid).get().then((userDoc) => {
                if (userDoc.exists) {
                    state.groupId = userDoc.data().groupId;
                    console.log("Joined Group:", state.groupId);
                    authDialog.close();
                    initRealtimeListeners();
                } else {
                    // RECOVERY: User exists in Auth but not in Firestore (e.g. failed registration)
                    console.warn("User document missing. Attempting auto-recovery...");

                    // Default to own UID as group ID if we don't know the intended one
                    const recoveryGroupId = user.uid;

                    db.collection("users").doc(user.uid).set({
                        email: user.email,
                        groupId: recoveryGroupId
                    }).then(() => {
                        // Create the group as well
                        return db.collection("groups").doc(recoveryGroupId).set({
                            createdAt: new Date(),
                            members: [user.uid],
                            plan: {}
                        });
                    }).then(() => {
                        console.log("Recovery successful. Created new group.");
                        state.groupId = recoveryGroupId;
                        authDialog.close();
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
            state.user = null;
            state.groupId = null;
            state.recipes = [];
            state.plan = {};
            renderRecipes(); // Clear UI

            authDialog.showModal();
        }
    });

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
        if (!state.groupId) return;

        // 1. Listen to Plan (Document)
        unsubscribePlan = db.collection("groups").doc(state.groupId).onSnapshot((doc) => {
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

    // --- Recipe Management ---

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

            // Image or Initials
            let imageHtml = '';
            if (recipe.image) {
                imageHtml = `<img src="${recipe.image}" alt="${recipe.title}" class="recipe-avatar">`;
            } else {
                const color = getRandomColor(recipe.title);
                imageHtml = `<div class="recipe-avatar" style="background-color: ${color}; color: #333;">${getInitials(recipe.title)}</div>`;
            }

            card.innerHTML = `
                <div class="recipe-info">
                    ${imageHtml}
                    <h3>${recipe.title}</h3>
                </div>
                <span class="material-icons">chevron_right</span>
            `;
            card.addEventListener('click', () => openRecipeDetails(recipe));
            recipeListContainer.appendChild(card);
        });
    }

    // Recipe Details & Deletion
    const recipeDetailsDialog = document.getElementById('recipe-details-dialog');
    const deleteRecipeBtn = document.getElementById('delete-recipe-btn');
    const editRecipeBtn = document.getElementById('edit-recipe-btn');
    let currentRecipeId = null;

    function openRecipeDetails(recipe) {
        currentRecipeId = recipe.id;
        document.getElementById('detail-title').textContent = recipe.title;

        const hero = document.getElementById('detail-hero');
        if (recipe.image) {
            hero.style.backgroundImage = `url('${recipe.image}')`;
            hero.innerHTML = `
                <button type="button" class="close-btn-floating" id="close-detail-dialog-btn">
                    <span class="material-icons">close</span>
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
                <button type="button" class="close-btn-floating" id="close-detail-dialog-btn" style="background-color:rgba(0,0,0,0.1); color:#333;">
                    <span class="material-icons">close</span>
                </button>
                <div class="hero-overlay" style="background: linear-gradient(to top, rgba(0,0,0,0.1), transparent); color: #333;">
                    <h2 id="detail-title" style="text-shadow:none;">${recipe.title}</h2>
                </div>
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size: 80px; opacity: 0.2; font-weight:bold; color:#000;">
                    ${getInitials(recipe.title)}
                </div>
            `;
        }

        // Re-bind close button since we overwrote HTML
        document.getElementById('close-detail-dialog-btn').onclick = () => recipeDetailsDialog.close();

        const ingredientsUl = document.getElementById('detail-ingredients');
        ingredientsUl.innerHTML = recipe.ingredients.map(ing => `<li>${ing}</li>`).join('');

        document.getElementById('detail-instructions').textContent = recipe.instructions;

        recipeDetailsDialog.showModal();
    }

    deleteRecipeBtn.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres eliminar esta receta?')) {
            // Firestore Delete
            db.collection("groups").doc(state.groupId).collection("recipes").doc(currentRecipeId).delete()
                .then(() => {
                    recipeDetailsDialog.close();
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
            document.getElementById('recipe-image').value = recipeToEdit.image || '';
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

    // Make addIngredientInput globally available for the onclick handler in HTML string
    window.addIngredientInput = addIngredientInput;

    addIngredientBtn.addEventListener('click', () => addIngredientInput());

    // Save Recipe (Create or Update)
    recipeForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('recipe-title').value;
        const image = document.getElementById('recipe-image').value;
        const instructions = document.getElementById('recipe-instructions').value;
        const ingredientInputs = document.querySelectorAll('input[name="ingredient"]');
        const ingredients = Array.from(ingredientInputs).map(input => input.value).filter(val => val.trim() !== '');

        const recipeData = {
            title,
            image,
            ingredients,
            instructions
        };

        if (editingRecipeId) {
            // Update Firestore
            db.collection("groups").doc(state.groupId).collection("recipes").doc(editingRecipeId).update(recipeData)
                .then(() => recipeDialog.close())
                .catch(error => {
                    console.error("Error updating recipe:", error);
                    alert("Error al actualizar la receta: " + error.message);
                });
        } else {
            // Create Firestore
            db.collection("groups").doc(state.groupId).collection("recipes").add(recipeData)
                .then(() => recipeDialog.close())
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
            <button class="week-nav-btn prev-week">←</button>
            <h2>${weekLabel}</h2>
            <button class="week-nav-btn next-week">→</button>
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
    const plannerContainer = document.querySelector('.planner-container');
    const weekGrid = document.querySelector('.week-grid');
    const selectRecipeDialog = document.getElementById('select-recipe-dialog');
    const closeSelectDialogBtn = document.getElementById('close-select-dialog');
    const selectRecipeList = document.getElementById('select-recipe-list');
    const recipeSearchInput = document.getElementById('recipe-search');

    let targetDate = null;
    let targetSlot = null; // 'lunch' or 'dinner'

    function renderPlanner() {
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

    window.removeRecipeFromPlan = (date, slot) => {
        // Firestore Update: delete state.plan[date][slot]
        const updateData = {};
        updateData[`plan.${date}.${slot}`] = firebase.firestore.FieldValue.delete();

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
                // Firestore Update
                const updateData = {};
                updateData[`plan.${targetDate}.${targetSlot}`] = recipe.id;
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

    closeSelectDialogBtn.addEventListener('click', () => selectRecipeDialog.close());


    // --- Shopping List Logic ---
    const shoppingListContainer = document.querySelector('.shopping-list-container');
    const shoppingList = document.querySelector('.shopping-list');

    function renderShoppingList() {
        renderWeekControls(shoppingListContainer, renderShoppingList);

        shoppingList.innerHTML = '';
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
            shoppingList.innerHTML = '<p style="text-align:center; color: var(--md-sys-color-outline); margin-top: 24px;">No hay ingredientes para esta semana.</p>';
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

            shoppingList.appendChild(item);
        });
    }
});
