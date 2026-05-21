/* =================================================================
   SERVIZIO: Booking Service — bookingService.js
   -----------------------------------------------------------------
   Prenotazione e annullamento (IF-UT.07, IF-UT.08, IF-UT.09).
   ================================================================= */

var express = require('express');
var router = express.Router();
var db = require('../database');

function inviaNotificaScadenza(email, nome, tipoMezzo, idPrenotazione) {
    if (email) {
        console.log('📧 [Notify API] Prenotazione ' + idPrenotazione + ' per ' + nome + ' (' + tipoMezzo + ')');
    }
}

/**
 * IF-UT.07 — Crea prenotazione
 * POST /api/prenotazioni
 * Body: { idUtente, idMezzo } oppure { userId, vehicleId }
 */
router.post('/', function (req, res) {
    var idUtente = req.body.idUtente || req.body.userId;
    var idMezzo = req.body.idMezzo || req.body.vehicleId;

    var user = db.utenti.findById(idUtente);
    var mezzo = db.mezzi.findById(idMezzo);

    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    if (user.stato !== 'libero') {
        return res.status(400).json({ error: 'Hai già una prenotazione o corsa attiva' });
    }
    if (!mezzo || mezzo.stato !== 'disponibile') {
        return res.status(400).json({ error: 'Mezzo non disponibile' });
    }

    var idPrenotazione = 'bkg-' + Date.now();

    db.mezzi.update(idMezzo, { stato: 'prenotato' });
    db.utenti.update(idUtente, {
        stato: 'prenotato',
        prenotazioneAttuale: idPrenotazione
    });
    db.prenotazioni.create({
        id: idPrenotazione,
        idUtente: idUtente,
        idMezzo: idMezzo,
        dataInizio: Date.now(),
        stato: 'attiva'
    });

    setTimeout(function () {
        var bkg = db.prenotazioni.findById(idPrenotazione);
        if (!bkg) return;
        var u = db.utenti.findById(idUtente);
        if (u && u.prenotazioneAttuale === idPrenotazione) {
            db.mezzi.update(idMezzo, { stato: 'disponibile' });
            db.utenti.update(idUtente, { stato: 'libero', prenotazioneAttuale: null });
            db.prenotazioni.delete(idPrenotazione);
            console.log('⏱️ Prenotazione ' + idPrenotazione + ' scaduta automaticamente (server)');
        }
    }, 600 * 1000);

    inviaNotificaScadenza(user.email, user.nome, mezzo.tipo, idPrenotazione);
    console.log('📌 Prenotazione ' + idPrenotazione);

    res.status(201).json({
        messaggio: 'Mezzo prenotato con successo!',
        idPrenotazione: idPrenotazione,
        mezzo: Object.assign({}, mezzo, { stato: 'prenotato' }),
        tempoScadenzaSec: 600
    });
});

/**
 * IF-UT.08 — Annulla prenotazione
 * POST /api/prenotazioni/annulla
 */
router.post('/annulla', function (req, res) {
    var idUtente = req.body.idUtente || req.body.userId;
    var user = db.utenti.findById(idUtente);

    if (!user || !user.prenotazioneAttuale) {
        return res.status(400).json({ error: 'Nessuna prenotazione attiva' });
    }

    var idPrenotazione = user.prenotazioneAttuale;
    var prenotazione = db.prenotazioni.findById(idPrenotazione);

    if (prenotazione) {
        db.mezzi.update(prenotazione.idMezzo, { stato: 'disponibile' });
    }

    db.utenti.update(idUtente, { stato: 'libero', prenotazioneAttuale: null });
    db.prenotazioni.delete(idPrenotazione);

    console.log('❌ Annullata prenotazione ' + idPrenotazione);
    res.json({ messaggio: 'Prenotazione ' + idPrenotazione + ' annullata.' });
});

module.exports = router;
