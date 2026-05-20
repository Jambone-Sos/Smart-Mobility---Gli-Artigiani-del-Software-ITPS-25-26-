/* =================================================================
   SMART Mobility — Motore JavaScript del Client (Sprint 1)
   -----------------------------------------------------------------
   Questo file gestisce tutta la logica del frontend tramite Vanilla JS.
   È organizzato in sezioni logiche che corrispondono ai servizi backend:

     1. CONFIGURAZIONE     — Costanti, stato applicazione, riferimenti DOM
     2. INIZIALIZZAZIONE   — Event listeners (DOMContentLoaded)
     3. GESTIONE UI        — Cambio vista, tabs, toast, aggiornamento profilo
     4. AUTENTICAZIONE     — Login, Registrazione, Logout (IF-UT.01)
     5. MAPPA E VEICOLI    — Leaflet, marker, popup (IF-UT.03 - IF-UT.05)
     6. PRENOTAZIONE       — Prenota, annulla, scadenza (IF-UT.07 - IF-UT.09)
     7. CORSA              — Sblocco, timer, termine e pagamento (IF-UT.18, IF-UT.11)
     8. DASHBOARD          — Ricarica, promo, storico, chat, SOS (IF-UT.02, 12-16)
     9. TIMER              — Countdown prenotazione e cronometro corsa
   ================================================================= */


/* =================================================================
   1. CONFIGURAZIONE
   ================================================================= */

/** Indirizzo base dell'API Gateway (backend) */
var API_BASE = 'http://localhost:3000/api';

/** Stato globale dell'applicazione lato client */
var state = {
    user: null,              // Oggetto utente corrente (dal backend)
    vehicles: [],            // Lista veicoli caricati dal backend
    map: null,               // Istanza della mappa Leaflet
    markers: [],             // Array dei marker Leaflet attivi
    bookingTimerInterval: null,  // ID del timer di scadenza prenotazione
    rideTimerInterval: null      // ID del timer della corsa attiva
};

/** Riferimenti agli elementi DOM principali */
var DOM = {
    // Schermate
    authScreen:    document.getElementById('auth-screen'),
    appScreen:     document.getElementById('app-screen'),
    // Profilo
    displayNome:   document.getElementById('display-nome'),
    displaySaldo:  document.getElementById('display-saldo'),
    // Viste
    viewMap:       document.getElementById('view-map'),
    viewDashboard: document.getElementById('view-dashboard'),
    // Nav
    navMap:        document.getElementById('nav-map'),
    navDashboard:  document.getElementById('nav-dashboard'),
    // Auth
    formLogin:     document.getElementById('form-login'),
    formRegister:  document.getElementById('form-register'),
    authFeedback:  document.getElementById('auth-feedback'),
    // Pannelli azione
    bookingPanel:  document.getElementById('booking-panel'),
    ridePanel:     document.getElementById('ride-panel'),
    // Toast
    toast:         document.getElementById('toast')
};


/* =================================================================
   2. INIZIALIZZAZIONE — Event Listeners
   ================================================================= */

document.addEventListener('DOMContentLoaded', function() {

    // --- Autenticazione ---
    document.getElementById('tab-login').addEventListener('click', function() { switchTab('login'); });
    document.getElementById('tab-register').addEventListener('click', function() { switchTab('register'); });
    DOM.formLogin.addEventListener('submit', function(e) { e.preventDefault(); handleLogin(); });
    DOM.formRegister.addEventListener('submit', function(e) { e.preventDefault(); handleRegister(); });
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // --- Navigazione tra Mappa e Area Personale ---
    DOM.navMap.addEventListener('click', function() { switchView('map'); });
    DOM.navDashboard.addEventListener('click', function() { switchView('dashboard'); });

    // --- Azioni Prenotazione e Corsa ---
    document.getElementById('btn-cancel').addEventListener('click', handleCancelBooking);
    document.getElementById('btn-unlock').addEventListener('click', handleUnlockVehicle);
    document.getElementById('btn-end-ride').addEventListener('click', handleEndRide);

    // --- Azioni Dashboard ---
    document.getElementById('btn-recharge').addEventListener('click', handleRecharge);
    document.getElementById('btn-apply-promo').addEventListener('click', handlePromo);
    document.getElementById('btn-load-history').addEventListener('click', loadHistory);
    document.getElementById('btn-send-chat').addEventListener('click', handleChat);
    document.getElementById('btn-send-rating').addEventListener('click', handleRating);
    document.getElementById('btn-sos').addEventListener('click', handleSOS);
});


/* =================================================================
   3. GESTIONE UI — Cambio vista, tabs, toast, profilo
   ================================================================= */

/**
 * Mostra un messaggio toast temporaneo (scompare dopo 4 secondi).
 * @param {string} msg - Il messaggio da mostrare.
 */
function showToast(msg) {
    DOM.toast.textContent = msg;
    DOM.toast.classList.remove('hidden');
    setTimeout(function() { DOM.toast.classList.add('hidden'); }, 4000);
}

/**
 * Mostra un errore nella schermata di autenticazione.
 * @param {string} msg - Il messaggio di errore.
 */
function showAuthError(msg) {
    DOM.authFeedback.textContent = msg;
    DOM.authFeedback.style.color = 'var(--color-danger)';
}

/**
 * Cambia tra il tab Login e il tab Registrazione.
 * @param {string} tab - 'login' oppure 'register'.
 */
function switchTab(tab) {
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) { tabs[i].classList.remove('active'); }

    if (tab === 'login') {
        document.getElementById('tab-login').classList.add('active');
        DOM.formLogin.style.display = 'flex';
        DOM.formRegister.style.display = 'none';
    } else {
        document.getElementById('tab-register').classList.add('active');
        DOM.formLogin.style.display = 'none';
        DOM.formRegister.style.display = 'flex';
    }
    DOM.authFeedback.textContent = '';
}

/**
 * Cambia la vista attiva tra Mappa e Area Personale.
 * @param {string} view - 'map' oppure 'dashboard'.
 */
function switchView(view) {
    if (view === 'map') {
        DOM.viewMap.style.display = 'block';
        DOM.viewDashboard.style.display = 'none';
        DOM.navMap.classList.add('active');
        DOM.navDashboard.classList.remove('active');
        // Leaflet ha bisogno di ricalcolare le dimensioni dopo display:none
        if (state.map) {
            setTimeout(function() { state.map.invalidateSize(); }, 100);
        }
    } else {
        DOM.viewMap.style.display = 'none';
        DOM.viewDashboard.style.display = 'block';
        DOM.navDashboard.classList.add('active');
        DOM.navMap.classList.remove('active');
        loadHistory(); // Aggiorna lo storico ogni volta che si entra
    }
}

/**
 * Aggiorna il nome e il saldo visualizzati nella barra profilo.
 */
function updateProfileUI() {
    if (!state.user) return;
    DOM.displayNome.textContent = state.user.nome;
    DOM.displaySaldo.textContent = '€ ' + state.user.saldo.toFixed(2);
}

/**
 * Nasconde la schermata auth, mostra l'app e inizializza la mappa.
 */
function showAppScreen() {
    DOM.authScreen.style.display = 'none';
    DOM.appScreen.style.display = 'block';
    initMap();
    loadVehicles();
    updateProfileUI();
    syncPanelsWithState();
    switchView('map');
}

/**
 * Sincronizza la visibilità dei pannelli flottanti (prenotazione/corsa)
 * con lo stato corrente dell'utente.
 */
function syncPanelsWithState() {
    // Nascondi entrambi
    DOM.bookingPanel.classList.add('hidden');
    DOM.ridePanel.classList.add('hidden');

    if (state.user.stato === 'prenotato') {
        document.getElementById('booking-info').textContent =
            'Prenotazione: ' + state.user.prenotazioneAttuale;
        DOM.bookingPanel.classList.remove('hidden');
        startBookingTimer(10 * 60); // 10 minuti
    } else if (state.user.stato === 'in_corsa') {
        document.getElementById('ride-info').textContent =
            'Corsa: ' + state.user.corsaAttuale;
        DOM.ridePanel.classList.remove('hidden');
        startRideTimer();
    }
}


/* =================================================================
   4. AUTENTICAZIONE — Login, Registrazione, Logout (IF-UT.01)
   ================================================================= */

/** Gestisce il Login dell'utente */
async function handleLogin() {
    var nome = document.getElementById('login-nome').value.trim();
    if (!nome) return showAuthError('Inserisci il nome utente');

    try {
        var res = await fetch(API_BASE + '/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome })
        });
        var data = await res.json();
        if (res.ok) {
            state.user = data.user;
            showAppScreen();
        } else {
            showAuthError(data.error || 'Errore di login');
        }
    } catch (e) {
        showAuthError('Errore di rete: il backend è attivo?');
    }
}

/** Gestisce la Registrazione di un nuovo utente */
async function handleRegister() {
    var nome = document.getElementById('register-nome').value.trim();
    if (!nome) return showAuthError('Inserisci un nome utente');

    try {
        var res = await fetch(API_BASE + '/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nome })
        });
        var data = await res.json();
        if (res.ok) {
            state.user = data.user;
            showAppScreen();
        } else {
            showAuthError('Errore durante la registrazione');
        }
    } catch (e) {
        showAuthError('Errore di rete: il backend è attivo?');
    }
}

/** Esegue il Logout e torna alla schermata di autenticazione */
function handleLogout() {
    state.user = null;
    clearInterval(state.bookingTimerInterval);
    clearInterval(state.rideTimerInterval);
    DOM.appScreen.style.display = 'none';
    DOM.authScreen.style.display = 'flex';
}


/* =================================================================
   5. MAPPA E VEICOLI — Leaflet (IF-UT.03 - IF-UT.05)
   ================================================================= */

/** Inizializza la mappa Leaflet centrata su Bari */
function initMap() {
    if (state.map) return; // Già inizializzata
    state.map = L.map('map', { zoomControl: false }).setView([41.1171, 16.8719], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(state.map);

    L.control.zoom({ position: 'bottomright' }).addTo(state.map);
}

/** Carica i veicoli disponibili dal backend e li disegna sulla mappa */
async function loadVehicles() {
    try {
        var res = await fetch(API_BASE + '/fleet/vehicles');
        var data = await res.json();
        state.vehicles = data.mezzi;
        drawMarkers();
    } catch (e) {
        console.error('Errore caricamento mezzi:', e);
    }
}

/** Disegna i marker dei veicoli disponibili sulla mappa */
function drawMarkers() {
    // Rimuovi i vecchi marker
    for (var i = 0; i < state.markers.length; i++) {
        state.map.removeLayer(state.markers[i]);
    }
    state.markers = [];

    state.vehicles.forEach(function(v) {
        if (v.stato !== 'disponibile') return; // Mostra solo quelli liberi

        // Colore del marker in base al tipo di veicolo
        var iconColor = v.tipo.indexOf('Bici') !== -1 ? '#10B981' : '#4F46E5';
        var icon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:' + iconColor + '; width:22px; height:22px; border-radius:50%; border:3px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });

        var marker = L.marker([v.lat, v.lng], { icon: icon }).addTo(state.map);

        // Popup con dettagli veicolo e bottone "Prenota"
        var popupHtml =
            '<div style="text-align:center;">' +
                '<h4>' + v.tipo + '</h4>' +
                '<p>🔋 Batteria: ' + v.batteria + '%<br>💰 Tariffa: €' + v.tariffa.toFixed(2) + '/min</p>' +
                '<button class="popup-book-btn" onclick="bookVehicle(\'' + v.id + '\')">Prenota Ora</button>' +
            '</div>';
        marker.bindPopup(popupHtml);
        state.markers.push(marker);
    });
}


/* =================================================================
   6. PRENOTAZIONE — Prenota, annulla, scadenza (IF-UT.07 - IF-UT.09)
   ================================================================= */

/**
 * Prenota un veicolo (chiamata dal popup Leaflet).
 * @param {string} vehicleId - L'ID del veicolo da prenotare.
 */
window.bookVehicle = async function(vehicleId) {
    if (state.user.stato !== 'libero') {
        return showToast('Hai già una prenotazione o corsa attiva');
    }

    try {
        var res = await fetch(API_BASE + '/booking/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id, vehicleId: vehicleId })
        });
        var data = await res.json();
        if (res.ok) {
            state.user.stato = 'prenotato';
            state.user.prenotazioneAttuale = data.idPrenotazione;
            state.map.closePopup();
            loadVehicles(); // Rimuove il mezzo dalla mappa
            syncPanelsWithState();
            showToast('Mezzo prenotato con successo!');
        } else {
            showToast(data.error);
        }
    } catch (e) {
        showToast('Errore di rete');
    }
};

/** Annulla la prenotazione attiva (IF-UT.08) */
async function handleCancelBooking() {
    try {
        var res = await fetch(API_BASE + '/booking/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id })
        });
        if (res.ok) {
            state.user.stato = 'libero';
            state.user.prenotazioneAttuale = null;
            clearInterval(state.bookingTimerInterval);
            syncPanelsWithState();
            loadVehicles(); // Rimette il mezzo sulla mappa
            showToast('Prenotazione annullata');
        }
    } catch (e) {
        showToast('Errore di rete');
    }
}


/* =================================================================
   7. CORSA — Sblocco, termine e pagamento (IF-UT.18, IF-UT.11)
   ================================================================= */

/** Sblocca il mezzo prenotato e avvia la corsa (IF-UT.18) */
async function handleUnlockVehicle() {
    try {
        var res = await fetch(API_BASE + '/ride/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id })
        });
        var data = await res.json();
        if (res.ok) {
            clearInterval(state.bookingTimerInterval);
            state.user.stato = 'in_corsa';
            state.user.prenotazioneAttuale = null;
            state.user.corsaAttuale = data.idCorsa;
            syncPanelsWithState();
            showToast('Mezzo sbloccato! Corsa iniziata.');
        } else {
            showToast(data.error);
        }
    } catch (e) {
        showToast('Errore di rete');
    }
}

/** Termina la corsa e scala il costo dal saldo (IF-UT.11) */
async function handleEndRide() {
    try {
        var res = await fetch(API_BASE + '/ride/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id })
        });
        var data = await res.json();
        if (res.ok) {
            clearInterval(state.rideTimerInterval);
            state.user.stato = 'libero';
            state.user.corsaAttuale = null;
            state.user.saldo = parseFloat(data.nuovoSaldo);

            updateProfileUI();
            syncPanelsWithState();
            loadVehicles(); // Il veicolo torna disponibile

            alert(
                'Corsa Terminata!\n' +
                'Durata: ' + data.minuti + ' min\n' +
                'Costo: €' + data.costoFinale + '\n' +
                'Nuovo Saldo: €' + data.nuovoSaldo
            );
        } else {
            showToast(data.error);
        }
    } catch (e) {
        showToast('Errore di rete');
    }
}


/* =================================================================
   8. DASHBOARD — Ricarica, promo, storico, chat, SOS
      (IF-UT.02, IF-UT.12, IF-UT.13, IF-UT.14, IF-UT.15, IF-UT.16)
   ================================================================= */

/** Ricarica il saldo dell'utente (IF-UT.02) */
async function handleRecharge() {
    var importo = document.getElementById('input-importo').value;
    if (!importo || importo <= 0) return showToast('Inserisci un importo valido');

    try {
        var res = await fetch(API_BASE + '/user/recharge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id, carta: '123', importo: importo })
        });
        var data = await res.json();
        if (res.ok) {
            state.user.saldo = data.nuovoSaldo;
            updateProfileUI();
            document.getElementById('input-importo').value = '';
            showToast('Ricaricati €' + importo);
        }
    } catch (e) {
        showToast('Errore di rete');
    }
}

/** Applica un codice promozionale (IF-UT.14) */
async function handlePromo() {
    var codice = document.getElementById('input-promo').value.trim();
    if (!codice) return showToast('Inserisci un codice promo');

    try {
        var res = await fetch(API_BASE + '/user/promo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id, codice: codice })
        });
        var data = await res.json();
        showToast(data.messaggio);
        document.getElementById('input-promo').value = '';
    } catch (e) {
        showToast('Errore di rete');
    }
}

/** Carica lo storico delle corse completate (IF-UT.12) */
async function loadHistory() {
    try {
        var res = await fetch(API_BASE + '/user/history/' + state.user.id);
        var data = await res.json();
        var historyList = document.getElementById('history-list');

        if (res.ok && data.corse && data.corse.length > 0) {
            historyList.innerHTML = '';
            data.corse.forEach(function(c) {
                var li = document.createElement('li');
                li.innerHTML = '<strong>' + c.data + '</strong> <span>€' + c.costo + ' (' + c.minuti + ' min)</span>';
                historyList.appendChild(li);
            });
        } else {
            historyList.innerHTML = '<li class="history-empty">Nessuna corsa effettuata.</li>';
        }
    } catch (e) {
        showToast('Errore caricamento storico');
    }
}

/** Invia un messaggio all'assistenza clienti (IF-UT.15) */
async function handleChat() {
    var messaggio = document.getElementById('input-chat').value.trim();
    if (!messaggio) return;

    try {
        var res = await fetch(API_BASE + '/support/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaggio: messaggio })
        });
        var data = await res.json();
        showToast(data.messaggio);
        document.getElementById('input-chat').value = '';
    } catch (e) {
        showToast('Errore di rete');
    }
}

/** Invia una valutazione in stelle (IF-UT.13) */
async function handleRating() {
    var stelle = document.getElementById('input-rating').value;
    if (!stelle || stelle < 1 || stelle > 5) return showToast('Voto non valido (1-5)');

    try {
        var res = await fetch(API_BASE + '/support/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stelle: stelle })
        });
        var data = await res.json();
        showToast(data.messaggio);
        document.getElementById('input-rating').value = '';
    } catch (e) {
        showToast('Errore di rete');
    }
}

/** Avvia una chiamata di emergenza SOS (IF-UT.16) */
async function handleSOS() {
    if (!confirm('Vuoi davvero inviare una chiamata di emergenza?')) return;

    try {
        var res = await fetch(API_BASE + '/support/call-sos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        var data = await res.json();
        alert(data.messaggio);
    } catch (e) {
        alert('Errore rete in SOS!');
    }
}


/* =================================================================
   9. TIMER — Countdown prenotazione e cronometro corsa
   ================================================================= */

/**
 * Avvia un countdown per la scadenza della prenotazione (IF-UT.09).
 * @param {number} secondsLeft - Secondi rimanenti.
 */
function startBookingTimer(secondsLeft) {
    clearInterval(state.bookingTimerInterval);
    var elTimer = document.getElementById('booking-timer');

    state.bookingTimerInterval = setInterval(function() {
        secondsLeft--;
        if (secondsLeft <= 0) {
            handleCancelBooking(); // Scadenza automatica
            showToast('Prenotazione scaduta');
            return;
        }
        var m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
        var s = (secondsLeft % 60).toString().padStart(2, '0');
        elTimer.textContent = 'Scadenza: ' + m + ':' + s;
    }, 1000);
}

/**
 * Avvia un cronometro per la durata della corsa attiva.
 */
function startRideTimer() {
    clearInterval(state.rideTimerInterval);
    var elTimer = document.getElementById('ride-timer');
    var secondsElapsed = 0;

    state.rideTimerInterval = setInterval(function() {
        secondsElapsed++;
        var m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        var s = (secondsElapsed % 60).toString().padStart(2, '0');
        elTimer.textContent = 'Durata: ' + m + ':' + s;
    }, 1000);
}
