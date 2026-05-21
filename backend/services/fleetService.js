/* =================================================================
   SERVIZIO: Gestione Flotta — fleetService.js
   -----------------------------------------------------------------
   Fornisce i dati dei veicoli disponibili con coordinate GPS,
   batteria e tariffe. Utilizzato dal frontend per popolare la mappa.
   Requisiti coperti: IF-UT.03, IF-UT.04, IF-UT.05
   ================================================================= */

var express = require('express');
var router = express.Router();
var db = require('../database');


/**
 * IF-UT.03/04/05 — Visualizzazione Mappa, Caratteristiche e Tariffe
 * GET /api/fleet/vehicles
 * Restituisce l'array completo dei veicoli dal database simulato.
 */
router.get('/vehicles', function(req, res) {
    console.log('🗺️ Richiesta elenco veicoli per la mappa');

    res.json({
        messaggio: 'Dati dei mezzi caricati',
        mezzi: db.mockDB.veicoli
    });
});


module.exports = router;
