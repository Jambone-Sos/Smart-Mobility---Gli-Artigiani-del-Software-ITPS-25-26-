/* =================================================================
   API GATEWAY — server.js
   -----------------------------------------------------------------
   Punto di ingresso: smista le richieste REST verso i servizi
   (User, Fleet, Booking, Ride, Support) come nel diagramma componenti.

   Prefissi REST (coerenti con i servizi della documentazione):
     /api/utenti       → userManagement.js   (User Service)
     /api/mezzi        → fleetService.js      (Fleet Service)
     /api/prenotazioni → bookingService.js    (Booking Service)
     /api/corse        → rideService.js       (Ride Service)
     /api/supporto     → supportService.js

   Autenticazione: JWT Bearer Token (IFC-01), scadenza 24h.
   Rotte pubbliche (no JWT): POST /registrazione, POST /login.
   ================================================================= */

var express = require('express');
var cors = require('cors');
var path = require('path');
var db = require('./database');
var { verifyToken } = require('./auth');

var app = express();
var PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

var userManagement = require('./services/userManagement');
var fleetService   = require('./services/fleetService');
var bookingService = require('./services/bookingService');
var rideService    = require('./services/rideService');
var supportService = require('./services/supportService');

/* Middleware JWT globale — salta solo registrazione e login (IFC-01) */
var PUBLIC_PATHS = [
    { method: 'POST', path: '/api/utenti/registrazione' },
    { method: 'POST', path: '/api/utenti/login' }
];

app.use(function (req, res, next) {
    var isPublic = PUBLIC_PATHS.some(function (p) {
        return p.method === req.method && p.path === req.path;
    });
    if (isPublic) return next();
    verifyToken(req, res, next);
});

app.use('/api/utenti', userManagement);
app.use('/api/mezzi', fleetService);
app.use('/api/prenotazioni', bookingService);
app.use('/api/corse', rideService);
app.use('/api/supporto', supportService);

db.connectDB().then(function () {
    app.listen(PORT, function () {
        console.log('🚀 API Gateway in ascolto sulla porta ' + PORT);
        console.log('   Frontend → apri frontend/index.html nel browser');
    });
}).catch(function (err) {
    console.error('❌ Errore avvio database:', err);
    process.exit(1);
});
