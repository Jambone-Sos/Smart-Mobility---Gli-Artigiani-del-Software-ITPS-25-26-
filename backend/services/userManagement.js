/* =================================================================
   SERVIZIO: Gestione Utenti — userManagement.js
   -----------------------------------------------------------------
   Gestisce registrazione, login, profilo, pagamenti e promozioni.
   Requisiti coperti: IF-UT.01, IF-UT.02, IF-UT.12, IF-UT.14
   ================================================================= */

var express = require('express');
var router = express.Router();
var db = require('../database');


/**
 * IF-UT.01 — Registrazione Utente
 * POST /api/user/register
 * Body: { nome: string }
 */
router.post('/register', function (req, res) {
    var utente = req.body;
    var newUserId = 'user-' + Date.now();

    db.mockDB.utenti[newUserId] = {
        id: newUserId,
        nome: utente.nome,
        saldo: 0.00,
        scontoAttivo: false,
        stato: 'libero',           // 'libero' | 'prenotato' | 'in_corsa'
        prenotazioneAttuale: null,
        corsaAttuale: null,
        storicoCorse: []
    };

    console.log('📝 Registrazione utente:', utente.nome);
    res.json({
        messaggio: 'Utente registrato con successo.',
        userId: newUserId,
        user: db.mockDB.utenti[newUserId]
    });
});


/**
 * IF-UT.01 — Login Utente
 * POST /api/user/login
 * Body: { nome: string }
 */
router.post('/login', function (req, res) {
    var nome = req.body.nome;
    var user = Object.values(db.mockDB.utenti).find(function (u) {
        return u.nome === nome;
    });

    if (user) {
        console.log('🔑 Login utente:', user.nome);
        res.json({ messaggio: 'Login effettuato.', userId: user.id, user: user });
    } else {
        res.status(404).json({ error: 'Utente non trovato. Registrati prima.' });
    }
});


/**
 * Recupero dati utente (saldo, stato corrente)
 * GET /api/user/me/:userId
 */
router.get('/me/:userId', function (req, res) {
    var user = db.mockDB.utenti[req.params.userId];
    if (user) {
        res.json({ user: user });
    } else {
        res.status(404).json({ error: 'Utente non trovato.' });
    }
});


/**
 * IF-UT.02 — Ricarica Saldo (Gestione Pagamenti)
 * POST /api/user/recharge
 * Body: { userId: string, carta: string, importo: number }
 */
router.post('/recharge', function (req, res) {
    var userId = req.body.userId;
    var importo = parseFloat(req.body.importo);

    var user = db.mockDB.utenti[userId];
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });

    user.saldo += importo;
    console.log('💳 Ricarica €' + importo + ' per ' + user.nome + ' → Saldo: €' + user.saldo.toFixed(2));

    res.json({
        messaggio: 'Ricarica di €' + importo + ' completata.',
        nuovoSaldo: user.saldo
    });
});


/**
 * IF-UT.14 — Applicazione Codice Promozionale
 * POST /api/user/promo
 * Body: { userId: string, codice: string }
 */
router.post('/promo', function (req, res) {
    var userId = req.body.userId;
    var codice = req.body.codice;

    var user = db.mockDB.utenti[userId];
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });

    console.log('🎟️ Codice promo "' + codice + '" da ' + user.nome);

    if (codice === 'SCONTO50') {
        user.scontoAttivo = true;
        res.json({ messaggio: 'Codice applicato! Sconto 50% sulla prossima corsa.' });
    } else {
        res.json({ messaggio: 'Codice non riconosciuto.' });
    }
});


/**
 * IF-UT.12 — Storico Corse
 * GET /api/user/history/:userId
 */
router.get('/history/:userId', function (req, res) {
    var user = db.mockDB.utenti[req.params.userId];
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });

    res.json({
        messaggio: 'Storico corse recuperato.',
        corse: user.storicoCorse
    });
});


module.exports = router;
