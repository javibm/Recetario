window.RecipesView = {
    template: `
        <div style="position: sticky; top: 0; z-index: 100; background-color: var(--md-sys-color-background); padding-top: 8px;">
            <div class="search-bar-container">
                <div class="search-bar">
                    <span class="material-icons search-icon">search</span>
                    <input type="text" id="main-recipe-search" placeholder="Buscar recetas, ingredientes...">
                    <button class="filter-btn">
                        <span class="material-icons">tune</span>
                    </button>
                </div>
            </div>

            <div class="categories-scroll" style="padding-bottom: 8px;">
                <button class="category-pill active" data-category="Todas">Todas</button>
                <button class="category-pill" data-category="Desayuno">Desayuno</button>
                <button class="category-pill" data-category="Almuerzo">Almuerzo</button>
                <button class="category-pill" data-category="Cena">Cena</button>
                <button class="category-pill" data-category="Snack">Snack</button>
                <button class="category-pill" data-category="Postre">Postre</button>
            </div>
        </div>

        <div id="recipes-loading" class="loader-container" style="display: none;">
            <div class="spinner"></div>
            <p class="loading-text">Consultando el libro de la abuela...</p>
        </div>

        <div class="empty-state" style="display: none; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; color: var(--md-sys-color-outline);">
            <span class="material-icons" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">menu_book</span>
            <p>No hay recetas aún. ¡Añade una!</p>
        </div>

        <div class="recipe-grid"></div>

        <button id="fab-add-recipe" class="fab" aria-label="Añadir receta">
            <span class="material-icons">add</span>
        </button>
    `
};
