const CACHE_NAME = 'recetario-v14-modular-update';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './recetario_icon.svg',
    // Modular CSS
    './css/variables.css',
    './css/base.css',
    './css/layouts.css',
    './css/components.css',
    './css/recipe-card.css',
    './css/planner.css',
    './css/auth.css',
    './css/add-recipe.css',
    './css/shopping-list.css',
    './css/recipe-details.css',
    './css/ingredients.css',
    // Modular JS
    './js/firebase-init.js',
    './js/state.js',
    './js/recipe-card.js',
    './js/recipes.js',
    './js/planner.js',
    './js/shopping-list.js',
    './js/add-recipe.js',
    './js/auth.js',
    './js/ingredients-manager.js',
    './js/main.js',
    // Views
    './js/views/RecipesView.js',
    './js/views/RecipeDetailsView.js',
    './js/views/PlannerView.js',
    './js/views/ShoppingListView.js',
    './js/views/AddRecipeView.js',
    './js/views/IngredientsView.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    // Tell the active service worker to take control of the page immediately.
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
