const API_BASE = 'http://localhost:8080/v1';

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user_profile') || '{}');
    const token = localStorage.getItem('access_token');

    if (!token) { window.location.href = 'index.html'; return; }
    if (window.lucide) lucide.createIcons();

    const saveBar = document.getElementById('saveBar');
    const saveBtn = document.getElementById('saveBtn');
    const editForm = document.getElementById('editRideForm');
    const updateTripBtn = document.getElementById('updateTripBtn');
    let rideToDeleteId = null;

    const showToast = (msg) => {
        const toast = document.getElementById('toast');
        document.getElementById('toastMsg').textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    const populateUI = () => {
        document.getElementById('headerName').textContent = `${user.first_name} ${user.last_name}`;
        document.getElementById('headerRole').textContent = user.role.toUpperCase();
        document.getElementById('avatarImg').src = user.profile_photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        document.getElementById('firstName').value = user.first_name || '';
        document.getElementById('lastName').value = user.last_name || '';
        document.getElementById('email').value = user.email || '';

        if (user.role === 'driver') {
            document.getElementById('driverSection').style.display = 'block';
            document.getElementById('driverStats').style.display = 'grid';
            if (user.driver_profile) {
                document.getElementById('vModel').value = user.driver_profile.vehicle_model || '';
                document.getElementById('vColor').value = user.driver_profile.vehicle_color || '';
                document.getElementById('vNumber').value = user.driver_profile.vehicle_number || '';
            }
            updateDashboardStats();
        }
    };
    populateUI();

    document.getElementById('profileForm').oninput = () => {
        saveBar.style.bottom = '40px';
    };

    window.toggleDrawer = (show, tab = 'active') => {
        document.getElementById('drawerOverlay').style.display = show ? 'flex' : 'none';
        if (show) fetchDriverRides(tab === 'active');
    };

    window.fetchDriverRides = async (isActive) => {
        const list = document.getElementById('ridesList');
        document.getElementById('tabActive').className = isActive ? 'btn primary' : 'btn';
        document.getElementById('tabPast').className = !isActive ? 'btn primary' : 'btn';
        list.innerHTML = '<p style="text-align:center; padding:30px; color:#94a3b8;">Loading trips...</p>';

        try {
            const res = await fetch(`${API_BASE}/rides?driverId=${user.id}${isActive ? '&onlyActive=true' : ''}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            const rides = json.data?.rides || json.data || [];

            list.innerHTML = rides.length ? rides.map(r => `
                <div style="background:#f8fafc; padding:20px; border-radius:24px; border:1px solid #edf2f7; margin-bottom:15px;">
                    <div style="font-weight:800; font-size:1.05rem;">${r.departure} → ${r.destination}</div>
                    <div style="font-size:0.8rem; color:#64748b; margin-top:6px;">${new Date(r.departure_time).toLocaleString()}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:18px;">
                        <span style="font-weight:800; color:var(--accent-blue); font-size:1.1rem;">${r.price_per_seat.toLocaleString()} UZS</span>
                        ${isActive ? `
                            <div style="display:flex; gap:10px;">
                                <button onclick="openFullEdit('${r.id}')" class="btn primary" style="width:auto; padding:8px 18px; font-size:0.85rem;">Edit</button>
                                <button onclick="openDeleteConfirm('${r.id}')" class="btn-icon-danger"><i data-lucide="trash-2" style="width:18px;"></i></button>
                            </div>
                        ` : '<span style="color:#22c55e; font-weight:800; font-size:0.75rem;">COMPLETED</span>'}
                    </div>
                </div>
            `).join('') : '<p style="text-align:center; padding:40px; color:#94a3b8;">No trips found.</p>';
            if (window.lucide) lucide.createIcons();
        } catch (e) { list.innerHTML = 'Error loading.'; }
    };

    window.openFullEdit = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/ride/${id}`);
            const json = await res.json();
            const r = json.data;
            document.getElementById('editRideId').value = r.id;
            document.getElementById('editFrom').value = r.departure;
            document.getElementById('editTo').value = r.destination;
            document.getElementById('editPrice').value = r.price_per_seat;
            document.getElementById('editSeats').value = r.available_seats;
            const d = new Date(r.departure_time);
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            document.getElementById('editTime').value = d.toISOString().slice(0, 16);
            document.getElementById('editRideOverlay').style.display = 'flex';
        } catch (e) { showToast("Error loading trip"); }
    };

    window.closeEditModal = () => document.getElementById('editRideOverlay').style.display = 'none';

    editForm.onsubmit = async (e) => {
        e.preventDefault();
        updateTripBtn.disabled = true;
        updateTripBtn.textContent = "Updating...";

        const payload = {
            departure: document.getElementById('editFrom').value,
            destination: document.getElementById('editTo').value,
            departure_time: new Date(document.getElementById('editTime').value).toISOString(),
            price_per_seat: parseInt(document.getElementById('editPrice').value),
            available_seats: parseInt(document.getElementById('editSeats').value)
        };

        const res = await fetch(`${API_BASE}/ride/${document.getElementById('editRideId').value}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeEditModal();
            showToast("Journey updated!");
            fetchDriverRides(true);
            updateDashboardStats();
        }
        updateTripBtn.disabled = false;
        updateTripBtn.textContent = "Save Changes";
    };

    window.openDeleteConfirm = (id) => {
        rideToDeleteId = id;
        document.getElementById('deleteModalOverlay').style.display = 'flex';
    };

    window.closeDeleteModal = () => {
        document.getElementById('deleteModalOverlay').style.display = 'none';
        rideToDeleteId = null;
    };

    document.getElementById('confirmDeleteBtn').onclick = async () => {
        const btn = document.getElementById('confirmDeleteBtn');
        btn.disabled = true;
        btn.textContent = "Deleting...";
        const res = await fetch(`${API_BASE}/ride/${rideToDeleteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            closeDeleteModal();
            showToast("Journey cancelled.");
            fetchDriverRides(true);
            updateDashboardStats();
        }
        btn.disabled = false;
        btn.textContent = "Yes, Cancel";
    };

    saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        const payload = {
            id: user.id,
            phone_number: user.phone_number,
            first_name: document.getElementById('firstName').value,
            last_name: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            driver_profile: user.role === 'driver' ? {
                vehicle_model: document.getElementById('vModel').value,
                vehicle_color: document.getElementById('vColor').value,
                vehicle_number: document.getElementById('vNumber').value
            } : undefined
        };

        try {
            // 1. Update the user
            const res = await fetch(`${API_BASE}/user`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const result = await res.json();
                // result is the JSON object you provided in the prompt

                // 2. Fetch fresh data using the ID from the update response
                const pRes = await fetch(`${API_BASE}/user/${result.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (pRes.ok) {
                    const freshData = await pRes.json();

                    // 3. Update localStorage and local memory
                    // 'freshData.data' is used if your GET wrapper returns {data: {...}}
                    // If the GET returns the object directly, use 'freshData'
                    const updatedUser = freshData.data || freshData;

                    localStorage.setItem('user_profile', JSON.stringify(updatedUser));

                    // Update the 'user' variable globally in this file
                    Object.assign(user, updatedUser);

                    // 4. Update UI visuals
                    saveBar.style.bottom = '-100px';
                    showToast("Successfully updated");
                    populateUI();
                }
            } else {
                showToast("Update failed. Check your inputs.");
            }
        } catch (e) {
            console.error("Critical Sync Error:", e);
            showToast("Server communication error.");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Profile";
        }
    };

    async function updateDashboardStats() {
        try {
            const res = await fetch(`${API_BASE}/rides?driverId=${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const json = await res.json();
            const rides = json.data?.rides || json.data || [];
            const active = rides.filter(r => r.is_active).length;
            document.getElementById('activeRidesCount').textContent = active;
            document.getElementById('totalRidesCount').textContent = rides.length - active;
        } catch (e) { }
    }
});