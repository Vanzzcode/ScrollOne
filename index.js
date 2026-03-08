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
            window.location.href = 'login.html';
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
        window.location.href = 'login.html';
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

// ========== GLOBAL VARIABLES ==========
let currentPostId = null;

// ========== NAVIGASI HALAMAN ==========
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
    document.getElementById(`page-${pageId}`).style.display = 'block';
    
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
    
    // Load data sesuai halaman
    if (pageId === 'notifikasi') loadNotifications();
    if (pageId === 'profil') loadUserProfile();
    if (pageId === 'jelajah') loadExplore();
}

// ========== LOAD NOTIFIKASI ==========
async function loadNotifications() {
    const container = document.getElementById('notificationsList');
    container.innerHTML = '<div class="loading-spinner">Memuat...</div>';
    
    try {
        const { data, error } = await window.supabase
            .from('notifications')
            .select(`
                *,
                sender:profiles!sender_id (full_name, avatar_url)
            `)
            .eq('user_id', (await window.getCurrentUser()).id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #78716c; padding: 40px;">Belum ada notifikasi</p>';
            return;
        }
        
        container.innerHTML = data.map(notif => `
            <div class="notification-item" style="display: flex; gap: 12px; padding: 12px; border-bottom: 1px solid #e5e5e5;">
                <img src="${notif.sender?.avatar_url || 'https://ui-avatars.com/api/?name=' + (notif.sender?.full_name || 'User')}" 
                     style="width: 40px; height: 40px; border-radius: 50%;">
                <div>
                    <p><b>${notif.sender?.full_name || 'Seseorang'}</b> ${getNotifText(notif.type)}</p>
                    <small style="color: #78716c;">${new Date(notif.created_at).toLocaleString('id')}</small>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = '<p style="color: red;">Gagal load notifikasi</p>';
    }
}

function getNotifText(type) {
    const texts = {
        'like': 'menyukai postinganmu',
        'comment': 'mengomentari postinganmu',
        'follow': 'mengikutimu'
    };
    return texts[type] || 'berinteraksi denganmu';
}

// ========== LOAD PROFIL ==========
async function loadUserProfile() {
    try {
        const user = await window.getCurrentUser();
        if (!user) return;
        
        // Load profile dari tabel profiles
        const { data: profile, error } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (error) throw error;
        
        document.getElementById('profileName').textContent = profile.full_name || 'User';
        document.getElementById('profileUsername').textContent = '@' + (profile.username || 'user');
        document.getElementById('profileBio').textContent = profile.bio || 'Halo! Aku pengguna ScrollOne 👋';
        document.getElementById('profileAvatar').src = profile.avatar_url || 'https://ui-avatars.com/api/?name=' + (profile.full_name || 'User');
        
        // Load postingan user
        loadUserPosts(user.id);
        
    } catch (error) {
        console.error('Gagal load profil:', error);
    }
}

async function loadUserPosts(userId) {
    const { data: posts, error } = await window.supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) return;
    
    document.getElementById('postCount').textContent = posts.length;
    
    const grid = document.getElementById('profilePostsGrid');
    grid.innerHTML = posts.map(post => `
        <div class="post-thumbnail" onclick="openPostModal('${post.id}')" style="aspect-ratio: 1; background: #e5e5e5; cursor: pointer;">
            ${post.image_url ? `<img src="${post.image_url}" style="width: 100%; height: 100%; object-fit: cover;">` : 
            `<div style="display: flex; align-items: center; justify-content: center; height: 100%;">📝</div>`}
        </div>
    `).join('');
}

// ========== LOAD EXPLORE ==========
async function loadExplore(query = '') {
    let queryBuilder = window.supabase
        .from('posts')
        .select(`
            *,
            profiles:user_id (full_name, avatar_url)
        `)
        .order('likes_count', { ascending: false })
        .limit(20);
    
    if (query) {
        queryBuilder = queryBuilder.ilike('content', `%${query}%`);
    }
    
    const { data: posts, error } = await queryBuilder;
    
    const container = document.getElementById('exploreFeed');
    container.innerHTML = posts.map(post => `
        <div class="explore-item" style="margin-bottom: 16px; border-bottom: 1px solid #e5e5e5; padding-bottom: 12px;">
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <img src="${post.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=' + (post.profiles?.full_name || 'User')}" style="width: 32px; height: 32px; border-radius: 50%;">
                <b>${post.profiles?.full_name || 'User'}</b>
            </div>
            <p>${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</p>
            <small>❤️ ${post.likes_count} · 💬 ${post.comments_count}</small>
        </div>
    `).join('');
}

// ========== MODAL KOMENTAR ==========
async function openPostModal(postId) {
    currentPostId = postId;
    
    const { data: post, error } = await window.supabase
        .from('posts')
        .select(`
            *,
            profiles:user_id (full_name, avatar_url)
        `)
        .eq('id', postId)
        .single();
    
    if (error) return;
    
    document.getElementById('modalPostContent').innerHTML = `
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <img src="${post.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=' + (post.profiles?.full_name || 'User')}" style="width: 40px; height: 40px; border-radius: 50%;">
            <div>
                <b>${post.profiles?.full_name || 'User'}</b>
                <p style="margin-top: 4px;">${post.content}</p>
            </div>
        </div>
    `;
    
    loadComments(postId);
    document.getElementById('postModal').style.display = 'flex';
}

async function loadComments(postId) {
    const { data: comments, error } = await window.supabase
        .from('comments')
        .select(`
            *,
            profiles:user_id (full_name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at');
    
    const container = document.getElementById('commentsList');
    container.innerHTML = comments.map(c => `
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <img src="${c.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=' + (c.profiles?.full_name || 'User')}" style="width: 32px; height: 32px; border-radius: 50%;">
            <div>
                <b>${c.profiles?.full_name || 'User'}</b>
                <p style="font-size: 14px;">${c.content}</p>
            </div>
        </div>
    `).join('') || '<p style="text-align: center;">Belum ada komentar</p>';
}

// ========== SEARCH ==========
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    loadExplore(e.target.value);
});

// ========== SUBMIT KOMENTAR ==========
document.getElementById('submitComment')?.addEventListener('click', async () => {
    const input = document.getElementById('commentInput');
    if (!input.value.trim() || !currentPostId) return;
    
    try {
        const user = await window.getCurrentUser();
        const { error } = await window.supabase
            .from('comments')
            .insert({
                user_id: user.id,
                post_id: currentPostId,
                content: input.value
            });
        
        if (error) throw error;
        
        input.value = '';
        loadComments(currentPostId);
        
    } catch (error) {
        alert('Gagal mengirim komentar');
    }
});

// ========== CLOSE MODAL ==========
document.getElementById('closePostModal')?.addEventListener('click', () => {
    document.getElementById('postModal').style.display = 'none';
});

// ========== TAB PROFIL ==========
document.getElementById('profilePostsTab')?.addEventListener('click', () => {
    document.getElementById('profilePostsTab').classList.add('active');
    document.getElementById('profileLikesTab').classList.remove('active');
    document.getElementById('profilePostsGrid').style.display = 'grid';
    document.getElementById('profileLikesGrid').style.display = 'none';
});

document.getElementById('profileLikesTab')?.addEventListener('click', () => {
    document.getElementById('profileLikesTab').classList.add('active');
    document.getElementById('profilePostsTab').classList.remove('active');
    document.getElementById('profilePostsGrid').style.display = 'none';
    document.getElementById('profileLikesGrid').style.display = 'grid';
});

// ========== UPDATE NAVIGASI ==========
// Di bagian navigasi, ubah event listener jadi:
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        showPage(page);
    });
});

// Mulai
init();