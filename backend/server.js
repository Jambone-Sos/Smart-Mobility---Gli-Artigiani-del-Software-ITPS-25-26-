/* =================================================================
   API GATEWAY — server.js
   -----------------------------------------------------------------
   Punto di ingresso dell'applicazione backend.
   Ruolo: Riceve tutte le richieste HTTP dal frontend e le smista
   verso i moduli di servizio nella cartella /services/.

   Architettura:
     Client (frontend) --HTTP--> API Gateway (questo file)
                                    |
                                    |--> /api/user     -> userManagement.js
                                    |--> /api/booking  -> bookingService.js
                                    |--> /api/ride     -> rideService.js
                                    |--> /api/fleet    -> fleetService.js
                                    |--> /api/support  -> supportService.js
   ================================================================= */

var express = require('express');
var cors = require('cors');
var db = require('./database');

var app = express();
var PORT = 3000;

// Middleware globali
app.use(cors());              // Permette chiamate cross-origin dal frontend
app.use(express.json());      // Parsing automatico del body JSON

// Connessione al Database (simulato)
db.connectDB();

// Importazione dei Servizi (Router Express)
var userManagement = require('./services/userManagement');
var bookingService = require('./services/bookingService');
var rideService = require('./services/rideService');
var fleetService = require('./services/fleetService');
var supportService = require('./services/supportService');

// Registrazione delle Rotte — ogni servizio gestisce un prefisso
app.use('/api/user', userManagement);   // IF-UT.01, 02, 12, 14
app.use('/api/booking', bookingService);   // IF-UT.07, 08, 09
app.use('/api/ride', rideService);      // IF-UT.18, 11
app.use('/api/fleet', fleetService);     // IF-UT.03, 04, 05
app.use('/api/support', supportService);   // IF-UT.13, 15, 16

// Avvio del server
app.listen(PORT, function () {
    console.log('🚀 API Gateway in ascolto sulla porta ' + PORT);
});
