window.PlannerView = {
    template: `
        <div class="planner-container">
            <!-- Week Navigation Card -->
            <div class="week-nav-card">
                <button class="nav-arrow" id="prev-week">
                    <span class="material-icons">chevron_left</span>
                </button>
                <div class="week-label">
                    <span class="week-text">Semana</span>
                    <span class="week-dates" id="current-week-label">Cargando...</span>
                </div>
                <button class="nav-arrow" id="next-week">
                    <span class="material-icons">chevron_right</span>
                </button>
            </div>

            <!-- Days Grid -->
            <div class="week-grid" id="planner-grid">
                <!-- Days will be generated here by planner.js -->
            </div>

            <!-- Recipe Selection Dialog -->
            <dialog id="planner-recipe-selector" class="bottom-sheet-dialog">
                <div class="dialog-content">
                    <header class="dialog-header">
                        <h3 style="flex: 1; text-align: center; font-family: var(--font-family-serif);">Seleccionar Receta</h3>
                        <button class="icon-btn" onclick="document.getElementById('planner-recipe-selector').close()" style="position: absolute; right: 16px; border: none;">
                            <span class="material-icons">close</span>
                        </button>
                    </header>
                    <div class="search-bar-container" style="padding: 0 16px 16px;">
                        <div class="search-bar">
                             <span class="material-icons search-icon">search</span>
                             <input type="text" id="recipe-search" placeholder="Buscar..." oninput="renderRecipeSelector(this.value)"> 
                        </div>
                    </div>
                    <div id="select-recipe-list" style="padding: 0 16px 24px; max-height: 60vh; overflow-y: auto;">
                        <!-- Recipe options injected by recipes.js -->
                    </div>
                </div>
            </dialog>
        </div>
    `
};
