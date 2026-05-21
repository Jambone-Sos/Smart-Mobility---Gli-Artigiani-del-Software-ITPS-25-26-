/* =================================================================
   SERVIZIO: Ride Service — rideService.js
   -----------------------------------------------------------------
   Sblocco, corsa, termine e pagamento (IF-UT.18, IF-UT.11).
   Comando IoT simulato (MQTT) come da diagramma External Sys.
   GPS inizio/fine corsa salvato dal mezzo (IIN-3).
   ================================================================= */

var express = require('express');
var router = express.Router();
var db = require('../database');

function comandoIoT(idMezzo, azione) {
    console.log('📡 [MQTT simulato] ' + azione + ' → mezzo ' + idMezzo);
}

function inviaRicevuta(email, nome, dati) {
    if (email) {
        console.log('📧 [Notify API] Ricevuta corsa €' + dati.costo + ' → ' + nome);
    }
}

/**
 * IF-UT.18 — Sblocco mezzo (UC-11)
 * POST /api/corse/sblocco
 */
router.post('/sblocco', function (req, res) {
    var idUtente = req.body.idUtente || req.body.userId;
    var user = db.utenti.findById(idUtente);

    if (!user || !user.prenotazioneAttuale) {
        return res.status(400).json({ error: 'Nessuna prenotazione attiva da sbloccare' });
    }

    var idPrenotazione = user.prenotazioneAttuale;
    var prenotazione = db.prenotazioni.findById(idPrenotazione);
    if (!prenotazione) return res.status(400).json({ error: 'Prenotazione non trovata' });

    /* Leggi GPS del mezzo prima di aggiornarne lo stato (IIN-3) */
    var mezzo = db.mezzi.findById(prenotazione.idMezzo);
    var idCorsa = 'ride-' + Date.now();

    comandoIoT(prenotazione.idMezzo, 'unlock');

    db.utenti.update(idUtente, { stato: 'in_corsa', prenotazioneAttuale: null, corsaAttuale: idCorsa });
    db.mezzi.update(prenotazione.idMezzo, { stato: 'in_uso' });
    db.corse.create({
        id: idCorsa,
        prenotazioneId: idPrenotazione,
        idUtente: idUtente,
        idMezzo: prenotazione.idMezzo,
        dataInizio: Date.now(),
        latInizio: mezzo ? mezzo.lat : null,
        lonInizio: mezzo ? mezzo.lng : null
    });
    db.prenotazioni.delete(idPrenotazione);

    console.log('🔓 Corsa ' + idCorsa + ' avviata');

    res.json({
        messaggio: 'Mezzo sbloccato! Corsa iniziata.',
        idCorsa: idCorsa,
        mezzo: mezzo,
        startTime: Date.now()
    });
});

/**
 * IF-UT.11 — Termine corsa e pagamento (UC-14)
 * POST /api/corse/termine
 * Costo = durata × tariffa + tariffaSblocco (doc UC-14 passo 6)
 */
router.post('/termine', function (req, res) {
    var idUtente = req.body.idUtente || req.body.userId;
    var user = db.utenti.findById(idUtente);

    if (!user || !user.corsaAttuale) {
        return res.status(400).json({ error: 'Nessuna corsa attiva' });
    }

    var idCorsa = user.corsaAttuale;
    var corsa = db.corse.findById(idCorsa);
    if (!corsa) return res.status(400).json({ error: 'Corsa non trovata' });

    var mezzo = db.mezzi.findById(corsa.idMezzo);
    var tempoMs = Date.now() - corsa.dataInizio;
    var minuti = Math.ceil(tempoMs / 60000);
    if (minuti < 1) minuti = 1;

    var tariffa = mezzo ? mezzo.tariffa : 0.20;
    var tariffaSblocco = mezzo ? (mezzo.tariffaSblocco || 0) : 0;
    var costoFinale = parseFloat((minuti * tariffa + tariffaSblocco).toFixed(2));

    if (user.scontoAttivo) {
        var promo = db.promozioni.findByCodice('SCONTO50');
        var pct = promo ? promo.sconto_percentuale : 50;
        costoFinale = parseFloat((costoFinale * (1 - pct / 100)).toFixed(2));
        db.utenti.update(idUtente, { scontoAttivo: false });
        console.log('🎟️ Sconto ' + pct + '% applicato');
    }

    if (user.saldo < costoFinale) {
        return res.status(400).json({ error: 'Saldo insufficiente (€' + user.saldo.toFixed(2) + '). Ricarica il portafoglio.' });
    }

    var nuovoSaldo = parseFloat((user.saldo - costoFinale).toFixed(2));

    db.corse.complete(idCorsa, {
        dataFine: Date.now(),
        latFine: mezzo ? mezzo.lat : null,
        lonFine: mezzo ? mezzo.lng : null,
        costo: costoFinale,
        minuti: minuti
    });

    db.pagamenti.create({
        id: 'pay-' + Date.now(),
        idUtente: idUtente,
        idCorsa: idCorsa,
        importo: costoFinale,
        tipo: 'corsa',
        stato: 'completato'
    });

    db.ricevute.create({
        id: 'rcv-' + Date.now(),
        idCorsa: idCorsa,
        idUtente: idUtente,
        importo: costoFinale
    });

    db.utenti.update(idUtente, { saldo: nuovoSaldo, stato: 'libero', corsaAttuale: null });

    if (mezzo) {
        db.mezzi.update(corsa.idMezzo, { stato: 'disponibile' });
        comandoIoT(corsa.idMezzo, 'lock');
    }

    inviaRicevuta(user.email, user.nome, { costo: costoFinale.toFixed(2) });
    console.log('🏁 Corsa ' + idCorsa + ' → €' + costoFinale);

    res.json({
        messaggio: 'Corsa terminata. Costo detratto dal saldo.',
        costoFinale: costoFinale.toFixed(2),
        minuti: minuti,
        nuovoSaldo: nuovoSaldo.toFixed(2)
    });
});

module.exports = router;
