window.RecipeDetailsView = {
    template: `
        <div id="recipe-details-view" class="view full-screen" style="background-color: var(--md-sys-color-background);">
            
            <!-- Sticky Top Bar -->
            <div class="details-top-bar">
                <button class="icon-btn" id="close-details-btn">
                    <span class="material-icons">arrow_back</span>
                </button>
                <div class="details-title-container">
                    <h2 id="detail-title">Nombre Receta</h2>
                </div>
                <button class="icon-btn" id="edit-recipe-action">
                    <span class="material-icons" style="color: var(--color-orange-primary);">edit</span>
                </button>
            </div>

            <!-- Content Container (Scrollable) -->
            <div class="details-scroll-container">
                <!-- Hero Image -->
                <div id="detail-hero" class="detail-hero">
                    <!-- Injected via JS -->
                </div>

                <!-- Meta Info (Time, Calories, etc) -->
                <div id="detail-meta-row" class="detail-meta-row">
                    <!-- Injected via JS -->
                </div>

                <!-- Ingredients -->
                <div style="margin-bottom: 24px;">
                    <h3 class="section-title-serif">Ingredientes</h3>
                    <div id="detail-ingredients" class="ingredients-list-container">
                        <!-- Injected via JS -->
                    </div>
                </div>

                <!-- Instructions -->
                <div>
                    <h3 class="section-title-serif">Pasos</h3>
                    <div id="detail-instructions-list" class="instructions-container">
                        <!-- Injected via JS -->
                    </div>
                </div>

                <!-- Actions (Delete Only - Edit is up top) -->
                <div class="detail-actions" style="border: none; padding-top: 0; margin-top: 16px;">
                     <button class="action-btn delete" id="delete-recipe-btn">
                        <span class="material-icons">delete</span> Eliminar Receta
                    </button>
                </div>
                
                <div style="height: 100px;"></div> <!-- Spacer -->
            </div>
        </div>
    `,
};
