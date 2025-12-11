// Add Recipe Feature Logic

function initAddRecipeLogic() {
    // FAB Logic
    const fabBtn = document.getElementById('fab-add-recipe');
    if (fabBtn) {
        fabBtn.addEventListener('click', () => {
            openRecipeForm();
        });
    }
}

function ensureRecipeFormExists() {
    // FORCE REFRESH if we detect stale DOM (old dialog ID) to ensure new template is loaded
    const existing = document.getElementById('recipe-form-view');
    if (existing) {
        if (existing.querySelector('#ingredient-details-dialog')) {
            console.log("DEBUG: Removing stale recipe form view to load new Overlay version.");
            existing.remove();
            // Clean up old dialogs if they were moved to body
            document.querySelectorAll('dialog#ingredient-details-dialog').forEach(d => d.remove());
        }
    }

    if (!document.getElementById('recipe-form-view')) {
        const container = document.createElement('div');
        if (window.AddRecipeView && window.AddRecipeView.template) {
            container.innerHTML = window.AddRecipeView.template;
            document.querySelector('.app-container').appendChild(container.firstElementChild);

            // Move dialogs AND new overlay to body to ensure top-level rendering
            const movedElements = document.querySelectorAll('#recipe-form-view dialog, #recipe-form-view .bottom-sheet-overlay');
            movedElements.forEach(el => {
                document.body.appendChild(el);
            });

            // Re-attach listeners since elements are new
            attachFormListeners();
        } else {
            console.error('CRITICAL: AddRecipeView not found.');
        }
    }
}

function attachFormListeners() {
    document.getElementById('close-form-view').addEventListener('click', closeRecipeForm);
    document.getElementById('cancel-recipe').addEventListener('click', closeRecipeForm);

    document.getElementById('add-step-btn').addEventListener('click', () => addStepInput());

    // Inline Ingredient Logic
    document.getElementById('btn-add-inline-ingredient').addEventListener('click', () => {
        console.log("DEBUG: Add ingredient button clicked");
        const input = document.getElementById('inline-ingredient-input');
        const value = input.value.trim();
        // Allow opening even if empty, defaulting to "Ingrediente"
        openIngredientDetailsDialog(value || "Ingrediente");
    });

    // Allow Enter key in ingredient input
    document.getElementById('inline-ingredient-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btn-add-inline-ingredient').click();
        }
    });

    // Ingredient Details Dialog Listeners
    const closeIngBtn = document.getElementById('close-ing-details');
    if (closeIngBtn) closeIngBtn.addEventListener('click', closeIngredientDetailsDialog);

    const confirmIngBtn = document.getElementById('confirm-ing-details');
    if (confirmIngBtn) confirmIngBtn.addEventListener('click', confirmIngredientDetails);

    document.getElementById('recipe-form').addEventListener('submit', handleRecipeSubmit);

    // Time Picker Listeners
    const timeInput = document.getElementById('recipe-time');
    if (timeInput) {
        timeInput.readOnly = true;
        timeInput.style.cursor = 'pointer';
        timeInput.addEventListener('click', openTimePicker);
    }

    const closeTimeBtn = document.getElementById('close-time-picker');
    if (closeTimeBtn) closeTimeBtn.addEventListener('click', closeTimePicker);

    const confirmTimeBtn = document.getElementById('confirm-time-selection');
    if (confirmTimeBtn) confirmTimeBtn.addEventListener('click', confirmTimeSelection);

    // Calories Picker Listeners
    const calInput = document.getElementById('recipe-calories');
    if (calInput) {
        calInput.readOnly = true;
        calInput.style.cursor = 'pointer';
        calInput.addEventListener('click', openCaloriesPicker);
    }

    const closeCalBtn = document.getElementById('close-calories-picker');
    if (closeCalBtn) closeCalBtn.addEventListener('click', closeCaloriesPicker);

    const confirmCalBtn = document.getElementById('confirm-calories-selection');
    if (confirmCalBtn) confirmCalBtn.addEventListener('click', confirmCaloriesSelection);

    // Meal Type Picker Listeners
    const mealInput = document.getElementById('recipe-meal-type');
    if (mealInput) {
        mealInput.addEventListener('click', openMealTypePicker);
        // Also prevent default focus if possible to avoid keyboard on mobile
        mealInput.addEventListener('focus', (e) => {
            e.preventDefault();
            mealInput.blur();
            openMealTypePicker();
        });
    }

    const closeMealBtn = document.getElementById('close-meal-type-picker');
    if (closeMealBtn) closeMealBtn.addEventListener('click', closeMealTypePicker);
}

// Time Picker Logic
function initTimePicker() {
    const wheel = document.getElementById('time-wheel');
    // ... existing init logic ...
    // Note: ensure this logic still runs correctly in a div
    if (!wheel || wheel.children.length > 0) return;

    for (let i = 5; i <= 180; i += 5) {
        const option = document.createElement('div');
        option.className = 'time-option';
        option.textContent = `${i} min`;
        option.dataset.value = i;
        option.onclick = () => {
            option.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        wheel.appendChild(option);
    }

    wheel.addEventListener('scroll', () => {
        highlightCenteredOption();
    });
}

function highlightCenteredOption() {
    const wheel = document.getElementById('time-wheel');
    const center = wheel.scrollTop + (wheel.clientHeight / 2);
    const options = wheel.querySelectorAll('.time-option');

    let closest = null;
    let minDiff = Infinity;

    options.forEach(opt => {
        const optCenter = opt.offsetTop + (opt.clientHeight / 2);
        const diff = Math.abs(center - optCenter);
        if (diff < minDiff) {
            minDiff = diff;
            closest = opt;
        }
    });

    options.forEach(o => o.classList.remove('selected'));
    if (closest) closest.classList.add('selected');
}

function openTimePicker() {
    // DIV OVERLAY ID
    const overlay = document.getElementById('time-picker-overlay');
    const input = document.getElementById('recipe-time');
    const wheel = document.getElementById('time-wheel');

    if (!overlay) return;

    initTimePicker();
    // Use Flex for overlay
    overlay.style.display = 'flex';

    // Scroll to current value
    const currentVal = parseInt(input.value) || 20;
    setTimeout(() => {
        const options = wheel.querySelectorAll('.time-option');
        let targetOption = null;

        options.forEach(opt => {
            if (parseInt(opt.dataset.value) === currentVal) targetOption = opt;
        });

        if (targetOption) {
            targetOption.scrollIntoView({ block: 'center' });
            targetOption.classList.add('selected');
        }
    }, 100);
}

function closeTimePicker() {
    const overlay = document.getElementById('time-picker-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function confirmTimeSelection() {
    // Search within the now-visible overlay to be sure
    const overlay = document.getElementById('time-picker-overlay');
    if (!overlay) return;

    const wheel = document.getElementById('time-wheel');
    const selected = wheel.querySelector('.time-option.selected');

    console.log("DEBUG: Confirming time. Selected element:", selected);

    if (selected) {
        const val = selected.dataset.value;
        const input = document.getElementById('recipe-time');
        input.value = `${val} min`;
    } else {
        console.warn("DEBUG: No time option selected?");
        // Fallback: try to select the center one if nothing is marked
        highlightCenteredOption();
        const fallback = wheel.querySelector('.time-option.selected');
        if (fallback) {
            const val = fallback.dataset.value;
            document.getElementById('recipe-time').value = `${val} min`;
        }
    }
    closeTimePicker();
}

// Calories Picker Logic
// Calories Picker Logic
function openCaloriesPicker() {
    // DIV OVERLAY ID
    const overlay = document.getElementById('calories-picker-overlay');
    const input = document.getElementById('recipe-calories');
    const pickerInput = document.getElementById('calories-picker-input');

    if (!overlay) return;

    // Use Flex for overlay
    overlay.style.display = 'flex';

    // Set current value
    const currentVal = parseInt(input.value) || '';
    pickerInput.value = currentVal;
    pickerInput.focus();
}

function closeCaloriesPicker() {
    const overlay = document.getElementById('calories-picker-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function confirmCaloriesSelection() {
    const pickerInput = document.getElementById('calories-picker-input');
    const input = document.getElementById('recipe-calories');
    const val = pickerInput.value;

    if (val) {
        input.value = `${val} kcal`;
    } else {
        input.value = '';
    }
    closeCaloriesPicker();
}

// Meal Type Picker Logic
// Meal Type Picker Logic
function openMealTypePicker() {
    // DIV OVERLAY ID
    const overlay = document.getElementById('meal-type-picker-overlay');
    const list = document.getElementById('meal-type-list');
    const input = document.getElementById('recipe-meal-type');

    if (!overlay) return;

    // Generate options if empty
    if (list.children.length === 0) {
        const types = ['Desayuno', 'Almuerzo', 'Cena', 'Snack', 'Postre'];
        types.forEach(type => {
            const div = document.createElement('div');
            div.className = 'meal-type-option';
            div.textContent = type;
            div.onclick = () => {
                confirmMealTypeSelection(type);
            };
            list.appendChild(div);
        });
    }

    // Highlight selected
    const currentVal = input.value;
    Array.from(list.children).forEach(child => {
        if (child.textContent === currentVal) {
            child.classList.add('selected');
        } else {
            child.classList.remove('selected');
        }
    });

    // Use Flex for overlay
    overlay.style.display = 'flex';
}

function closeMealTypePicker() {
    const overlay = document.getElementById('meal-type-picker-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function confirmMealTypeSelection(type) {
    const input = document.getElementById('recipe-meal-type');
    input.value = type;
    closeMealTypePicker();
}

// Ingredient Details Dialog Logic
let currentIngredientName = '';

function loadKnownIngredients() {
    console.log('Loading known ingredients...');
    if (!state.groupId) {
        console.warn('No group ID found, cannot load ingredients.');
        return;
    }

    db.collection("groups").doc(state.groupId).collection("metadata").doc("ingredients")
        .get()
        .then((doc) => {
            if (doc.exists && doc.data().list) {
                const list = doc.data().list;
                console.log('Loaded ingredients:', list);
                const datalist = document.getElementById('known-ingredients-list');
                if (datalist) {
                    datalist.innerHTML = '';
                    list.sort().forEach(ing => {
                        const option = document.createElement('option');
                        option.value = ing;
                        datalist.appendChild(option);
                    });
                }
            } else {
                console.log('No ingredients found in metadata.');
            }
        })
        .catch(err => console.error('Error loading ingredients:', err));
}

function openIngredientDetailsDialog(name) {
    currentIngredientName = name;
    // UPDATED ID for Div Overlay
    const overlay = document.getElementById('ingredient-details-overlay');
    const title = document.getElementById('ing-dialog-title');
    const qtyInput = document.getElementById('ing-qty-input');
    const unitInput = document.getElementById('ing-unit-input'); // Hidden input
    const chipsContainer = document.getElementById('unit-chips-container');

    console.log("DEBUG: openIngredientDetailsDialog", overlay);

    if (!overlay) {
        console.error("CRITICAL: Overlay not found in DOM checking for old ID...");
        return;
    }

    title.textContent = name;
    qtyInput.value = '';
    unitInput.value = 'gr'; // Default

    // Render Chips
    const units = ['gr', 'kg', 'ml', 'l', 'cda', 'cdta', 'taza', 'pza'];
    chipsContainer.innerHTML = '';

    units.forEach(unit => {
        const chip = document.createElement('div');
        chip.textContent = unit;
        chip.className = 'unit-chip';
        if (unit === 'gr') chip.classList.add('selected');

        chip.onclick = () => {
            // Update hidden input
            unitInput.value = unit;
            // Update visual selection
            document.querySelectorAll('.unit-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
        };

        chipsContainer.appendChild(chip);
    });

    // Custom Display Logic (Div Overlay)
    overlay.style.display = 'flex';

    qtyInput.focus();
}

function closeIngredientDetailsDialog() {
    const overlay = document.getElementById('ingredient-details-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function confirmIngredientDetails() {
    const qty = document.getElementById('ing-qty-input').value.trim();
    const unit = document.getElementById('ing-unit-input').value;

    addIngredientItem({
        name: currentIngredientName,
        quantity: qty,
        unit: unit
    });

    // Clear main input
    const mainInput = document.getElementById('inline-ingredient-input');
    if (mainInput) {
        mainInput.value = '';
        mainInput.focus();
    }

    closeIngredientDetailsDialog();
}

function openRecipeForm(recipe = null) {
    ensureRecipeFormExists();
    loadKnownIngredients(); // Load autocomplete data
    const formView = document.getElementById('recipe-form-view');
    const form = document.getElementById('recipe-form');

    form.reset();

    // Clear lists
    document.getElementById('ingredients-list').innerHTML = '';
    document.getElementById('steps-list').innerHTML = '';

    if (recipe) {
        // Edit Mode
        form.dataset.mode = 'edit';
        form.dataset.id = recipe.id;
        document.getElementById('dialog-title').textContent = 'Editar Receta';

        document.getElementById('recipe-title').value = recipe.title;
        document.getElementById('recipe-image').value = recipe.image || '';

        // Format initial values
        document.getElementById('recipe-time').value = recipe.prepTime ? `${recipe.prepTime} min` : '';
        document.getElementById('recipe-calories').value = recipe.calories ? `${recipe.calories} kcal` : '';
        document.getElementById('recipe-meal-type').value = recipe.mealType || '';

        // Ingredients
        if (recipe.ingredients) {
            recipe.ingredients.forEach(ing => addIngredientItem(ing));
        }

        // Steps
        if (recipe.steps && Array.isArray(recipe.steps)) {
            recipe.steps.forEach(step => addStepInput(step));
        } else if (recipe.instructions) {
            addStepInput(recipe.instructions);
        } else {
            addStepInput();
        }

    } else {
        // Create Mode
        form.dataset.mode = 'create';
        delete form.dataset.id;
        document.getElementById('dialog-title').textContent = 'Añadir Receta';

        // Clear specific fields
        document.getElementById('recipe-time').value = '';
        document.getElementById('recipe-calories').value = '';
        document.getElementById('recipe-meal-type').value = '';

        addStepInput(); // Add one empty step
    }

    formView.classList.add('active');
}

function closeRecipeForm() {
    document.getElementById('recipe-form-view').classList.remove('active');
}

function addIngredientItem(data = { quantity: '', unit: '', name: '' }) {
    const container = document.getElementById('ingredients-list');
    const div = document.createElement('div');
    div.className = 'ingredient-item';

    // Display logic: if qty/unit exists, show them. If not, just show name.
    const displayQty = data.quantity ? `${data.quantity} ${data.unit || ''}` : '';

    div.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
            <div style="background-color: var(--color-orange-primary); width: 8px; height: 8px; border-radius: 50%;"></div>
            <div style="display: flex; flex-direction: column;">
                <span class="ingredient-name" style="font-size: 16px; font-weight: 600; color: var(--color-dark-brown);">${data.name}</span>
                ${displayQty ? `<span class="ingredient-qty" style="font-size: 14px; color: var(--color-grey-text);">${displayQty}</span>` : ''}
            </div>
        </div>
        <button type="button" class="remove-ing-btn icon-btn" style="border: none; color: #A0A0A0;">
            <span class="material-icons">delete_outline</span>
        </button>
        <input type="hidden" class="ing-data" value='${JSON.stringify(data)}'>
    `;

    div.querySelector('.remove-ing-btn').onclick = () => div.remove();
    container.appendChild(div);
}

function addStepInput(value = '') {
    const container = document.getElementById('steps-list');
    const div = document.createElement('div');
    div.className = 'step-item';

    const stepNum = container.children.length + 1;

    div.innerHTML = `
        <div class="step-header">
            <span class="step-badge">Paso ${stepNum}</span>
            <button type="button" class="remove-step-btn">
                <span class="material-icons">delete_outline</span>
            </button>
        </div>
        <textarea class="step-input premium-input" rows="3" placeholder="Describe los detalles de este paso...">${value}</textarea>
    `;

    div.querySelector('.remove-step-btn').onclick = () => {
        div.remove();
        // Renumber steps
        document.querySelectorAll('.step-badge').forEach((el, index) => {
            el.textContent = `Paso ${index + 1}`;
        });
    };
    container.appendChild(div);
}

function handleRecipeSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const title = document.getElementById('recipe-title').value;
    const image = document.getElementById('recipe-image').value;

    // Parse formatted values
    const prepTimeStr = document.getElementById('recipe-time').value.replace(' min', '').trim();
    const caloriesStr = document.getElementById('recipe-calories').value.replace(' kcal', '').trim();
    const mealType = document.getElementById('recipe-meal-type').value;

    const prepTime = prepTimeStr ? parseInt(prepTimeStr) : null;
    const calories = caloriesStr ? parseInt(caloriesStr) : null;

    // Collect Ingredients
    const ingredients = [];
    document.querySelectorAll('.ingredient-item .ing-data').forEach(input => {
        ingredients.push(JSON.parse(input.value));
    });

    // Collect Steps
    const steps = [];
    document.querySelectorAll('.step-input').forEach(input => {
        if (input.value.trim()) steps.push(input.value.trim());
    });

    // Collect Tags (Hidden for now, default to empty or keep existing logic if we re-enable)
    const tags = [];
    // document.querySelectorAll('.tag-pill.selected').forEach(pill => {
    //     tags.push(pill.dataset.value);
    // });

    // Update Known Ingredients
    const ingredientNames = ingredients.map(i => i.name).filter(n => n);
    console.log('Updating known ingredients with:', ingredientNames);
    updateKnownIngredients(ingredientNames);

    const recipeData = {
        title,
        image,
        prepTime,
        calories,
        mealType, // New field
        ingredients,
        steps,
        tags,
        instructions: steps.join('\n'), // Backward compatibility
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: state.user.uid
    };

    if (form.dataset.mode === 'edit') {
        db.collection("groups").doc(state.groupId).collection("recipes").doc(form.dataset.id)
            .update(recipeData)
            .then(() => {
                closeRecipeForm();
                // Refresh details view if open
                const openRecipe = state.recipes.find(r => r.id === form.dataset.id);
                if (openRecipe && typeof openRecipeDetails === 'function') {
                    openRecipeDetails({ ...openRecipe, ...recipeData });
                }
            });
    } else {
        recipeData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        recipeData.createdBy = state.user.uid;
        db.collection("groups").doc(state.groupId).collection("recipes").add(recipeData)
            .then(() => {
                closeRecipeForm();
            });
    }
}

function updateKnownIngredients(newIngredients) {
    if (!state.groupId || newIngredients.length === 0) return;

    const metadataRef = db.collection("groups").doc(state.groupId).collection("metadata").doc("ingredients");

    // Use arrayUnion to add only new unique items
    metadataRef.set({
        list: firebase.firestore.FieldValue.arrayUnion(...newIngredients)
    }, { merge: true })
        .then(() => console.log('Ingredients updated successfully'))
        .catch(err => console.error('Error updating ingredients:', err));
}
