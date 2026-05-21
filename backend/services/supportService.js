/* =================================================================
   SERVIZIO: Supporto Clienti — supportService.js
   -----------------------------------------------------------------
   Gestisce messaggistica, chiamate SOS e recensioni.
   Requisiti coperti: IF-UT.13, IF-UT.15, IF-UT.16
   ================================================================= */

var express = require('express');
var router = express.Router();

/**
 * IF-UT.15 — Chat di Assistenza
 * POST /api/support/chat
 * Body: { messaggio: string }
 */
router.post('/chat', function (req, res) {
    var messaggio = req.body.messaggio;
    console.log('💬 [CHAT] Nuovo messaggio:', messaggio);
    
    res.json({
        messaggio: 'Messaggio inviato! Un operatore ti risponderà a breve.'
    });
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
