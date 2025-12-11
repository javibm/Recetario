window.AddRecipeView = {
    template: `
        <div id="recipe-form-view" class="view" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: var(--md-sys-color-background); z-index: 2000; overflow-y: auto; padding: 0;">
            <div style="position: sticky; top: 0; z-index: 2001; background-color: var(--md-sys-color-background); padding: 16px 24px 8px; border-bottom: 1px solid var(--md-sys-color-surface-container-high);">
                <header class="dialog-header" style="display: flex; align-items: center; padding: 0;">
                    <button type="button" id="close-form-view" style="background: transparent; border: 1px solid var(--md-sys-color-outline); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--md-sys-color-on-surface);">
                        <span class="material-icons">arrow_back</span>
                    </button>
                    <h2 id="dialog-title"
                        style="flex: 1; margin-left: 16px; margin-top: 0; margin-bottom: 0; font-family: var(--font-family-serif); font-size: 24px; color: var(--md-sys-color-on-surface);">Añadir
                        Receta</h2>
                </header>
            </div>
            <div style="padding: 24px;">
            <form id="recipe-form" class="form-content">
                <div class="input-group">
                    <label for="recipe-title">Nombre de la receta</label>
                    <input type="text" id="recipe-title" required placeholder="Ej. Pasta al Pesto"
                        class="premium-input">
                </div>

                <div class="input-group">
                    <label>Foto de la receta (URL)</label>
                    <div class="photo-placeholder" id="photo-upload-area" style="position: relative; padding: 16px; border: 2px dashed var(--md-sys-color-outline); border-radius: 12px; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center; background-color: var(--md-sys-color-surface-variant);">
                        <span class="material-icons" style="color: var(--md-sys-color-on-surface-variant);">link</span>
                        <input type="url" id="recipe-image" placeholder="Pega aquí la URL de la imagen"
                            class="premium-input" style="width: 100%; text-align: center; background: transparent; border: none; border-bottom: 1px solid var(--md-sys-color-outline); border-radius: 0; padding: 8px;">
                    </div>
                </div>

                <!-- Time & Calories & Meal Type -->
                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 24px;">
                    <div class="meta-item">
                        <span class="material-icons">schedule</span>
                        <input type="text" id="recipe-time" placeholder="20 min" class="meta-input">
                    </div>
                    <div class="meta-item">
                        <span class="material-icons">local_fire_department</span>
                        <input type="text" id="recipe-calories" placeholder="320 kcal" class="meta-input">
                    </div>
                    <div class="meta-item">
                        <span class="material-icons">restaurant_menu</span>
                        <input type="text" id="recipe-meal-type" placeholder="Tipo" class="meta-input" readonly style="cursor: pointer;">
                    </div>
                </div>

                <div class="input-group">
                    <h3 class="section-title-serif">Ingredientes</h3>
                    
                    <!-- Inline Add Ingredient (Moved to Top) -->
                    <div class="inline-add-container" style="margin-bottom: 16px;">
                        <input type="text" id="inline-ingredient-input" placeholder="Buscar ingrediente..."
                            class="premium-input" list="known-ingredients-list" autocomplete="off">
                        <datalist id="known-ingredients-list"></datalist>
                        <button type="button" id="btn-add-inline-ingredient" class="btn-icon-filled">
                            <span class="material-icons">add</span>
                        </button>
                    </div>

                    <div id="ingredients-list" class="ingredients-list-container">
                        <!-- Dynamic inputs -->
                    </div>
                </div>

                <div class="input-group">
                    <h3 class="section-title-serif">Pasos</h3>
                    <div id="steps-list" class="steps-list-container">
                        <!-- Dynamic steps -->
                    </div>
                    <button type="button" id="add-step-btn" class="btn-text-action">
                        <span class="material-icons">add</span> Añadir Paso
                    </button>
                </div>

                <div class="input-group" style="display: none;">
                    <div class="tags-container" id="recipe-tags">
                        <div class="tag-pill" data-value="Desayuno">Desayuno</div>
                        <div class="tag-pill" data-value="Almuerzo">Almuerzo</div>
                        <div class="tag-pill" data-value="Cena">Cena</div>
                        <div class="tag-pill" data-value="Postre">Postre</div>
                        <div class="tag-pill" data-value="Fácil">Fácil</div>
                    </div>
                </div>

            </form>
            <div class="dialog-footer">
                <button type="button" id="cancel-recipe">Cancelar</button>
                <button type="submit" form="recipe-form" class="btn-filled">Guardar</button>
            </div>

            <!-- Time Picker Overlay -->
            <!-- Time Picker Overlay -->
            <div id="time-picker-overlay" class="bottom-sheet-overlay" style="display: none;">
                <div class="bottom-sheet-content">
                    <header class="dialog-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px;">
                        <h3 style="margin: 0; font-family: var(--font-family-serif); flex: 1; text-align: center;">Tiempo</h3>
                        <button type="button" class="icon-btn" id="close-time-picker">
                            <span class="material-icons">close</span>
                        </button>
                    </header>
                    <div class="time-picker-container">
                        <div class="selection-highlight"></div>
                        <div class="time-wheel" id="time-wheel">
                            <!-- Generated by JS -->
                        </div>
                    </div>
                    <div style="padding: 16px;">
                        <button type="button" class="btn-filled" id="confirm-time-selection" style="width: 100%;">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>

            <!--Calories Picker Overlay -->
            <div id="calories-picker-overlay" class="bottom-sheet-overlay" style="display: none;">
                <div class="bottom-sheet-content">
                    <header class="dialog-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px;">
                        <h3 style="margin: 0; font-family: var(--font-family-serif); flex: 1; text-align: center;">Calorías</h3>
                        <button type="button" class="icon-btn" id="close-calories-picker">
                            <span class="material-icons">close</span>
                        </button>
                    </header>
                    <div style="padding: 32px 16px; display: flex; flex-direction: column; align-items: center; gap: 16px;">
                        <div style="display: flex; align-items: baseline; gap: 8px; width: 100%; justify-content: center;">
                            <input type="number" id="calories-picker-input" placeholder="0" style="font-size: 48px; font-weight: 700; color: var(--color-orange-primary); border: none; background: transparent; width: 240px; text-align: center; font-family: var(--font-family-sans); outline: none;">
                            <span style="font-size: 20px; color: var(--color-grey-text); font-weight: 500;">kcal</span>
                        </div>
                        <button type="button" class="btn-filled" id="confirm-calories-selection" style="width: 100%;">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>

            <!--Meal Type Picker Overlay -->
            <div id="meal-type-picker-overlay" class="bottom-sheet-overlay" style="display: none;">
                <div class="bottom-sheet-content">
                    <header class="dialog-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px;">
                        <h3 style="margin: 0; font-family: var(--font-family-serif); flex: 1; text-align: center;">Tipo de Comida</h3>
                        <button type="button" class="icon-btn" id="close-meal-type-picker">
                            <span class="material-icons">close</span>
                        </button>
                    </header>
                    <div class="meal-type-list" id="meal-type-list" style="padding: 0 16px 24px;">
                        <!-- Options generated by JS -->
                    </div>
                </div>
            </div>

            <!--Ingredient Details Dialog-- >
            <!--Ingredient Details Overlay -->
            <div id="ingredient-details-overlay" class="bottom-sheet-overlay" style="display: none;">
                <div class="bottom-sheet-content">
                    <header class="dialog-header">
                        <h3 style="flex: 1; text-align: center; font-family: var(--font-family-serif);" id="ing-dialog-title">Detalles</h3>
                        <button type="button" class="icon-btn" id="close-ing-details" style="position: absolute; right: 16px; border: none;">
                            <span class="material-icons">close</span>
                        </button>
                    </header>
                    <div style="padding: 24px 16px; display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <label style="display: block; font-size: 12px; color: var(--color-grey-text); margin-bottom: 4px;">Cantidad</label>
                            <input type="number" id="ing-qty-input" class="premium-input" placeholder="Ej. 200" style="font-size: 24px; text-align: center; padding: 16px;">
                        </div>

                        <div>
                            <label style="display: block; font-size: 12px; color: var(--color-grey-text); margin-bottom: 8px;">Unidad</label>
                            <div id="unit-chips-container" style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; -ms-overflow-style: none;">
                                <!-- Chips generated by JS -->
                            </div>
                            <input type="hidden" id="ing-unit-input" value="gr">
                        </div>
                    </div>
                    <div style="padding: 0 16px 24px;">
                        <button type="button" class="btn-filled" id="confirm-ing-details" style="width: 100%;">
                            Añadir Ingrediente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    version: "2.0"
};
