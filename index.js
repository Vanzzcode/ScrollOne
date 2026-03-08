// ========== ELEMEN ==========
const loadingOverlay = document.getElementById('loadingOverlay');
const userAvatar = document.getElementById('userAvatar');
const darkToggle = document.getElementById('darkToggle');
const logoutBtn = document.getElementById('logoutBtn');
const feedContainer = document.getElementById('feedContainer');

// Global variables
let currentUser = null;
let currentPostId = null;
let currentRegion = 'all';

// ========== HELPER FUNCTIONS ==========
function showLoading(show) {
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // detik
    
    if (diff < 60) return `${diff} detik lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
}

// ========== CEK SESSION ==========
async function init() {
    showLoading(true);
    
    try {
        const session = await window.getSession();
        
        if (!session) {
            window.location.href = 'lgn.html';
            return;
        }

        currentUser = session.user;
        
        // Tampilkan avatar
        const avatar = currentUser.user_metadata?.avatar_url;
        if (avatar && userAvatar) {
            userAvatar.src = avatar;
            userAvatar.style.display = 'block';
        }

        // Load feed
        await loadFeed();
        
        // Setup filter chips
        setupFilters();
        
    } catch (error) {
        console.error('Error:', error);
        window.location.href = 'lgn.html';
    } finally {
        showLoading(false);
    }
}

// ========== FILTER ==========
function setupFilters() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', async () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            currentRegion = chip.dataset.region;
            await loadFeed();
        });
    });
}

// ========== LOAD FEED ==========
async function loadFeed() {
    if (!feedContainer) return;
    
    feedContainer.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i><p>Memuat...</p></div>';
    
    try {
        let query = window.supabase
            .from('posts')
            .select(`
                *,
                profiles:user_id (id, username, full_name, avatar_url),
                likes_count,
                comments_count
            `)
            .order('created_at', { ascending: false });
        
        if (currentRegion !== 'all') {
            query = query.eq('region', currentRegion);
        }
        
        const { data: posts, error } = await query;
        
        if (error) throw error;
        
        if (posts.length === 0) {
            feedContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #78716c;">Belum ada postingan</p>';
            return;
        }
        
        // Cek status like untuk setiap post
        const postsWithLikeStatus = await Promise.all(posts.map(async (post) => {
            const { data: like } = await window.supabase
                .from('likes')
                .select('id')
                .eq('user_id', currentUser.id)
                .eq('post_id', post.id)
                .maybeSingle();
            
            return { ...post, isLiked: !!like };
        }));
        
        renderFeed(postsWithLikeStatus);
        
    } catch (error) {
        console.error('Gagal load feed:', error);
        feedContainer.innerHTML = '<p style="color: red; text-align: center;">Gagal memuat feed</p>';
    }
}

function renderFeed(posts) {
    feedContainer.innerHTML = posts.map(post => `
        <div class="post-card" data-post-id="${post.id}">
            <div style="display: flex; gap: 12px; margin-bottom: 12px; cursor: pointer;" onclick="showPage('profil'); loadUserProfile('${post.user_id}')">
                <img src="${post.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=' + (post.profiles?.full_name || 'User')}" 
                     style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <div>
                    <span style="font-weight: 600;">${post.profiles?.full_name || 'User'}</span>
                    ${post.region ? `<span style="font-size: 11px; background: #f5f5f4; padding: 2px 8px; border-radius: 999px; margin-left: 6px;">${post.region}</span>` : ''}
                    <span style="font-size: 12px; color: #a8a29e; display: block;">${formatDate(post.created_at)}</span>
                </div>
            </div>
            
            <p style="margin: 0 0 12px 0; cursor: pointer;" onclick="openPostModal('${post.id}')">${post.content}</p>
            
            ${post.image_url ? `
                <div style="margin-bottom: 12px; cursor: pointer;" onclick="openPostModal('${post.id}')">
                    <img src="${post.image_url}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 12px;">
                </div>
            ` : ''}
            
            <div style="display: flex; gap: 24px; border-top: 1px solid #e7e5e4; padding-top: 12px;">
                <button class="like-btn" data-post-id="${post.id}" data-liked="${post.isLiked}" 
                        style="background: none; border: none; display: flex; align-items: center; gap: 6px; color: ${post.isLiked ? '#ef4444' : '#57534e'}; cursor: pointer;">
                    <i class="${post.isLiked ? 'fas' : 'far'} fa-heart"></i>
                    <span class="like-count">${post.likes_count || 0}</span>
                </button>
                <button class="comment-btn" data-post-id="${post.id}" 
                        style="background: none; border: none; display: flex; align-items: center; gap: 6px; color: #57534e; cursor: pointer;">
                    <i class="far fa-comment"></i>
                    <span>${post.comments_count || 0}</span>
                </button>
            </div>
        </div>
    `).join('');

    // Attach like listeners
    attachLikeListeners();
}

// ========== LIKE FUNCTION ==========
function attachLikeListeners() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            
            const postId = this.dataset.postId;
            const isLiked = this.dataset.liked === 'true';
            const icon = this.querySelector('i');
            const countSpan = this.querySelector('.like-count');
            let count = parseInt(countSpan.textContent);
            
            try {
                if (isLiked) {
                    // Unlike
                    await window.supabase
                        .from('likes')
                        .delete()
                        .eq('user_id', currentUser.id)
                        .eq('post_id', postId);
                    
                    icon.classList.remove('fas');
                    icon.classList.add('far');
                    this.style.color = '#57534e';
                    countSpan.textContent = count - 1;
                    this.dataset.liked = 'false';
                } else {
                    // Like
                    await window.supabase
                        .from('likes')
                        .insert({
                            user_id: currentUser.id,
                            post_id: postId
                        });
                    
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                    this.style.color = '#ef4444';
                    countSpan.textContent = count + 1;
                    this.dataset.liked = 'true';
                }
            } catch (error) {
                console.error('Gagal like/unlike:', error);
            }
        });
    });
    
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = btn.dataset.postId;
            openPostModal(postId);
        });
    });
}

// ========== NAVIGASI HALAMAN ==========
window.showPage = function(pageId) {
    document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
    document.getElementById(`page-${pageId}`).style.display = 'block';
    
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
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Memuat...</p></div>';
    
    try {
        const { data, error } = await window.supabase
            .from('notifications')
            .select(`
                *,
                sender:profiles!sender_id (full_name, avatar_url)
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #78716c; padding: 40px;">Belum ada notifikasi</p>';
            return;
        }
        
        container.innerHTML = data.map(notif => `
            <div class="notification-item">
                <img src="${notif.sender?.avatar_url || 'https://ui-avatars.com/api/?name=' + (notif.sender?.full_name || 'User')}" 
                     style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <div>
                    <p><b>${notif.sender?.full_name || 'Seseorang'}</b> ${getNotifText(notif.type)}</p>
                    <small style="color: #78716c;">${formatDate(notif.created_at)}</small>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = '<p style="color: red; text-align: center;">Gagal load notifikasi</p>';
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
window.loadUserProfile = async function(userId = null) {
    const targetUserId = userId || currentUser.id;
    
    try {
        // Load profile
        const { data: profile, error } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .single();
        
        if (error) throw error;
        
        document.getElementById('profileName').textContent = profile.full_name || 'User';
        document.getElementById('profileUsername').textContent = '@' + (profile.username || 'user');
        document.getElementById('profileBio').textContent = profile.bio || 'Halo! Aku pengguna ScrollOne 👋';
        document.getElementById('profileAvatar').src = profile.avatar_url || 'https://ui-avatars.com/api/?name=' + (profile.full_name || 'User');
        
        // Load followers count
        const { count: followers } = await window.supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', targetUserId);
        
        document.getElementById('followersCount').textContent = followers || 0;
        
        // Load following count
        const { count: following } = await window.supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', targetUserId);
        
        document.getElementById('followingCount').textContent = following || 0;
        
        // Load user posts
        await loadUserPosts(targetUserId);
        
        // Load liked posts
        await loadUserLikes(targetUserId);
        
        // Sembunyikan edit button jika bukan profil sendiri
        if (targetUserId !== currentUser.id) {
            document.getElementById('editProfileBtn').style.display = 'none';
        } else {
            document.getElementById('editProfileBtn').style.display = 'block';
        }
        
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
        <div class="post-thumbnail" onclick="openPostModal('${post.id}')">
            ${post.image_url ? 
                `<img src="${post.image_url}" style="width: 100%; height: 100%; object-fit: cover;">` : 
                `<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #e5e5e5;">📝</div>`
            }
        </div>
    `).join('');
}

async function loadUserLikes(userId) {
    const { data: likes, error } = await window.supabase
        .from('likes')
        .select(`
            post_id,
            posts (*)
        `)
        .eq('user_id', userId);
    
    if (error) return;
    
    const grid = document.getElementById('profileLikesGrid');
    const likedPosts = likes.map(l => l.posts).filter(p => p);
    
    grid.innerHTML = likedPosts.map(post => `
        <div class="post-thumbnail" onclick="openPostModal('${post.id}')">
            ${post.image_url ? 
                `<img src="${post.image_url}" style="width: 100%; height: 100%; object-fit: cover;">` : 
                `<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #e5e5e5;">📝</div>`
            }
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
        .limit(30);
    
    if (query) {
        queryBuilder = queryBuilder.ilike('content', `%${query}%`);
    }
    
    const { data: posts, error } = await queryBuilder;
    
    if (error) return;
    
    const container = document.getElementById('exploreFeed');
    container.innerHTML = posts.map(post => `
        <div class="explore-item" onclick="openPostModal('${post.id}')" style="cursor: pointer;">
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <img src="${post.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=' + (post.profiles?.full_name || 'User')}" 
                     style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                <b>${post.profiles?.full_name || 'User'}</b>
            </div>
            <p>${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</p>
            <small>❤️ ${post.likes_count || 0} · 💬 ${post.comments_count || 0}</small>
        </div>
    `).join('');
}

// ========== MODAL KOMENTAR ==========
window.openPostModal = async function(postId) {
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
            <img src="${post.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=' + (post.profiles?.full_name || 'User')}" 
                 style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
            <div>
                <b>${post.profiles?.full_name || 'User'}</b>
                <p style="margin-top: 4px;">${post.content}</p>
                ${post.image_url ? `<img src="${post.image_url}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-top: 8px;">` : ''}
            </div>
        </div>
    `;
    
    await loadComments(postId);
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
        .order('created_at', { ascending: true });
    
    const container = document.getElementById('commentsList');
    
    if (!comments || comments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #78716c;">Belum ada komentar</p>';
        return;
    }
    
    container.innerHTML = comments.map(c => `
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <img src="${c.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=' + (c.profiles?.full_name || 'User')}" 
                 style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
            <div>
                <b>${c.profiles?.full_name || 'User'}</b>
                <p style="font-size: 14px; margin: 2px 0 0;">${c.content}</p>
                <small style="color: #78716c;">${formatDate(c.created_at)}</small>
            </div>
        </div>
    `).join('');
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
        const { error } = await window.supabase
            .from('comments')
            .insert({
                user_id: currentUser.id,
                post_id: currentPostId,
                content: input.value
            });
        
        if (error) throw error;
        
        input.value = '';
        await loadComments(currentPostId);
        
        // Update comment count di post card
        const commentBtn = document.querySelector(`.comment-btn[data-post-id="${currentPostId}"] span`);
        if (commentBtn) {
            commentBtn.textContent = parseInt(commentBtn.textContent) + 1;
        }
        
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

// ========== DARK MODE ==========
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

// ========== LOGOUT ==========
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        window.logout();
    });
}

// ========== NAVIGASI ==========
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        showPage(page);
    });
});

// ========== INIT ==========
init();