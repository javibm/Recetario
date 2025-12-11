function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    // Image handling
    let imageContent;
    if (recipe.image) {
        imageContent = `<img src="${recipe.image}" alt="${recipe.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="recipe-placeholder" style="display: none;">${recipe.title.charAt(0).toUpperCase()}</div>`;
    } else {
        imageContent = `<div class="recipe-placeholder">${recipe.title.charAt(0).toUpperCase()}</div>`;
    }

    // Data handling
    const time = recipe.prepTime ? `${recipe.prepTime} min` : '20 min';
    const meta2 = recipe.calories ? `${recipe.calories} kcal` : (recipe.ingredients ? `${recipe.ingredients.length} ingr.` : 'Fácil');
    const metaIcon = recipe.calories ? 'local_fire_department' : 'restaurant_menu';

    card.innerHTML = `
        <div class="recipe-image-container">
            ${imageContent}
        </div>
        <div class="recipe-info">
            <span class="recipe-title">${recipe.title}</span>
            <div class="recipe-meta-row">
                <div class="meta-col left">
                    <span class="material-icons">schedule</span>
                    <span>${time}</span>
                </div>
                <div class="meta-col right">
                    <span class="material-icons">${metaIcon}</span>
                    <span>${meta2}</span>
                </div>
            </div>
        </div>
    `;

    card.onclick = () => {
        if (typeof openRecipeDetails === 'function') {
            openRecipeDetails(recipe);
        }
    };
    return card;
}

function toggleFavorite(id) {
    console.log('Toggle favorite', id);
    // TODO: Implement favorite logic
}
