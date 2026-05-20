/* =================================================================
   DATABASE MOCK — database.js
   -----------------------------------------------------------------
   Simulazione di un Database in memoria per lo Sprint 1.
   Non utilizza PostgreSQL o MongoDB: i dati risiedono in un oggetto
   JavaScript globale importato da tutti i servizi.

   Questo modulo esporta:
     - mockDB:    l'oggetto "database" condiviso
     - connectDB: funzione di inizializzazione (simulata)

   Struttura dei dati:
     mockDB.utenti:       Mappa degli utenti registrati { id -> {...} }
     mockDB.veicoli:      Array dei mezzi con coordinate GPS su Bari
     mockDB.prenotazioni: Mappa delle prenotazioni attive { id -> {...} }
     mockDB.corse:        Mappa delle corse in corso { id -> {...} }
   ================================================================= */

var mockDB = {

    // Utenti registrati nel sistema
    // Ogni utente: { id, nome, saldo, scontoAttivo, stato, prenotazioneAttuale, corsaAttuale, storicoCorse }
    utenti: {},

    // Flotta di veicoli disponibili a Bari (coordinate reali)
    veicoli: [
        { id: 'veh-1', tipo: 'Monopattino Elettrico', batteria: 85, lat: 41.117143, lng: 16.871871, tariffa: 0.20, stato: 'disponibile' },
        { id: 'veh-2', tipo: 'Bicicletta Elettrica',  batteria: 100, lat: 41.118543, lng: 16.868871, tariffa: 0.15, stato: 'disponibile' },
        { id: 'veh-3', tipo: 'Monopattino Elettrico', batteria: 42,  lat: 41.121143, lng: 16.867871, tariffa: 0.20, stato: 'disponibile' },
        { id: 'veh-4', tipo: 'Bicicletta',            batteria: 100, lat: 41.123543, lng: 16.873871, tariffa: 0.10, stato: 'disponibile' },
        { id: 'veh-5', tipo: 'Scooter Elettrico',     batteria: 60,  lat: 41.115143, lng: 16.874871, tariffa: 0.30, stato: 'disponibile' }
    ],

    // Prenotazioni attive: { idPrenotazione -> { id, userId, vehicleId, startTime } }
    prenotazioni: {},

    // Corse in corso: { idCorsa -> { id, userId, vehicleId, startTime } }
    corse: {}
};

/**
 * Simula la connessione al database.
 * In un sistema reale, qui si connetterebbe a PostgreSQL/MongoDB.
 */
function connectDB() {
    console.log('✅ Database simulato inizializzato. Veicoli disponibili: ' + mockDB.veicoli.length);
}

module.exports = { connectDB: connectDB, mockDB: mockDB };
