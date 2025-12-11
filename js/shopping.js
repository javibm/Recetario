// Shopping List Logic

function renderShoppingList() {
    const container = document.querySelector('.shopping-list');
    container.innerHTML = '';

    // 1. Collect all ingredients from the Plan
    const ingredientsNeeded = {}; // { "name": { quantity: 0, unit: "u" } }

    // Iterate through the next 7 days of plan
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayPlan = state.plan[dateStr];

        if (dayPlan) {
            ['lunch', 'dinner'].forEach(type => {
                const recipeId = dayPlan[type];
                if (recipeId) {
                    const recipe = state.recipes.find(r => r.id === recipeId);
                    if (recipe && recipe.ingredients) {
                        recipe.ingredients.forEach(ing => {
                            const name = ing.name.toLowerCase().trim();
                            if (!ingredientsNeeded[name]) {
                                ingredientsNeeded[name] = { quantity: 0, unit: ing.unit };
                            }
                            ingredientsNeeded[name].quantity += parseFloat(ing.quantity) || 0;
                        });
                    }
                }
            });
        }
    }

    // 2. Render List
    const list = Object.entries(ingredientsNeeded).sort((a, b) => a[0].localeCompare(b[0]));

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">shopping_cart</span>
                <p>Tu lista de la compra está vacía.<br>Planifica comidas para generarla.</p>
            </div>
        `;
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'ingredient-list';
    ul.style.padding = '0 24px';

    list.forEach(([name, data]) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.padding = '12px 0';
        li.style.borderBottom = '1px solid var(--md-sys-color-outline-variant)';

        li.innerHTML = `
            <span style="text-transform: capitalize;">${name}</span>
            <span style="font-weight: 500; color: var(--md-sys-color-primary);">${data.quantity} ${data.unit}</span>
        `;
        ul.appendChild(li);
    });

    container.appendChild(ul);
}
