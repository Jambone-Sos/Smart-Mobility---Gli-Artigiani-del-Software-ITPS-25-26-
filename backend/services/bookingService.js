/* =================================================================
   SERVIZIO: Prenotazioni — bookingService.js
   -----------------------------------------------------------------
   Gestisce la prenotazione e l'annullamento dei veicoli.
   Aggiorna lo stato sia dell'utente che del veicolo nel database.
   Requisiti coperti: IF-UT.07, IF-UT.08, IF-UT.09
   ================================================================= */

var express = require('express');
var router = express.Router();
var db = require('../database');


/**
 * IF-UT.07 — Prenotazione Mezzo
 * POST /api/booking/book
 * Body: { userId: string, vehicleId: string }
 *
 * Verifica che l'utente sia libero e il veicolo disponibile,
 * poi crea la prenotazione e aggiorna gli stati.
 */
router.post('/book', function(req, res) {
    var idMezzo = req.body.vehicleId;
    var userId = req.body.userId;

    var user = db.mockDB.utenti[userId];
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    if (user.stato !== 'libero') return res.status(400).json({ error: 'Hai già una prenotazione o corsa attiva' });

    var vehicle = db.mockDB.veicoli.find(function(v) { return v.id === idMezzo; });
    if (!vehicle || vehicle.stato !== 'disponibile') {
        return res.status(400).json({ error: 'Veicolo non disponibile' });
    }

    var idPrenotazione = 'bkg-' + Date.now();

    // Aggiorna stati nel database
    vehicle.stato = 'prenotato';
    user.stato = 'prenotato';
    user.prenotazioneAttuale = idPrenotazione;

    db.mockDB.prenotazioni[idPrenotazione] = {
        id: idPrenotazione,
        userId: userId,
        vehicleId: idMezzo,
        startTime: Date.now()
    };

    console.log('📌 Prenotazione ' + idPrenotazione + ' → ' + user.nome + ' su ' + vehicle.tipo);

    res.status(201).json({
        messaggio: 'Mezzo prenotato con successo!',
        idPrenotazione: idPrenotazione,
        vehicle: vehicle,
        tempoScadenzaSec: 600 // 10 minuti
    });
});


/**
 * IF-UT.08 / IF-UT.09 — Annullamento Prenotazione
 * POST /api/booking/cancel
 * Body: { userId: string }
 *
 * Libera il veicolo e resetta lo stato dell'utente.
 * Viene invocato anche automaticamente alla scadenza (lato client).
 */
router.post('/cancel', function(req, res) {
    var userId = req.body.userId;
    var user = db.mockDB.utenti[userId];

    if (!user || !user.prenotazioneAttuale) {
        return res.status(400).json({ error: 'Nessuna prenotazione attiva' });
    }

    var idPrenotazione = user.prenotazioneAttuale;
    var bkg = db.mockDB.prenotazioni[idPrenotazione];

    // Libera il veicolo
    if (bkg) {
        var vehicle = db.mockDB.veicoli.find(function(v) { return v.id === bkg.vehicleId; });
        if (vehicle) vehicle.stato = 'disponibile';
    }

    // Resetta lo stato utente
    user.stato = 'libero';
    user.prenotazioneAttuale = null;

    console.log('❌ Annullamento prenotazione: ' + idPrenotazione);
    res.json({ messaggio: 'Prenotazione ' + idPrenotazione + ' annullata.' });
});


module.exports = router;
