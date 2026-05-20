/* =================================================================
   SERVIZIO: Gestione Corsa — rideService.js
   -----------------------------------------------------------------
   Gestisce lo sblocco del mezzo, la corsa in tempo reale e il
   termine con calcolo automatico del costo basato sulla durata.
   Requisiti coperti: IF-UT.18, IF-UT.11
   ================================================================= */

var express = require('express');
var router = express.Router();
var db = require('../database');


/**
 * IF-UT.18 — Sblocco Mezzo (Inizio Corsa)
 * POST /api/ride/unlock
 * Body: { userId: string }
 *
 * Transizione di stato: prenotato → in_corsa
 * Crea un record corsa nel database con timestamp di inizio.
 */
router.post('/unlock', function(req, res) {
    var userId = req.body.userId;
    var user = db.mockDB.utenti[userId];

    if (!user || !user.prenotazioneAttuale) {
        return res.status(400).json({ error: 'Nessuna prenotazione attiva da sbloccare' });
    }

    var idPrenotazione = user.prenotazioneAttuale;
    var bkg = db.mockDB.prenotazioni[idPrenotazione];
    var idCorsa = 'ride-' + Date.now();

    // Aggiorna stato utente: prenotato → in_corsa
    user.stato = 'in_corsa';
    user.prenotazioneAttuale = null;
    user.corsaAttuale = idCorsa;

    // Aggiorna stato veicolo
    var vehicle = db.mockDB.veicoli.find(function(v) { return v.id === bkg.vehicleId; });
    if (vehicle) vehicle.stato = 'in_uso';

    // Registra la corsa con il timestamp di inizio
    db.mockDB.corse[idCorsa] = {
        id: idCorsa,
        userId: userId,
        vehicleId: bkg.vehicleId,
        startTime: Date.now()
    };

    console.log('🔓 Sblocco mezzo → Corsa ' + idCorsa + ' per ' + user.nome);

    res.json({
        messaggio: 'Mezzo sbloccato! Corsa iniziata.',
        idCorsa: idCorsa,
        vehicle: vehicle,
        startTime: db.mockDB.corse[idCorsa].startTime
    });
});


/**
 * IF-UT.11 — Termine Corsa e Pagamento
 * POST /api/ride/end
 * Body: { userId: string }
 *
 * Calcola il costo in base alla durata (minuti × tariffa),
 * applica l'eventuale sconto promozionale e scala dal saldo.
 * Salva la corsa nello storico dell'utente.
 */
router.post('/end', function(req, res) {
    var userId = req.body.userId;
    var user = db.mockDB.utenti[userId];

    if (!user || !user.corsaAttuale) {
        return res.status(400).json({ error: 'Nessuna corsa attiva' });
    }

    var idCorsa = user.corsaAttuale;
    var ride = db.mockDB.corse[idCorsa];
    var vehicle = db.mockDB.veicoli.find(function(v) { return v.id === ride.vehicleId; });

    // Calcolo durata e costo
    var tempoMs = Date.now() - ride.startTime;
    var minuti = Math.ceil(tempoMs / 60000);
    if (minuti < 1) minuti = 1;

    var tariffa = vehicle ? vehicle.tariffa : 0.20;
    var costoFinale = minuti * tariffa;

    // Applica eventuale sconto promozionale (IF-UT.14)
    if (user.scontoAttivo) {
        costoFinale = costoFinale / 2;
        user.scontoAttivo = false;
        console.log('🎟️ Sconto 50% applicato → Costo ridotto: €' + costoFinale.toFixed(2));
    }

    // Scala dal saldo
    user.saldo -= costoFinale;

    // Salva nello storico corse dell'utente
    user.storicoCorse.push({
        id: idCorsa,
        data: new Date().toISOString().split('T')[0],
        costo: costoFinale.toFixed(2),
        minuti: minuti,
        stato: 'completata'
    });

    // Libera stato utente e veicolo
    user.stato = 'libero';
    user.corsaAttuale = null;
    if (vehicle) vehicle.stato = 'disponibile';

    console.log('🏁 Corsa terminata: ' + idCorsa + ' → €' + costoFinale.toFixed(2) + ' (' + minuti + ' min)');

    res.json({
        messaggio: 'Corsa terminata. Costo detratto dal saldo.',
        costoFinale: costoFinale.toFixed(2),
        minuti: minuti,
        nuovoSaldo: user.saldo.toFixed(2)
    });
});


module.exports = router;
