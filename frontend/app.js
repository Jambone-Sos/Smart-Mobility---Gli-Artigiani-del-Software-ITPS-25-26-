/* ================================================================
   SMART Mobility — app.js  v3  (JWT auth + Lime-inspired UI)
   ================================================================ */

/* ── 1. CONFIGURAZIONE ─────────────────────────────────────────── */
var API_BASE = 'http://localhost:3000/api';

var MAP_TILES = {
    satellite: [
        {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            opts: { attribution: '© Esri · Earthstar Geographics', maxZoom: 20 }
        },
        {
            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            opts: { maxZoom: 20, opacity: 0.75 }
        }
    ],
    dark: [
        {
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            opts: { attribution: '© OpenStreetMap © CARTO', maxZoom: 20, subdomains: 'abcd' }
        }
    ],
    light: [
        {
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            opts: { attribution: '© OpenStreetMap © CARTO', maxZoom: 20, subdomains: 'abcd' }
        }
    ]
};

var MAP_STYLE_LABELS = { satellite: 'Satellite', dark: 'Scuro', light: 'Chiaro' };

var state = {
    user: null,
    token: null,   /* JWT Bearer Token (IFC-01) */
    vehicles: [],
    map: null,
    markers: [],
    tileLayers: [],
    mapStyle: 'satellite',
    mapPickerInit: false,
    bookingTimerInterval: null,
    rideTimerInterval: null,
    vehicleFilter: 'all',
    filterPanelOpen: false,
    sidebarOpen: false,
    selectedRating: 0,
    chatPollingInterval: null,
    activeAdminChat: null
};

/* ── 2. HELPER HEADERS ─────────────────────────────────────────── */
function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + state.token
    };
}

/* ── 3. INIT ────────────────────────────────────────────────────── */
function initApp() {

    /* Auth */
    document.getElementById('tab-login').addEventListener('click', function () { switchAuthTab('login'); });
    document.getElementById('tab-register').addEventListener('click', function () { switchAuthTab('register'); });
    document.getElementById('form-login').addEventListener('submit', function (e) { e.preventDefault(); handleLogin(); });
    document.getElementById('form-register').addEventListener('submit', function (e) { e.preventDefault(); handleRegister(); });

    /* Anteprima nome file scelto */
    document.getElementById('register-doc').addEventListener('change', function () {
        document.getElementById('file-label-text').textContent =
            this.files[0] ? this.files[0].name : 'Documento d\'identità *';
    });

    /* Sidebar */
    document.getElementById('btn-sidebar-toggle').addEventListener('click', openSidebar);
    document.getElementById('btn-close-sidebar').addEventListener('click', closeSidebar);
    document.getElementById('sidebar-backdrop').addEventListener('click', closeSidebar);

    /* Navigazione sezioni sidebar */
    document.querySelectorAll('.sb-nav-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { switchSidebarSection(this.dataset.section); });
    });

    /* Filtro veicoli */
    document.getElementById('btn-vehicle-filter').addEventListener('click', toggleFilterPanel);
    document.querySelectorAll('.filter-chip').forEach(function (chip) {
        chip.addEventListener('click', function () { selectVehicleFilter(this.dataset.type, this.textContent.trim()); });
    });

    /* Prenotazione / Corsa */
    document.getElementById('btn-cancel').addEventListener('click', handleCancelBooking);
    document.getElementById('btn-unlock').addEventListener('click', handleUnlockVehicle);
    document.getElementById('btn-end-ride').addEventListener('click', handleEndRide);

    /* Dashboard sidebar */
    document.getElementById('btn-recharge').addEventListener('click', handleRecharge);
    document.getElementById('btn-apply-promo').addEventListener('click', handlePromo);
    document.getElementById('btn-load-history').addEventListener('click', loadHistory);
    document.getElementById('btn-send-chat').addEventListener('click', handleUserChatSend);
    document.getElementById('btn-send-rating').addEventListener('click', handleRating);
    document.getElementById('btn-sos').addEventListener('click', handleSOS);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    /* Admin Chat */
    document.getElementById('btn-admin-refresh-chats').addEventListener('click', loadAdminChats);
    document.getElementById('btn-admin-send-chat').addEventListener('click', handleAdminChatReply);
    document.getElementById('btn-admin-close-chat').addEventListener('click', handleAdminChatClose);

    /* Stelle valutazione interattive */
    initStarRating();
}

/* Esegui subito se il DOM è già pronto, altrimenti aspetta */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

/* ── 4. AUTH ────────────────────────────────────────────────────── */
function switchAuthTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('form-login').style.display = tab === 'login' ? 'flex' : 'none';
    document.getElementById('form-register').style.display = tab === 'register' ? 'flex' : 'none';
    document.getElementById('auth-feedback').textContent = '';
}

function showAuthError(msg) {
    document.getElementById('auth-feedback').textContent = msg;
}

async function handleLogin() {
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    if (!email || !password) return showAuthError('Email e password sono obbligatori');
    try {
        var res = await fetch(API_BASE + '/utenti/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });
        var data = await res.json();
        if (res.ok) { 
            state.user = data.user; 
            state.token = data.token; 
            showApp(); 
            if (data.emailPreviewUrl) {
                setTimeout(function() {
                    if(confirm("L'email di avviso login è stata generata! Vuoi aprirla nel browser per vederla?")) {
                        window.open(data.emailPreviewUrl, '_blank');
                    }
                }, 300);
            }
        }
        else showAuthError(data.error || 'Errore di login');
    } catch (e) { showAuthError('Errore di rete: il backend è attivo?'); }
}

async function handleRegister() {
    var username = document.getElementById('register-username').value.trim();
    var nome = document.getElementById('register-nome').value.trim();
    var cognome = document.getElementById('register-cognome').value.trim();
    var email = document.getElementById('register-email').value.trim();
    var password = document.getElementById('register-password').value;
    var docFile = document.getElementById('register-doc').files[0];

    if (!username) return showAuthError('Inserisci un username');
    if (!nome) return showAuthError('Inserisci un nome');
    if (!email) return showAuthError('Inserisci una email');
    if (!password || password.length < 6) return showAuthError('La password deve essere di almeno 6 caratteri');
    if (!docFile) return showAuthError('Inserisci il documento d\'identità');

    var formData = new FormData();
    formData.append('username', username);
    formData.append('nome', nome);
    if (cognome) formData.append('cognome', cognome);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('documento', docFile);

    try {
        var res = await fetch(API_BASE + '/utenti/registrazione', { method: 'POST', body: formData });
        var data = await res.json();
        if (res.ok) { 
            state.user = data.user; 
            state.token = data.token; 
            showApp(); 
            if (data.emailPreviewUrl) {
                setTimeout(function() {
                    if(confirm("L'email di benvenuto è stata generata! Vuoi aprirla nel browser per vederla?")) {
                        window.open(data.emailPreviewUrl, '_blank');
                    }
                }, 300);
            }
        }
        else showAuthError(data.error || 'Errore durante la registrazione');
    } catch (e) { showAuthError('Errore di rete: il backend è attivo?'); }
}

function handleLogout() {
    state.user  = null;
    state.token = null;
    clearInterval(state.bookingTimerInterval);
    clearInterval(state.rideTimerInterval);
    clearInterval(state.chatPollingInterval);
    closeSidebar();
    document.getElementById('app-screen').style.display  = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
}

/* ── 5. SHOW APP ────────────────────────────────────────────────── */
function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    initMap();
    initMapStylePicker();
    loadVehicles();
    updateTopBar();
    updateSidebar();
    syncBottomPanels();
    loadHistory();
}

/* ── 6. MAPPA + STILI ───────────────────────────────────────────── */
function initMap() {
    if (state.map) return;

    state.map = L.map('map', {
        zoomControl: false,
        attributionControl: true
    }).setView([41.1171, 16.8719], 16);

    setMapStyle('satellite');

    L.control.zoom({ position: 'bottomright' }).addTo(state.map);
    state.map.on('zoomend', drawMarkers);
}

function setMapStyle(style) {
    state.tileLayers.forEach(function (l) { state.map.removeLayer(l); });
    state.tileLayers = [];

    MAP_TILES[style].forEach(function (def) {
        state.tileLayers.push(L.tileLayer(def.url, def.opts).addTo(state.map));
    });

    state.mapStyle = style;

    document.querySelectorAll('.msp-option').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.style === style);
    });
    var lbl = document.getElementById('msp-label');
    if (lbl) lbl.textContent = MAP_STYLE_LABELS[style];
}

function initMapStylePicker() {
    if (state.mapPickerInit) return;
    state.mapPickerInit = true;

    var picker = document.getElementById('map-style-picker');
    var panel = document.getElementById('msp-panel');
    var toggle = document.getElementById('btn-map-style');

    picker.classList.remove('hidden');

    toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        panel.classList.toggle('hidden');
    });

    document.querySelectorAll('.msp-option').forEach(function (btn) {
        btn.addEventListener('click', function () {
            setMapStyle(this.dataset.style);
            panel.classList.add('hidden');
        });
    });

    document.addEventListener('click', function (e) {
        if (!picker.contains(e.target)) panel.classList.add('hidden');
    });
}

/* ── 7. MARKER ZOOM-DIPENDENTI ──────────────────────────────────── */
function getVehicleColor(tipo) {
    if (tipo.includes('Monopattino')) return '#00C566';
    if (tipo.includes('Bicicletta Elettrica')) return '#0A84FF';
    if (tipo.includes('Bicicletta')) return '#34C759';
    if (tipo.includes('Scooter')) return '#FF9F0A';
    return '#00C566';
}
function getVehicleEmoji(tipo) {
    if (tipo.includes('Monopattino')) return '🛴';
    if (tipo.includes('Bicicletta')) return '🚲';
    if (tipo.includes('Scooter')) return '🛵';
    return '🛴';
}

function buildMarkerIcon(vehicle) {
    var zoom = state.map ? state.map.getZoom() : 15;
    var color = getVehicleColor(vehicle.tipo);

    if (zoom < 15) {
        var sz = zoom < 13 ? 9 : 12;
        return L.divIcon({
            className: '',
            html: '<div class="v-dot pulse" style="width:' + sz + 'px;height:' + sz + 'px;background:' + color + '"></div>',
            iconSize: [sz, sz],
            iconAnchor: [sz / 2, sz / 2]
        });
    } else {
        var emoji = getVehicleEmoji(vehicle.tipo);
        var size = zoom >= 17 ? 46 : 40;
        return L.divIcon({
            className: '',
            html: '<div class="v-icon" style="width:' + size + 'px;height:' + size + 'px;background:' + color + '">' + emoji + '</div>',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        });
    }
}

function batteryColor(pct) {
    if (pct >= 60) return '#34C759';
    if (pct >= 30) return '#FF9F0A';
    return '#FF3B30';
}

async function loadVehicles() {
    try {
        var res = await fetch(API_BASE + '/mezzi', { headers: authHeaders() });
        var data = await res.json();
        if (res.status === 401) { handleLogout(); return; }
        state.vehicles = data.mezzi;
        drawMarkers();
    } catch (e) { console.error('Errore caricamento veicoli:', e); }
}

function drawMarkers() {
    state.markers.forEach(function (m) { state.map.removeLayer(m); });
    state.markers = [];

    state.vehicles.forEach(function (v) {
        if (v.stato !== 'disponibile') return;

        if (state.vehicleFilter !== 'all' && !v.tipo.includes(state.vehicleFilter)) return;

        var marker = L.marker([v.lat, v.lng], { icon: buildMarkerIcon(v) }).addTo(state.map);

        var battPct = v.batteria + '%';
        var battClr = batteryColor(v.batteria);
        marker.bindPopup(
            '<h4>' + v.tipo + '</h4>' +
            '<p class="popup-meta">🔋 ' + v.batteria + '% &nbsp;·&nbsp; 💶 €' + parseFloat(v.tariffa).toFixed(2) + '/min</p>' +
            '<div class="batt-bg"><div class="batt-fill" style="width:' + battPct + ';background:' + battClr + '"></div></div>' +
            '<button class="popup-book-btn" onclick="bookVehicle(\'' + v.id + '\')">Prenota ora</button>',
            { maxWidth: 200, className: '' }
        );

        state.markers.push(marker);
    });
}

/* ── 8. SIDEBAR ─────────────────────────────────────────────────── */
function openSidebar() {
    state.sidebarOpen = true;
    document.getElementById('left-sidebar').classList.add('open');
    document.getElementById('sidebar-backdrop').classList.add('visible');
    updateSidebar();
    loadHistory();
}

function closeSidebar() {
    state.sidebarOpen = false;
    document.getElementById('left-sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('visible');
}

function switchSidebarSection(section) {
    document.querySelectorAll('.sb-nav-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.section === section);
    });
    document.querySelectorAll('.sb-section').forEach(function (s) {
        s.classList.toggle('active', s.id === 'section-' + section);
    });

    clearInterval(state.chatPollingInterval);

    if (section === 'storico') loadHistory();
    else if (section === 'assistenza') {
        loadUserChat();
        state.chatPollingInterval = setInterval(loadUserChat, 3000);
    }
    else if (section === 'admin') {
        loadAdminChats();
        if (state.activeAdminChat) {
            state.chatPollingInterval = setInterval(loadAdminChatMessages, 3000);
        }
    }
}

function updateTopBar() {
    if (!state.user) return;
    document.getElementById('top-avatar').textContent = state.user.nome.charAt(0).toUpperCase();
}

function updateSidebar() {
    if (!state.user) return;
    document.getElementById('sb-avatar').textContent = state.user.nome.charAt(0).toUpperCase();
    document.getElementById('sb-greeting').textContent = 'Ciao, ' + state.user.nome + '!';
    document.getElementById('sb-saldo').textContent = '€ ' + parseFloat(state.user.saldo).toFixed(2);

    if (state.user.ruolo === 'admin') {
        document.getElementById('nav-btn-admin').style.display = 'flex';
    } else {
        document.getElementById('nav-btn-admin').style.display = 'none';
    }

    updateStats();
}

function updateStats() {
    if (!state.user) return;
    var corse = state.user.storicoCorse || [];
    var totMin = corse.reduce(function (s, c) { return s + (parseInt(c.minuti) || 0); }, 0);
    var kmStimati = Math.round(totMin / 60 * 15 * 10) / 10;
    document.getElementById('stat-corse').textContent = corse.length;
    document.getElementById('stat-km').textContent = kmStimati % 1 === 0 ? kmStimati : kmStimati.toFixed(1);
}

/* ── 9. FILTRO VEICOLI ──────────────────────────────────────────── */
function toggleFilterPanel() {
    state.filterPanelOpen = !state.filterPanelOpen;
    document.getElementById('vehicle-filter-panel').classList.toggle('open', state.filterPanelOpen);
    document.getElementById('filter-chevron').classList.toggle('open', state.filterPanelOpen);
}

function selectVehicleFilter(type, label) {
    state.vehicleFilter = type;
    document.querySelectorAll('.filter-chip').forEach(function (c) {
        c.classList.toggle('active', c.dataset.type === type);
    });
    var shortLabel = label.replace(/^[^\s]+\s/, '');
    document.getElementById('filter-label-text').textContent = shortLabel;
    drawMarkers();
    toggleFilterPanel();
}

/* ── 10. PRENOTAZIONE ───────────────────────────────────────────── */
window.bookVehicle = async function (vehicleId) {
    if (!state.user || state.user.stato !== 'libero') {
        return showToast('Hai già una prenotazione o corsa attiva');
    }
    try {
        var res = await fetch(API_BASE + '/prenotazioni', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ userId: state.user.id, vehicleId: vehicleId })
        });
        var data = await res.json();
        if (res.ok) {
            state.user.stato = 'prenotato';
            state.user.prenotazioneAttuale = data.idPrenotazione;
            state.map.closePopup();
            loadVehicles();
            syncBottomPanels();
            showToast('Mezzo prenotato!' + (state.user.email ? ' Controlla la tua email.' : ''));
        } else {
            showToast(data.error);
        }
    } catch (e) { showToast('Errore di rete'); }
};

async function handleCancelBooking() {
    try {
        var res = await fetch(API_BASE + '/prenotazioni/annulla', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ userId: state.user.id })
        });
        if (res.ok) {
            state.user.stato = 'libero';
            state.user.prenotazioneAttuale = null;
            clearInterval(state.bookingTimerInterval);
            syncBottomPanels();
            loadVehicles();
            showToast('Prenotazione annullata');
        }
    } catch (e) { showToast('Errore di rete'); }
}

/* ── 11. CORSA ──────────────────────────────────────────────────── */
async function handleUnlockVehicle() {
    try {
        var res = await fetch(API_BASE + '/corse/sblocco', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ userId: state.user.id })
        });
        var data = await res.json();
        if (res.ok) {
            clearInterval(state.bookingTimerInterval);
            state.user.stato = 'in_corsa';
            state.user.prenotazioneAttuale = null;
            state.user.corsaAttuale = data.idCorsa;
            syncBottomPanels();
            showToast('Mezzo sbloccato! Buona corsa 🛴');
        } else { showToast(data.error); }
    } catch (e) { showToast('Errore di rete'); }
}

async function handleEndRide() {
    try {
        var res = await fetch(API_BASE + '/corse/termine', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ userId: state.user.id })
        });
        var data = await res.json();
        if (res.ok) {
            clearInterval(state.rideTimerInterval);
            state.user.stato = 'libero';
            state.user.corsaAttuale = null;
            state.user.saldo = parseFloat(data.nuovoSaldo);

            updateSidebar();
            syncBottomPanels();
            loadVehicles();

            showToast('Corsa terminata — €' + data.costoFinale);
            setTimeout(function () {
                alert('Corsa Terminata!\nDurata: ' + data.minuti + ' min\nCosto: €' + data.costoFinale + '\nNuovo saldo: €' + data.nuovoSaldo);
            }, 300);
        } else { showToast(data.error); }
    } catch (e) { showToast('Errore di rete'); }
}

/* ── 12. PANNELLI BOTTOM ────────────────────────────────────────── */
function syncBottomPanels() {
    var bp = document.getElementById('booking-panel');
    var rp = document.getElementById('ride-panel');
    bp.classList.add('hidden');
    rp.classList.add('hidden');

    if (!state.user) return;

    if (state.user.stato === 'prenotato') {
        document.getElementById('booking-info').textContent = state.user.prenotazioneAttuale || '';
        bp.classList.remove('hidden');
        startBookingTimer(10 * 60);
    } else if (state.user.stato === 'in_corsa') {
        document.getElementById('ride-info').textContent = 'Corsa: ' + (state.user.corsaAttuale || '');
        rp.classList.remove('hidden');
        startRideTimer();
    }
}

/* ── 13. DASHBOARD SIDEBAR ──────────────────────────────────────── */
async function handleRecharge() {
    var importo = parseFloat(document.getElementById('input-importo').value);
    if (!importo || importo <= 0) return showToast('Inserisci un importo valido');

    try {
        var res = await fetch(API_BASE + '/utenti/ricarica', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ idUtente: state.user.id, importo: importo })
        });
        var data = await res.json();

        if (res.ok) {
            state.user.saldo = data.nuovoSaldo;
            updateSidebar();
            document.getElementById('input-importo').value = '';
            showToast('Ricaricati €' + importo);
        } else {
            showToast(data.error || 'Errore ricarica');
        }
    } catch (e) { showToast('Errore di rete'); }
}

async function handlePromo() {
    var codice = document.getElementById('input-promo').value.trim();
    if (!codice) return showToast('Inserisci un codice promo');
    try {
        var res = await fetch(API_BASE + '/utenti/promozioni', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ userId: state.user.id, codice: codice })
        });
        var data = await res.json();
        showToast(data.messaggio);
        document.getElementById('input-promo').value = '';
    } catch (e) { showToast('Errore di rete'); }
}

async function loadHistory() {
    if (!state.user || !state.token) return;
    try {
        var res = await fetch(API_BASE + '/utenti/' + state.user.id + '/storico-corse', {
            headers: authHeaders()
        });
        var data = await res.json();

        var list = document.getElementById('history-list');
        if (res.ok && data.corse && data.corse.length > 0) {
            list.innerHTML = '';
            data.corse.slice().reverse().forEach(function (c) {
                var li = document.createElement('li');
                li.className = 'sb-history-item';
                li.innerHTML =
                    '<div class="sb-history-meta">' +
                    '<span class="sb-history-date">' + c.data + '</span>' +
                    '<span class="sb-history-details">' + (c.tipoVeicolo || '') + ' · ' + c.minuti + ' min</span>' +
                    '</div>' +
                    '<span class="sb-history-cost">€' + c.costo + '</span>';
                list.appendChild(li);
            });
            state.user.storicoCorse = data.corse;
            updateStats();
        } else {
            list.innerHTML = '<li class="sb-history-empty">Nessuna corsa effettuata.</li>';
        }
    } catch (e) { console.error('Errore storico:', e); }
}

async function loadUserChat() {
    try {
        var res = await fetch(API_BASE + '/supporto/chat', { headers: authHeaders() });
        var data = await res.json();
        var container = document.getElementById('chat-messages');
        if (data.messaggi && data.messaggi.length > 0) {
            container.innerHTML = '';
            data.messaggi.forEach(function (msg) {
                var isMe = msg.mittente === state.user.id;
                var align = isMe ? 'flex-end' : 'flex-start';
                var bg = isMe ? '#00C566' : '#e9ecef';
                var color = isMe ? '#fff' : '#000';
                container.innerHTML += '<div style="align-self: ' + align + '; background: ' + bg + '; color: ' + color + '; padding: 8px 12px; border-radius: 12px; max-width: 80%; word-wrap: break-word;">' + msg.messaggio + '</div>';
            });
            container.scrollTop = container.scrollHeight;
        } else {
            container.innerHTML = '<p style="font-size: 0.85rem; color: #999; text-align: center;">Invia un messaggio per iniziare o attendi una risposta.</p>';
        }
    } catch (e) { }
}

async function handleUserChatSend() {
    var msg = document.getElementById('input-chat').value.trim();
    if (!msg) return;
    try {
        var res = await fetch(API_BASE + '/supporto/chat', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ messaggio: msg })
        });
        if (res.ok) {
            document.getElementById('input-chat').value = '';
            loadUserChat();
        }
    } catch (e) { showToast('Errore di rete'); }
}

async function loadAdminChats() {
    try {
        var res = await fetch(API_BASE + '/supporto/admin/chats', { headers: authHeaders() });
        var data = await res.json();
        var list = document.getElementById('admin-chat-list');
        list.innerHTML = '';
        if (data.sessions && data.sessions.length > 0) {
            data.sessions.forEach(function (s) {
                var li = document.createElement('li');
                li.className = 'sb-history-item';
                li.style.cursor = 'pointer';
                li.innerHTML = '<div class="sb-history-meta"><span class="sb-history-date">' + s.data_creazione + '</span><span class="sb-history-details">' + s.nome + ' (' + s.email + ')</span></div>';
                li.onclick = function () { openAdminChat(s.id, s.email); };
                list.appendChild(li);
            });
        } else {
            list.innerHTML = '<li class="sb-history-empty">Nessuna chat aperta.</li>';
        }
    } catch (e) { }
}

function openAdminChat(id, email) {
    state.activeAdminChat = id;
    document.getElementById('admin-chat-user-email').textContent = email;
    document.getElementById('admin-chat-view').style.display = 'flex';
    clearInterval(state.chatPollingInterval);
    loadAdminChatMessages();
    state.chatPollingInterval = setInterval(loadAdminChatMessages, 3000);
}

async function loadAdminChatMessages() {
    if (!state.activeAdminChat) return;
    try {
        var res = await fetch(API_BASE + '/supporto/admin/chats/' + state.activeAdminChat, { headers: authHeaders() });
        var data = await res.json();
        var container = document.getElementById('admin-chat-messages');
        container.innerHTML = '';
        if (data.messaggi) {
            data.messaggi.forEach(function (msg) {
                var isAdmin = msg.mittente === 'admin';
                var align = isAdmin ? 'flex-end' : 'flex-start';
                var bg = isAdmin ? '#00C566' : '#e9ecef';
                var color = isAdmin ? '#fff' : '#000';
                container.innerHTML += '<div style="align-self: ' + align + '; background: ' + bg + '; color: ' + color + '; padding: 8px 12px; border-radius: 12px; max-width: 80%; word-wrap: break-word;">' + msg.messaggio + '</div>';
            });
            container.scrollTop = container.scrollHeight;
        }
    } catch (e) { }
}

async function handleAdminChatReply() {
    if (!state.activeAdminChat) return;
    var msg = document.getElementById('admin-input-chat').value.trim();
    if (!msg) return;
    try {
        var res = await fetch(API_BASE + '/supporto/admin/chats/' + state.activeAdminChat + '/reply', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ messaggio: msg })
        });
        if (res.ok) {
            document.getElementById('admin-input-chat').value = '';
            loadAdminChatMessages();
        }
    } catch (e) { }
}

async function handleAdminChatClose() {
    if (!state.activeAdminChat) return;
    try {
        var res = await fetch(API_BASE + '/supporto/admin/chats/' + state.activeAdminChat + '/close', {
            method: 'POST',
            headers: authHeaders()
        });
        if (res.ok) {
            state.activeAdminChat = null;
            document.getElementById('admin-chat-view').style.display = 'none';
            clearInterval(state.chatPollingInterval);
            loadAdminChats();
            showToast('Chat chiusa con successo.');
        }
    } catch (e) { }
}

function initStarRating() {
    var stars = document.querySelectorAll('.star-btn');
    stars.forEach(function (btn) {
        btn.addEventListener('mouseenter', function () {
            var val = parseInt(this.dataset.star);
            stars.forEach(function (b) {
                var bv = parseInt(b.dataset.star);
                b.classList.toggle('hovered', bv <= val);
                b.classList.remove('active');
            });
        });
        btn.addEventListener('mouseleave', function () {
            stars.forEach(function (b) {
                b.classList.remove('hovered');
                b.classList.toggle('active', parseInt(b.dataset.star) <= state.selectedRating);
            });
        });
        btn.addEventListener('click', function () {
            state.selectedRating = parseInt(this.dataset.star);
            stars.forEach(function (b) {
                b.classList.toggle('active', parseInt(b.dataset.star) <= state.selectedRating);
            });
        });
    });
}

async function handleRating() {
    if (!state.selectedRating) return showToast('Seleziona un voto (1-5 stelle)');
    try {
        var res = await fetch(API_BASE + '/supporto/recensione', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ stelle: state.selectedRating })
        });
        var data = await res.json();
        showToast(data.messaggio);
        state.selectedRating = 0;
        document.querySelectorAll('.star-btn').forEach(function (b) { b.classList.remove('active'); });
    } catch (e) { showToast('Errore di rete'); }
}

async function handleSOS() {
    if (!confirm('Vuoi davvero inviare una chiamata di emergenza?')) return;
    try {
        var res = await fetch(API_BASE + '/supporto/sos', {
            method: 'POST',
            headers: authHeaders()
        });
        var data = await res.json();
        alert(data.messaggio);
    } catch (e) { alert('Errore rete in SOS!'); }
}

/* ── 14. TIMER ──────────────────────────────────────────────────── */
function startBookingTimer(secondsLeft) {
    clearInterval(state.bookingTimerInterval);
    var el = document.getElementById('booking-timer');

    state.bookingTimerInterval = setInterval(function () {
        secondsLeft--;
        if (secondsLeft <= 0) {
            handleCancelBooking();
            showToast('Prenotazione scaduta');
            return;
        }
        var m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
        var s = (secondsLeft % 60).toString().padStart(2, '0');
        el.textContent = m + ':' + s;
    }, 1000);
}

function startRideTimer() {
    clearInterval(state.rideTimerInterval);
    var el = document.getElementById('ride-timer');
    var sec = 0;

    state.rideTimerInterval = setInterval(function () {
        sec++;
        var m = Math.floor(sec / 60).toString().padStart(2, '0');
        var s = (sec % 60).toString().padStart(2, '0');
        el.textContent = m + ':' + s;
    }, 1000);
}

/* ── 15. TOAST ──────────────────────────────────────────────────── */
function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(showToast._tid);
    showToast._tid = setTimeout(function () { t.classList.add('hidden'); }, 3500);
}


