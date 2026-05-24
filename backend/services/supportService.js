/* =================================================================
   SERVIZIO: Supporto Clienti — supportService.js
   -----------------------------------------------------------------
   Gestisce messaggistica, chiamate SOS e recensioni.
   Requisiti coperti: IF-UT.13, IF-UT.15, IF-UT.16
   ================================================================= */

var express = require('express');
var router = express.Router();
var db = require('../database');

/**
 * IF-UT.15 — Chat di Assistenza (Utente)
 * GET /api/supporto/chat
 * Ritorna messaggi della sessione attiva.
 */
router.get('/chat', function (req, res) {
    var userId = req.userId;
    var session = db.chats.getOpenSessionByUser(userId);
    if (!session) {
        return res.json({ messaggi: [], sessionId: null });
    }
    var messaggi = db.chats.getMessagesBySession(session.id);
    res.json({ messaggi: messaggi, sessionId: session.id });
});

/**
 * IF-UT.15 — Chat di Assistenza (Utente)
 * POST /api/supporto/chat
 * Invia un messaggio, creando la sessione se necessario.
 */
router.post('/chat', function (req, res) {
    var userId = req.userId;
    var testo = req.body.messaggio;
    if (!testo) return res.status(400).json({ error: 'Messaggio vuoto' });

    var session = db.chats.getOpenSessionByUser(userId);
    if (!session) {
        session = db.chats.createSession(userId);
    }
    
    var msg = db.chats.addMessage(session.id, userId, testo);
    res.json({ success: true, messaggio: msg });
});

/**
 * Chat Admin — Leggi tutte le sessioni aperte
 * GET /api/supporto/admin/chats
 */
router.get('/admin/chats', function (req, res) {
    // Controllo sicurezza base (ideale tramite middleware, per brevità qui)
    var utente = db.users.findById(req.userId);
    if (!utente || utente.ruolo !== 'admin') {
        return res.status(403).json({ error: 'Accesso negato: solo amministratori.' });
    }
    var sessions = db.chats.getAllOpenSessions();
    res.json({ sessions: sessions });
});

/**
 * Chat Admin — Leggi messaggi singola sessione
 * GET /api/supporto/admin/chats/:id
 */
router.get('/admin/chats/:id', function (req, res) {
    var utente = db.users.findById(req.userId);
    if (!utente || utente.ruolo !== 'admin') return res.status(403).json({ error: 'Accesso negato.' });
    
    var messaggi = db.chats.getMessagesBySession(req.params.id);
    res.json({ messaggi: messaggi });
});

/**
 * Chat Admin — Rispondi a sessione
 * POST /api/supporto/admin/chats/:id/reply
 */
router.post('/admin/chats/:id/reply', function (req, res) {
    var utente = db.users.findById(req.userId);
    if (!utente || utente.ruolo !== 'admin') return res.status(403).json({ error: 'Accesso negato.' });
    
    var testo = req.body.messaggio;
    if (!testo) return res.status(400).json({ error: 'Messaggio vuoto' });

    var msg = db.chats.addMessage(req.params.id, 'admin', testo);
    res.json({ success: true, messaggio: msg });
});

/**
 * Chat Admin — Chiudi sessione
 * POST /api/supporto/admin/chats/:id/close
 */
router.post('/admin/chats/:id/close', function (req, res) {
    var utente = db.users.findById(req.userId);
    if (!utente || utente.ruolo !== 'admin') return res.status(403).json({ error: 'Accesso negato.' });
    
    db.chats.closeSession(req.params.id);
    res.json({ success: true, messaggio: 'Chat chiusa correttamente.' });
});

/**
 * IF-UT.16 — Chiamata SOS (Emergenza) — UC-18
 * POST /api/supporto/sos
 * Body: { lat?: number, lon?: number }
 */
router.post('/sos', function (req, res) {
    var userId = req.userId;
    var lat = req.body.lat || null;
    var lon = req.body.lon || null;

    var segnalazione = db.segnalazioniSos.create({ idUtente: userId, lat: lat, lon: lon });
    console.log('🚨 [SOS] Emergenza da utente ' + userId + ' pos: ' + lat + ',' + lon);

    res.json({
        messaggio: 'Allarme SOS registrato. I servizi di soccorso sono stati allertati.',
        segnalazioneId: segnalazione.id
    });
});

/**
 * IF-UT.13 — Recensione Corsa — UC-UT.13
 * POST /api/supporto/recensione
 * Body: { stelle: number, idCorsa?: string }
 */
router.post('/recensione', function (req, res) {
    var userId = req.userId;
    var stelle = parseInt(req.body.stelle);
    var idCorsa = req.body.idCorsa || null;

    if (!stelle || stelle < 1 || stelle > 5) {
        return res.status(400).json({ error: 'Il campo stelle deve essere un numero da 1 a 5.' });
    }

    db.recensioni.create({ idUtente: userId, idCorsa: idCorsa, stelle: stelle });
    console.log('⭐ [RECENSIONE] Utente ' + userId + ' → ' + stelle + ' stelle');

    res.json({ messaggio: 'Grazie per aver valutato il nostro servizio con ' + stelle + ' stelle!' });
});

module.exports = router;
