const API_BASE = 'http://localhost:8080/v1';

document.addEventListener('DOMContentLoaded', () => {
    let isLogin = true;
    const authForm = document.getElementById('authForm');
    const authModal = document.getElementById('authModal');
    const signupFields = document.getElementById('signupFields');
    const switchLink = document.getElementById('switchAuth');

    // Toggle between Login and Driver Signup
    switchLink.onclick = (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        document.getElementById('authTitle').textContent = isLogin ? "Welcome back" : "Become a Driver";
        document.getElementById('authSubmit').textContent = isLogin ? "Login" : "Register as Driver";
        signupFields.hidden = isLogin;
        switchLink.textContent = isLogin ? "Create Driver Account" : "Login instead";
    };

    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('authSubmit');
        btn.disabled = true;

        const payload = {
            phone_number: document.getElementById('authPhone').value,
            password: document.getElementById('authPassword').value
        };

        if (!isLogin) {
            payload.first_name = document.getElementById('regFirst').value;
            payload.last_name = document.getElementById('regLast').value;
            payload.role = 'driver'; // Explicitly set as driver
        }

        try {
            const res = await fetch(`${API_BASE}/user/${isLogin ? 'login' : 'signup'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Auth failed");

            localStorage.setItem('access_token', result.access_token);
            localStorage.setItem('user_id', result.id);

            // Fetch full profile and go to profile.html
            const pRes = await fetch(`${API_BASE}/user/${result.id}`, {
                // headers: { 'Authorization': `Bearer ${result.access_token}` }
            });
            const pJson = await pRes.json();
            localStorage.setItem('user_profile', JSON.stringify(pJson));

            // const profileAvatar = document.getElementById('profileAvatar');
            // if (profileAvatar && pJson.data.profile_photo) {
            //     profileAvatar.src = pJson.data.profile_photo;
            // }

            window.location.href = 'profile.html';
        } catch (err) {
            const errEl = document.getElementById('authError');
            errEl.textContent = err.message;
            errEl.hidden = false;
            btn.disabled = false;
        }
    };

    document.getElementById('closeAuthModal').onclick = () => authModal.hidden = true;
});