// Ambil elemen
const loadingOverlay = document.getElementById('loadingOverlay');
const userAvatar = document.getElementById('userAvatar');
const darkToggle = document.getElementById('darkToggle');
const logoutBtn = document.getElementById('logoutBtn');
const feedContainer = document.getElementById('feedContainer');

// Loading
function showLoading(show) {
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Cek session
async function init() {
    showLoading(true);
    
    try {
        // PAKAI window.getSession (dari config)
        const session = await window.getSession();
        
        if (!session) {
            window.location.href = 'lgn.html';
            return;
        }

        // Tampilkan avatar user
        const user = session.user;
        const avatar = user.user_metadata?.avatar_url;
        if (avatar && userAvatar) {
            userAvatar.src = avatar;
            userAvatar.style.display = 'block';
        }

        await loadFeed();
        
    } catch (error) {
        console.error('Error:', error);
        window.location.href = 'lgn.html';
    } finally {
        showLoading(false);
    }
}

// Load feed dummy
async function loadFeed() {
    if (!feedContainer) return;
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const posts = [
        {
            id: 1,
            author: 'Rara Nusantara',
            avatar: 'RN',
            time: '45 menit lalu',
            content: 'Senja di Malioboro, lengkap dengan becak 🚲',
            likes: 142,
            comments: 21
        },
        {
            id: 2,
            author: 'Komunitas Mie Aceh',
            avatar: '🍜',
            time: '2 jam lalu',
            content: 'Yuk voting tempat nongkrong! 🍜',
            likes: 89,
            comments: 34
        }
    ];

    feedContainer.innerHTML = posts.map(post => `
        <div class="post-card">
            <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #d97706; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                    ${post.avatar}
                </div>
                <div>
                    <span style="font-weight: 600;">${post.author}</span>
                    <span style="font-size: 12px; color: #a8a29e; display: block;">${post.time}</span>
                </div>
            </div>
            
            <p style="margin: 0 0 12px 0;">${post.content}</p>
            
            <div style="display: flex; gap: 24px; border-top: 1px solid #e7e5e4; padding-top: 12px;">
                <button class="like-btn" data-id="${post.id}" style="background: none; border: none; display: flex; align-items: center; gap: 6px; color: #57534e; cursor: pointer;">
                    <i class="far fa-heart"></i>
                    <span class="like-count">${post.likes}</span>
                </button>
                <button style="background: none; border: none; display: flex; align-items: center; gap: 6px; color: #57534e;">
                    <i class="far fa-comment"></i>
                    <span>${post.comments}</span>
                </button>
            </div>
        </div>
    `).join('');

    // Like button
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            const countSpan = this.querySelector('.like-count');
            let count = parseInt(countSpan.textContent);
            
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = '#ef4444';
                countSpan.textContent = count + 1;
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = '';
                countSpan.textContent = count - 1;
            }
        });
    });
}

// Dark mode
if (darkToggle) {
    darkToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const icon = darkToggle.querySelector('i');
        if (icon) {
            if (icon.classList.contains('fa-moon')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
    });
}

// Logout - PAKAI window.logout dari config
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        window.logout();
    });
}

// Navigasi
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Bisa ditambah routing nanti
        const page = item.dataset.page;
        console.log('Pindah ke:', page);
    });
});

// Mulai
init();