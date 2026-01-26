(function () {
    const form = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const submitBtn = document.getElementById('submitBtn');
    const errorEl = document.getElementById('error');

    if (sessionStorage.getItem('cuub_user')) {
        window.location.href = '/dashboard';
        return;
    }

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.classList.add('visible');
    }

    function hideError() {
        errorEl.textContent = '';
        errorEl.classList.remove('visible');
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideError();
        const username = usernameInput.value.trim();
        if (!username) {
            showError('Please enter a username.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in…';

        try {
            const res = await fetch('/api/users');
            const json = await res.json();
            if (!json.success) {
                showError('Could not load users. Please try again.');
                return;
            }
            const list = Array.isArray(json.data)
                ? json.data
                : (json.data && Array.isArray(json.data.users) ? json.data.users : []);
            const user = list.find(function (u) {
                return (u.username || '').toLowerCase() === username.toLowerCase();
            });
            if (!user) {
                showError('No user found with that username.');
                return;
            }
            sessionStorage.setItem('cuub_user', JSON.stringify(user));
            window.location.href = '/dashboard';
        } catch (err) {
            console.error(err);
            showError('Something went wrong. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Log in';
        }
    });
})();
