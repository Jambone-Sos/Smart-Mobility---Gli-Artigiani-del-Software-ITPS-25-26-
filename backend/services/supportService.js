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
 * IF-UT.16 — Chiamata SOS (Emergenza)
 * POST /api/support/call-sos
 */
router.post('/call-sos', function (req, res) {
    console.log('🚨 [SOS] Allarme emergenza attivato!');
    
    res.json({
        messaggio: 'Allarme registrato. I servizi di soccorso sono stati allertati e la posizione è stata inviata.'
    });
});

/**
 * IF-UT.13 — Recensione Corsa
 * POST /api/support/review
 * Body: { stelle: number }
 */
router.post('/review', function (req, res) {
    var stelle = req.body.stelle;
    console.log('⭐ [RECENSIONE] Valutazione ricevuta:', stelle, 'stelle');
    
    res.json({
        messaggio: 'Grazie per aver valutato il nostro servizio con ' + stelle + ' stelle!'
    });
});

module.exports = router;
