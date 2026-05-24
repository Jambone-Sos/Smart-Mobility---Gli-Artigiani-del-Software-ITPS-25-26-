/* =================================================================
   SERVIZIO: Fleet Service — fleetService.js
   -----------------------------------------------------------------
   Elenco mezzi sulla mappa (IF-UT.03, IF-UT.04, IF-UT.05).
   ================================================================= */

var express = require('express');
var router = express.Router();
var db = require('../database');

/**
 * GET /api/mezzi
 * Restituisce tutti i mezzi disponibili con coordinate e tariffe.
 */
router.get('/', function (req, res) {
    console.log('🗺️ Richiesta elenco mezzi');
    var lista = db.mezzi.findAll();
    res.json({
        messaggio: 'Dati dei mezzi caricati',
        mezzi: lista
    });
});

module.exports = router;
