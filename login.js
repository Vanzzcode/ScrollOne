// Ambil elemen
const googleLoginBtn = document.getElementById('googleLoginBtn');
const manualLoginBtn = document.getElementById('manualLoginBtn');
const messageContainer = document.getElementById('messageContainer');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// Register elements
const showRegisterLink = document.getElementById('showRegister');
const registerModal = document.getElementById('registerModal');
const closeRegister = document.getElementById('closeRegister');
const registerBtn = document.getElementById('registerBtn');
const regName = document.getElementById('regName');
const regEmail = document.getElementById('regEmail');
const regPassword = document.getElementById('regPassword');

// ========== KONFIGURASI GITHUB PAGES ==========
// Deteksi apakah running di GitHub Pages atau localhost
const isGitHubPages = window.location.hostname.includes('github.io');
const baseUrl = isGitHubPages 
    ? 'https://vanzzcode.github.io/scrollone'  // GANTI dengan username GitHub kamu
    : window.location.origin;

// Redirect URL untuk Google OAuth
const redirectTo = baseUrl + '/index.html';

// ========== HELPER FUNCTIONS ==========
function showMessage(text, type = 'error') {
    if (!messageContainer) return;
    messageContainer.textContent = text;
    messageContainer.className = `message ${type}`;
}

function showLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span> Memproses...';
    } else {
        button.disabled = false;
        if (button.id === 'googleLoginBtn') {
            button.innerHTML = '<img src="https://www.google.com/favicon.ico" alt="Google"><span>Lanjutkan dengan Google</span>';
        } else {
            button.innerHTML = 'Masuk dengan Email';
        }
    }
}

// ========== CEK SESSION SAAT LOAD ==========
async function checkSession() {
    try {
        const session = await window.getSession();
        if (session) {
            window.location.href = redirectTo;
        }
    } catch (e) {
        console.log('Belum login');
    }
}
checkSession();

// ========== LOGIN GOOGLE (UPDATE) ==========
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        try {
            showLoading(googleLoginBtn, true);
            
            console.log('Redirect to:', redirectTo); // Debugging
            
            const { data, error } = await window.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectTo,
                    // Tambahan untuk Android
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent'
                    }
                }
            });
            
            if (error) throw error;
            
        } catch (error) {
            showLoading(googleLoginBtn, false);
            showMessage('Gagal login: ' + error.message);
            console.error('Login error:', error);
        }
    });
}

// ========== LOGIN MANUAL ==========
if (manualLoginBtn) {
    manualLoginBtn.addEventListener('click', async () => {
        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value.trim() : '';
        
        if (!email || !password) {
            showMessage('Email dan password harus diisi');
            return;
        }
        
        try {
            showLoading(manualLoginBtn, true);
            
            const { data, error } = await window.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            showMessage('Login berhasil!', 'success');
            setTimeout(() => window.location.href = redirectTo, 1000);
            
        } catch (error) {
            showLoading(manualLoginBtn, false);
            showMessage('Login gagal: ' + error.message);
        }
    });
}

// ========== REGISTER MODAL ==========
if (showRegisterLink) {
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (registerModal) registerModal.style.display = 'flex';
    });
}

if (closeRegister) {
    closeRegister.addEventListener('click', () => {
        if (registerModal) registerModal.style.display = 'none';
    });
}

if (registerModal) {
    registerModal.addEventListener('click', (e) => {
        if (e.target === registerModal) registerModal.style.display = 'none';
    });
}

// ========== REGISTER ==========
if (registerBtn) {
    registerBtn.addEventListener('click', async () => {
        const name = regName ? regName.value.trim() : '';
        const email = regEmail ? regEmail.value.trim() : '';
        const password = regPassword ? regPassword.value.trim() : '';
        
        if (!name || !email || !password) {
            alert('Semua field harus diisi');
            return;
        }
        
        if (password.length < 6) {
            alert('Password minimal 6 karakter');
            return;
        }
        
        try {
            registerBtn.disabled = true;
            registerBtn.innerHTML = '<span class="loading"></span> Mendaftar...';
            
            const { data, error } = await window.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { full_name: name }
                }
            });
            
            if (error) throw error;
            
            alert('Pendaftaran berhasil! Silakan cek email.');
            if (registerModal) registerModal.style.display = 'none';
            
            // Reset form
            if (regName) regName.value = '';
            if (regEmail) regEmail.value = '';
            if (regPassword) regPassword.value = '';
            
        } catch (error) {
            alert('Gagal: ' + error.message);
        } finally {
            registerBtn.disabled = false;
            registerBtn.innerHTML = 'Daftar';
        }
    });
}

// ========== ENTER KEY ==========
if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && manualLoginBtn) manualLoginBtn.click();
    });
}

if (emailInput) {
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && passwordInput) passwordInput.focus();
    });
}

// ========== DEBUG: Cek konfigurasi ==========
console.log('✅ Mode:', isGitHubPages ? 'GitHub Pages' : 'Localhost');
console.log('✅ Base URL:', baseUrl);
console.log('✅ Redirect URL:', redirectTo);