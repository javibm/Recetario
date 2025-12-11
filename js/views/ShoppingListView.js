window.ShoppingListView = {
    template: `
        <div class="shopping-view-container">
            <!-- Week Selector -->
            <!-- Week Selector -->
            <div class="week-nav-card">
                <button class="nav-arrow" id="shop-prev-week">
                    <span class="material-icons">chevron_left</span>
                </button>
                <div class="week-label">
                    <span class="week-text">Semana</span>
                    <span class="week-dates" id="shop-week-label">Semana Actual</span>
                </div>
                <button class="nav-arrow" id="shop-next-week">
                    <span class="material-icons">chevron_right</span>
                </button>
            </div>

            <!-- Shopping List Card -->
            <div class="shopping-card">
                <div id="shopping-list-content">
                    <!-- Categories and items will be injected here -->
                    <div class="empty-state">
                        <span class="material-icons empty-icon">shopping_cart</span>
                        <p>Tu lista de la compra está vacía.<br>Planifica comidas para generarla.</p>
                    </div>
                </div>
            </div>
        </div>
    `,

    renderItem: (item, index) => {
        return `
        <div class="shopping-item ${item.checked ? 'checked' : ''}" data-index="${index}" data-id="${item.name}" onclick="toggleIngredientCheck(${index})">
            <div class="item-left">
                <div class="custom-checkbox">
                    <span class="material-icons">check</span>
                </div>
                <span class="item-name">${item.name}</span>
            </div>
            <span class="item-qty">${item.quantity} ${item.unit || ''}</span>
        </div>
    `;

    },

    renderCategory: (title, itemsHtml) => `
        <div class="shopping-category">
            <h4 class="category-title">${title}</h4>
            <div class="category-items">
                ${itemsHtml}
            </div>
        </div>
    `
};
