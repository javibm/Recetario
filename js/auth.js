// Auth Logic
let isRegistering = false;

function initAuthListeners() {
    const authDialog = document.getElementById('auth-dialog');
    const authForm = document.getElementById('auth-form');
    const authEmailInput = document.getElementById('auth-email');
    const authPasswordInput = document.getElementById('auth-password');
    const authGroupCodeInput = document.getElementById('auth-group-code');
    const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const groupCodeContainer = document.getElementById('group-code-container');
    const profileBtn = document.getElementById('user-profile-btn');
    // logoutBtn removed as it is no longer used here

    // Auth State Observer
    auth.onAuthStateChanged((user) => {
        if (user) {
            state.user = user;

            // Update Profile Button
            if (profileBtn) {
                const initial = user.email ? user.email.charAt(0).toUpperCase() : '?';
                profileBtn.innerHTML = `<span style="font-weight: 700; font-size: 20px; color: white;">${initial}</span>`;
                profileBtn.classList.add('logged-in');
            }

            // Fetch User Profile to get Group ID
            db.collection("users").doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    state.groupId = doc.data().groupId;
                    authDialog.close();
                    initRealtimeListeners();
                } else {
                    // User exists but no profile (shouldn't happen in normal flow)
                    console.error("User has no profile/group");
                    auth.signOut();
                }
            });
        } else {
            state.user = null;
            state.groupId = null;
            state.recipes = [];
            state.plan = {};

            // Reset Profile Button
            if (profileBtn) {
                profileBtn.innerHTML = `<span class="material-icons">person</span>`;
                profileBtn.classList.remove('logged-in');
            }

            renderRecipes(); // Clear UI

            // Force close any open views/forms to prevent validation conflicts
            document.getElementById('recipe-form-view').classList.remove('active');
            document.getElementById('recipe-details-view').classList.remove('active');
            document.getElementById('recipe-form').reset();

            authDialog.showModal();
        }
    });

    toggleAuthModeBtn.addEventListener('click', () => {
        isRegistering = !isRegistering;
        if (isRegistering) {
            authTitle.textContent = 'Crear Cuenta';
            authSubtitle.textContent = 'Únete a tu pareja o crea un grupo nuevo.';
            authSubmitBtn.textContent = 'Registrarse';
            toggleAuthModeBtn.textContent = '¿Ya tienes cuenta? Inicia Sesión';
            groupCodeContainer.style.display = 'block';
            authGroupCodeInput.required = true;
        } else {
            authTitle.textContent = 'Bienvenido';
            authSubtitle.textContent = 'Inicia sesión para sincronizar tus recetas.';
            authSubmitBtn.textContent = 'Iniciar Sesión';
            toggleAuthModeBtn.textContent = '¿No tienes cuenta? Regístrate';
            groupCodeContainer.style.display = 'none';
            authGroupCodeInput.required = false;
        }
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        const groupCode = authGroupCodeInput.value.toUpperCase().trim();

        if (isRegistering) {
            // --- BLIND JOIN STRATEGY ---
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    const groupRef = db.collection("groups").doc(groupCode);

                    return groupRef.update({
                        members: firebase.firestore.FieldValue.arrayUnion(user.uid)
                    }).then(() => {
                        return db.collection("users").doc(user.uid).set({
                            email: email,
                            groupId: groupCode
                        });
                    }).catch((error) => {
                        console.error("Join Group Failed:", error);
                        user.delete().then(() => {
                            if (error.code === 'not-found') {
                                alert("El código de grupo NO existe. Pídelo a tu administrador.");
                            } else {
                                alert("No se pudo unir al grupo: " + error.message);
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error("Registration Error:", error);
                    if (error.code === 'auth/email-already-in-use') {
                        alert("Este email ya está registrado. Inicia sesión.");
                    } else {
                        alert("Error de registro: " + error.message);
                    }
                });

        } else {
            // Login
            auth.signInWithEmailAndPassword(email, password)
                .catch((error) => {
                    console.error("Auth Error:", error);
                    alert("Error de autenticación: " + error.message);
                });
        }
    });

    // Logout logic is now handled in main.js via the profile button
}
