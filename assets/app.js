const API_URL = 'http://localhost:8080/v1';

// --- 1. SESSION SAFETY GUARD ---
// Run this immediately before anything else
function validateSession() {
  const token = localStorage.getItem('access_token');
  const profileStr = localStorage.getItem('user_profile');

  // Function to force logout
  const forceLogout = () => {
    localStorage.clear();
    // Only redirect if they aren't already on the home page to avoid infinite loops
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
  };

  // If token exists but profile is missing/corrupted, logout
  if (token && (!profileStr || profileStr === "undefined")) {
    console.error("Session corrupted: Profile missing. Logging out...");
    forceLogout();
    return null;
  }

  try {
    return profileStr ? JSON.parse(profileStr) : null;
  } catch (e) {
    console.error("Session corrupted: Invalid JSON. Logging out...");
    forceLogout();
    return null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchBtn = document.getElementById('searchBtn');
  const resultsContainer = document.getElementById('results');
  const profileAvatar = document.getElementById('profileAvatar');
  const publishBtn = document.getElementById('publishRideBtn');
  const createRideForm = document.getElementById('createRideForm');
  const createRideModal = document.getElementById('createRideModal');
  const successOverlay = document.getElementById('successOverlay');

  // --- 2. INITIALIZE SESSION & UI ---
  const userProfile = validateSession();

  if (window.lucide) lucide.createIcons();

  // Set Avatar if user is logged in
  if (userProfile && profileAvatar) {
    profileAvatar.src = userProfile.profile_photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  }

  // --- 3. SEARCH LOGIC ---
  searchBtn?.addEventListener('click', async () => {
    const from = document.getElementById('from').value.trim();
    const to = document.getElementById('to').value.trim();

    document.getElementById('loading').hidden = false;
    resultsContainer.innerHTML = '';

    try {
      const res = await fetch(`${API_URL}/rides?from=${from}&to=${to}`);
      const json = await res.json();
      const rides = json.data?.rides || json.data || [];

      if (rides.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">No rides found.</p>';
      }

      rides.forEach(ride => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center">
                <div>
                    <strong>${ride.departure} → ${ride.destination}</strong>
                    <p style="margin:5px 0; color:var(--text-muted)">${new Date(ride.departure_time).toLocaleTimeString()}</p>
                </div>
                <span style="color:var(--primary); font-weight:bold;">${ride.price_per_seat.toLocaleString()} UZS</span>
            </div>`;
        card.onclick = () => showRideDetails(ride.id);
        resultsContainer.appendChild(card);
      });
    } catch (e) {
      console.error(e);
      alert("Failed to fetch rides.");
    } finally {
      document.getElementById('loading').hidden = true;
    }
  });

  // --- 4. PUBLISH RIDE LOGIC ---
  publishBtn.onclick = () => {
    const token = localStorage.getItem('access_token');

    // Re-validate profile right before publishing
    if (!token || !userProfile) {
      document.getElementById('authModal').hidden = false;
      return;
    }

    if (!userProfile.driver_profile) {
      alert("Please register your vehicle in your profile first.");
      window.location.href = 'profile.html';
      return;
    }

    const vSelect = document.getElementById('rideVehicle');
    if (vSelect) {
      vSelect.innerHTML = `<option value="${userProfile.id}">${userProfile.driver_profile.vehicle_model}</option>`;
    }
    createRideModal.hidden = false;
  };

  createRideForm.onsubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    const submitBtn = document.getElementById('submitRideBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = "Publishing...";

    const payload = {
      vehicle_id: "52f83035-421c-49fb-a80e-d3e09b3007e5", // Hardcoded per your requirement
      departure: document.getElementById('rideFrom').value,
      destination: document.getElementById('rideTo').value,
      departure_time: new Date(document.getElementById('rideTime').value).toISOString(),
      available_seats: parseInt(document.getElementById('rideSeats').value),
      price_per_seat: parseInt(document.getElementById('ridePrice').value),
      notes: "",
      allows_passengers: true,
      allows_delivery: false
    };

    try {
      const res = await fetch(`${API_URL}/ride`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        createRideModal.hidden = true;
        successOverlay.hidden = false;
      } else {
        alert("Could not post ride. Please check your inputs.");
      }
    } catch (err) {
      alert("Server error.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Publish Ride";
    }
  };

  // --- 5. DETAILED RIDE MODAL ---
  async function showRideDetails(id) {
    const modal = document.getElementById('rideDetailModal');
    const content = document.getElementById('rideDetailContent');
    modal.hidden = false;
    content.innerHTML = '<div style="text-align:center; padding:20px;">Gathering trip details...</div>';

    try {
      const res = await fetch(`${API_URL}/ride/${id}`);
      const json = await res.json();
      const r = json.data;
      const dr = r.driver_info;
      const vehicle = dr?.driver_profile;
      const dateObj = new Date(r.departure_time);

      content.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="margin: 0 0 5px 0; color: var(--text-main); font-size: 1.5rem;">${r.departure} → ${r.destination}</h2>
                <p style="color: var(--primary); font-weight: 700; margin: 0;">
                    ${dateObj.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })} at 
                    ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>

            <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: #f8fafc; border-radius: 16px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <img src="${dr.profile_photo || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" 
                     style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                <div>
                    <h3 style="margin: 0; font-size: 1.1rem;">${dr.first_name} ${dr.last_name}</h3>
                    <p style="margin: 2px 0 0; font-size: 0.85rem; color: var(--text-muted);">Verified Driver</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                <div style="padding: 12px; background: #fff; border: 1px solid #edf2f7; border-radius: 12px;">
                    <span style="display:block; font-size: 0.7rem; color: #64748b; font-weight: bold;">PRICE</span>
                    <span style="font-size: 1.1rem; color: #054752; font-weight: 800;">${r.price_per_seat.toLocaleString()} UZS</span>
                </div>
                <div style="padding: 12px; background: #fff; border: 1px solid #edf2f7; border-radius: 12px;">
                    <span style="display:block; font-size: 0.7rem; color: #64748b; font-weight: bold;">SEATS</span>
                    <span style="font-size: 1.1rem; font-weight: 700;">${r.available_seats} left</span>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px;">
                <a href="tel:${dr.phone_number}" class="btn" style="width: 100%; height: 52px; background: #22c55e; color: white; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: bold; border-radius: 14px;">
                    <i data-lucide="phone"></i> Call Driver
                </a>
                <button class="btn primary" style="width: 100%; height: 52px; border-radius: 14px; background: var(--primary); color: white; border: none; font-weight: bold;" onclick="alert('Booking confirmed!')">
                    Book Now
                </button>
            </div>
        `;

      if (window.lucide) lucide.createIcons();

    } catch (e) {
      content.innerHTML = '<p style="color:red; text-align:center;">Failed to load ride details.</p>';
    }
  }

  // Modal Closers
  document.getElementById('closeCreateModal').onclick = () => createRideModal.hidden = true;
  document.getElementById('closeDetailModal').onclick = () => document.getElementById('rideDetailModal').hidden = true;

  document.getElementById('profileBtn').onclick = () => {
    if (localStorage.getItem('access_token')) window.location.href = 'profile.html';
    else document.getElementById('authModal').hidden = false;
  };
});