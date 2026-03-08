const SUPABASE_CONFIG = {
    url: 'https://ruspdjqxaudsurkidhpp.supabase.co',
    anonKey: 'sb_publishable_SzzozLVq_vb_o28vP_XIoQ_bgLuiSMC'
};

window.supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

window.getCurrentUser = async function() {
    const { data: { user } } = await window.supabase.auth.getUser();
    return user;
}

window.getSession = async function() {
    const { data: { session } } = await window.supabase.auth.getSession();
    return session;
}

window.logout = async function() {
    const { error } = await window.supabase.auth.signOut();
    if (!error) window.location.href = 'login.html';
}