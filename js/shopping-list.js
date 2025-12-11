// Shopping List Logic

let currentShoppingWeekStart = new Date();
let shoppingListState = {}; // Stores checked status: { "Tomate": { quantity: 2, unit: "kg", checked: true } }
let shoppingListListenerUnsubscribe = null;

function initShoppingList() {
    console.log('Initializing Shopping List...');

    // Set initial week to current week (Monday)
    currentShoppingWeekStart = getMonday(new Date());

    // Attach listeners
    // Attach listeners
    const prevBtn = document.getElementById('shop-prev-week');
    if (prevBtn) prevBtn.addEventListener('click', () => changeShoppingWeek(-1));

    const nextBtn = document.getElementById('shop-next-week');
    if (nextBtn) nextBtn.addEventListener('click', () => changeShoppingWeek(1));

    // Initial Load
    loadShoppingListForWeek();
}

function changeShoppingWeek(offset) {
    currentShoppingWeekStart.setDate(currentShoppingWeekStart.getDate() + (offset * 7));
    loadShoppingListForWeek();
}

function loadShoppingListForWeek() {
    if (shoppingListListenerUnsubscribe) {
        shoppingListListenerUnsubscribe();
    }

    const weekId = getWeekId(currentShoppingWeekStart);

    // Listen to Firestore
    if (state.groupId) {
        shoppingListListenerUnsubscribe = db.collection("groups").doc(state.groupId)
            .collection("shopping_lists").doc(weekId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    console.log("Shopping List Update:", doc.data());
                    shoppingListState = doc.data().items || {};
                } else {
                    console.log("Shopping List Empty/New");
                    shoppingListState = {};
                }
                renderShoppingList();
            }, error => {
                console.error("Error listening to shopping list:", error);
            });
    } else {
        renderShoppingList();
    }
}
window.loadShoppingListForWeek = loadShoppingListForWeek;

function renderShoppingList() {
    // Update Label
    const endOfWeek = new Date(currentShoppingWeekStart);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const label = document.getElementById('shop-week-label');
    if (label) {
        const startStr = currentShoppingWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        const endStr = endOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        label.textContent = `${startStr} - ${endStr}`;
    }

    const container = document.getElementById('shopping-list-content');
    if (!container) return;

    if (!state.plan) {
        renderEmptyState(container);
        return;
    }

    const recipesToCook = [];
    // Clone start date to avoid modifying currentShoppingWeekStart
    const start = new Date(currentShoppingWeekStart);

    // Iterate 7 days
    for (let i = 0; i < 7; i++) {
        // Create new date object for each day
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        const dayPlan = state.plan[dateStr];
        if (dayPlan) {
            if (dayPlan.lunch_main) recipesToCook.push(dayPlan.lunch_main);
            if (dayPlan.lunch_side) recipesToCook.push(dayPlan.lunch_side);
            if (dayPlan.dinner_main) recipesToCook.push(dayPlan.dinner_main);
            if (dayPlan.dinner_side) recipesToCook.push(dayPlan.dinner_side);
            // Breakfast is not currently used in planner.js but keeping just in case
            if (dayPlan.breakfast) recipesToCook.push(dayPlan.breakfast);
        }
    }

    if (recipesToCook.length === 0 && Object.keys(shoppingListState).length === 0) {
        renderEmptyState(container);
        return;
    }

    // Resolve recipes from state
    const recipes = recipesToCook.map(id => state.recipes.find(r => r.id === id)).filter(r => r);

    // Aggregate Ingredients
    const aggregated = aggregateIngredients(recipes, shoppingListState);

    // Render List
    renderAggregatedList(container, aggregated);
}

// Helper to prevent Firestore path issues (dots creating nested objects)
function sanitizeIngredientKey(name) {
    return name.trim().toLowerCase()
        .replace(/\./g, '_dot_')  // Replace dots
        .replace(/\//g, '_slash_') // Replace slashes
        .replace(/[#$\.\[\]]/g, '_'); // Replace other forbidden chars
}

function aggregateIngredients(recipes, checkedItems) {
    const totalNeededMap = {};

    // 1. Calculate Total Needed from Plan
    recipes.forEach(recipe => {
        if (!recipe.ingredients) return;
        recipe.ingredients.forEach(ing => {
            if (!ing.name) return;
            // USE SANITIZED KEY
            const key = sanitizeIngredientKey(ing.name);

            if (!totalNeededMap[key]) {
                totalNeededMap[key] = {
                    name: ing.name.trim(), // Keep original display name
                    quantity: 0,
                    unit: ing.unit || ''
                };
            }

            const qty = parseFloat(ing.quantity);
            if (!isNaN(qty)) {
                totalNeededMap[key].quantity += qty;
            }
        });
    });

    const finalItems = [];
    const normalizedCheckedMap = {};

    // 2. Process Checked Items (Merge duplicates)
    Object.keys(checkedItems).forEach(originalKey => {
        const item = checkedItems[originalKey];
        if (!item || !item.name) return;

        // USE SANITIZED KEY
        const normalizedKey = sanitizeIngredientKey(item.name);

        if (!normalizedCheckedMap[normalizedKey]) {
            normalizedCheckedMap[normalizedKey] = {
                name: item.name,
                quantity: 0,
                unit: item.unit,
                checked: true,
                keys: []
            };
        }

        normalizedCheckedMap[normalizedKey].quantity += item.quantity;
        normalizedCheckedMap[normalizedKey].keys.push(originalKey);
    });

    // Add Merged Checked Items to Final List and Subtract from Total
    Object.keys(normalizedCheckedMap).forEach(key => {
        const checkedItem = normalizedCheckedMap[key];

        if (totalNeededMap[key]) {
            finalItems.push(checkedItem);
            totalNeededMap[key].quantity -= checkedItem.quantity;
        } else {
            console.log("Skipping orphan checked item:", checkedItem.name);
        }
    });

    // 3. Process Remaining Needed (Unchecked)
    Object.keys(totalNeededMap).forEach(key => {
        const item = totalNeededMap[key];
        if (item.quantity > 0.01) {
            finalItems.push({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                checked: false,
                key: key
            });
        }
    });

    return finalItems.sort((a, b) => {
        if (!a.name) return 1;
        if (!b.name) return -1;
        return a.name.localeCompare(b.name);
    });
}

function renderAggregatedList(container, items) {
    if (items.length === 0) {
        renderEmptyState(container);
        return;
    }

    // Dynamic Categories
    const sections = state.ingredientSections || {};
    const categorized = {};
    const defaultCategory = "Otros";

    // Initialize categories that we know exist or just let them be created dynamically
    // We can prioritize standard ones for order
    const standardOrder = [
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

    standardOrder.forEach(cat => categorized[cat] = []);

    items.forEach(item => {
        const lowerName = item.name.toLowerCase();
        let section = sections[lowerName];

        if (!section) {
            // Fallback to simple keyword matching if no explicit section set
            if (["tomate", "cebolla", "lechuga", "limon", "aguacate", "zanahoria", "pimiento", "ajo", "patata", "manzana", "platano"].some(k => lowerName.includes(k))) section = "Verduras y Frutas";
            else if (["pollo", "carne", "ternera", "cerdo", "huevo", "pescado", "atun", "salmon", "tofu"].some(k => lowerName.includes(k))) section = "Carnes y Proteínas";
            else if (["leche", "queso", "yogur", "mantequilla", "nata"].some(k => lowerName.includes(k))) section = "Lácteos";
            else section = defaultCategory;
        }

        if (!categorized[section]) {
            categorized[section] = [];
        }
        categorized[section].push(item);
    });

    let html = '';

    // Render in standard order first
    standardOrder.forEach(cat => {
        if (categorized[cat] && categorized[cat].length > 0) {
            const itemsHtml = categorized[cat].map(item => {
                // Find original index in the main list
                const idx = items.indexOf(item);
                return ShoppingListView.renderItem(item, idx);
            }).join('');
            html += ShoppingListView.renderCategory(cat, itemsHtml);
            delete categorized[cat]; // Remove so we don't render again
        }
    });

    // Render remaining custom categories
    for (const [cat, catItems] of Object.entries(categorized)) {
        if (catItems.length > 0) {
            const itemsHtml = catItems.map(item => {
                // Find original index in the main list
                const idx = items.indexOf(item);
                return ShoppingListView.renderItem(item, idx);
            }).join('');
            html += ShoppingListView.renderCategory(cat, itemsHtml);
        }
    }

    container.innerHTML = html;

    // Store current items for the toggle function to find details
    window.currentShoppingListItems = items;
}

function renderEmptyState(container) {
    container.innerHTML = `
        <div class="empty-state">
            <span class="material-icons empty-icon">shopping_cart</span>
            <p>Tu lista de la compra está vacía.<br>Planifica comidas para generarla.</p>
        </div>
    `;
}

function toggleIngredientCheck(index) {
    console.log("👉 Clicked item index:", index);

    // 1. Optimistic UI Update 
    let row = null;
    try {
        row = document.querySelector(`.shopping-item[data-index="${index}"]`);
        if (row) {
            row.classList.toggle('checked');
        }
    } catch (e) {
        console.error("Optimistic UI error:", e);
    }

    // 2. Data Logic
    const item = window.currentShoppingListItems && window.currentShoppingListItems[index];

    if (!item) {
        console.error("❌ CRITICAL: Item not found in memory at index:", index);
        if (row) row.classList.toggle('checked');
        return;
    }

    if (!state.groupId) {
        console.error("❌ CRITICAL: No groupId in state.");
        alert("Error: No estás conectado a un grupo.");
        if (row) row.classList.toggle('checked');
        return;
    }

    const weekId = getWeekId(currentShoppingWeekStart);
    const docRef = db.collection("groups").doc(state.groupId).collection("shopping_lists").doc(weekId);

    const wasChecked = item.checked;
    item.checked = !wasChecked;

    if (wasChecked) {
        // UNCHECKING
        console.log("🔄 Unchecking in DB:", item.name);
        if (item.keys && item.keys.length > 0) {
            const updateArgs = [];
            item.keys.forEach(k => {
                updateArgs.push(new firebase.firestore.FieldPath('items', k));
                updateArgs.push(firebase.firestore.FieldValue.delete());
            });
            docRef.update(...updateArgs).catch(err => {
                console.error("❌ Firebase Uncheck Error:", err);
                if (row) row.classList.add('checked');
                item.checked = true;
            });
        } else {
            // Use Sanitized Key for fallback
            const safeKey = item.key || sanitizeIngredientKey(item.name);
            docRef.update(new firebase.firestore.FieldPath('items', safeKey), firebase.firestore.FieldValue.delete())
                .catch(err => {
                    console.error("❌ Firebase Fallback Uncheck Error:", err);
                    if (row) row.classList.add('checked');
                    item.checked = true;
                });
        }
    } else {
        // CHECKING
        console.log("🔄 Checking in DB:", item.name);
        // USE SANITIZED KEY
        const normalizedKey = sanitizeIngredientKey(item.name);
        const newQty = item.quantity;

        const itemData = {
            name: item.name,
            quantity: newQty,
            unit: item.unit || '', // Ensure string
            checked: true
        };

        const updateData = {
            items: {
                [normalizedKey]: itemData
            }
        };

        docRef.set(updateData, { merge: true })
            .catch(err => {
                console.error("❌ Firebase Check Error:", err);
                if (row) row.classList.remove('checked');
                item.checked = false;
            });
    }
}

function getWeekId(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
}

function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
}
