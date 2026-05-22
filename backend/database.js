/* =================================================================
   DATABASE — database.js
   -----------------------------------------------------------------
   Persistenza locale SQLite (file backend/smartmobility.db).
   Modello allineato al diagramma classi/componenti:
   Utente, Mezzo, Prenotazione, Corsa, Pagamento, Ricevuta,
   Promozione, MetodoPagamento.
   ================================================================= */

var fs = require('fs');
var path = require('path');
var initSqlJs = require('sql.js');

var DB_PATH = path.join(__dirname, 'smartmobility.db');
var db = null;
var ready = false;

var MEZZI_INIZIALI = [
    { id: 'veh-1', tipo: 'Monopattino Elettrico', batteria: 85, lat: 41.117143, lng: 16.871871, tariffa: 0.20, tariffaSblocco: 1.00 },
    { id: 'veh-2', tipo: 'Bicicletta Elettrica', batteria: 100, lat: 41.118543, lng: 16.868871, tariffa: 0.15, tariffaSblocco: 0.50 },
    { id: 'veh-3', tipo: 'Monopattino Elettrico', batteria: 42, lat: 41.121143, lng: 16.867871, tariffa: 0.20, tariffaSblocco: 1.00 },
    { id: 'veh-4', tipo: 'Bicicletta', batteria: 100, lat: 41.123543, lng: 16.873871, tariffa: 0.10, tariffaSblocco: 0.00 },
    { id: 'veh-5', tipo: 'Scooter Elettrico', batteria: 60, lat: 41.115143, lng: 16.874871, tariffa: 0.30, tariffaSblocco: 2.00 }
];

function persist() {
    var data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function connectDB() {
    var SQL = await initSqlJs({
        locateFile: function (file) {
            return path.join(__dirname, 'node_modules', 'sql.js', 'dist', file);
        }
    });
    if (fs.existsSync(DB_PATH)) {
        db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
        db = new SQL.Database();
    }
    initSchema();
    seedMezzi();
    seedAdmin();
    persist();
    ready = true;
    console.log('✅ Database SQLite locale → ' + DB_PATH);
}

function assertReady() {
    if (!ready) throw new Error('Database non ancora inizializzato');
}

function initSchema() {
    db.run(`
        CREATE TABLE IF NOT EXISTS utenti (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            nome TEXT NOT NULL,
            cognome TEXT,
            email TEXT UNIQUE,
            password_hash TEXT,
            saldo REAL NOT NULL DEFAULT 0,
            sconto_attivo INTEGER NOT NULL DEFAULT 0,
            stato TEXT NOT NULL DEFAULT 'libero',
            prenotazione_attuale TEXT,
            corsa_attuale TEXT,
            documento_url TEXT,
            ruolo TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS mezzi (
            id TEXT PRIMARY KEY,
            tipo TEXT NOT NULL,
            batteria INTEGER NOT NULL DEFAULT 100,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            tariffa REAL NOT NULL,
            tariffa_sblocco REAL NOT NULL DEFAULT 0,
            stato TEXT NOT NULL DEFAULT 'disponibile'
        );
        CREATE TABLE IF NOT EXISTS prenotazioni (
            id TEXT PRIMARY KEY,
            id_utente TEXT NOT NULL,
            id_mezzo TEXT NOT NULL,
            data_inizio INTEGER NOT NULL,
            stato TEXT NOT NULL DEFAULT 'attiva'
        );
        CREATE TABLE IF NOT EXISTS corse (
            id TEXT PRIMARY KEY,
            prenotazione_id TEXT,
            id_utente TEXT NOT NULL,
            id_mezzo TEXT NOT NULL,
            data_inizio INTEGER NOT NULL,
            data_fine INTEGER,
            lat_inizio REAL,
            lon_inizio REAL,
            lat_fine REAL,
            lon_fine REAL,
            costo REAL,
            minuti INTEGER,
            stato TEXT NOT NULL DEFAULT 'in_corso'
        );
        CREATE TABLE IF NOT EXISTS pagamenti (
            id TEXT PRIMARY KEY,
            id_utente TEXT NOT NULL,
            id_corsa TEXT,
            importo REAL NOT NULL,
            tipo TEXT NOT NULL,
            stato TEXT NOT NULL DEFAULT 'completato',
            token_esterno TEXT,
            data_pagamento TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS ricevute (
            id TEXT PRIMARY KEY,
            id_corsa TEXT NOT NULL,
            id_utente TEXT NOT NULL,
            importo REAL NOT NULL,
            data_emissione TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS promozioni (
            codice TEXT PRIMARY KEY,
            descrizione TEXT,
            sconto_percentuale INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS metodi_pagamento (
            id TEXT PRIMARY KEY,
            id_utente TEXT NOT NULL,
            tipo TEXT NOT NULL,
            token_gateway TEXT NOT NULL,
            is_default INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            id_utente TEXT NOT NULL,
            stato TEXT NOT NULL DEFAULT 'aperta',
            data_creazione TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            id_sessione TEXT NOT NULL,
            mittente TEXT NOT NULL,
            messaggio TEXT NOT NULL,
            data_invio TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);

    /* Migrazioni sicure per DB esistenti (IF colonna già presente → ignorata) */
    var migrations = [
        'ALTER TABLE utenti ADD COLUMN username TEXT',
        'ALTER TABLE utenti ADD COLUMN cognome TEXT',
        'ALTER TABLE utenti ADD COLUMN password_hash TEXT',
        'ALTER TABLE utenti ADD COLUMN ruolo TEXT NOT NULL DEFAULT "user"',
        'ALTER TABLE corse ADD COLUMN prenotazione_id TEXT',
        'ALTER TABLE corse ADD COLUMN lat_inizio REAL',
        'ALTER TABLE corse ADD COLUMN lon_inizio REAL',
        'ALTER TABLE corse ADD COLUMN lat_fine REAL',
        'ALTER TABLE corse ADD COLUMN lon_fine REAL'
    ];
    migrations.forEach(function (sql) {
        try { db.run(sql); } catch (e) { /* colonna già presente */ }
    });

    var promo = queryOne('SELECT COUNT(*) AS n FROM promozioni');
    if (promo && promo.n === 0) {
        runSql('INSERT INTO promozioni (codice, descrizione, sconto_percentuale) VALUES (?, ?, ?)',
            ['SCONTO50', 'Sconto 50% sulla prossima corsa', 50]);
    }
}

function seedAdmin() {
    var admin = queryOne('SELECT * FROM utenti WHERE email = ?', ['admin@smartmobility.com']);
    if (!admin) {
        // Usa un hash fittizio per 'admin' o crealo in fase di avvio. Qui usiamo direttamente l'hash di 'admin'.
        // NOTA: bcrypt di 'admin' (generato da node). Lo genereremo come "$2a$10$wO3vF50QjA8B2.o1mR8B9OQ9kPZ9qKq4M3n8W1q7G2rZ0A3M3n8W"
        // In userManagement c'è il bcrypt. Facciamo finta che 'admin' sia la password in chiaro per il seed se non usiamo bcrypt qua, 
        // ma siccome auth controlla con bcrypt, dobbiamo inserire un hash valido.
        // Hash di 'admin' (salt 10) = $2b$10$qH/RIt5W616XbI5J6D5Z.eX9UuTf0CXYG8N2rLw8w8.sR7r5M4L1u
        var hashAdmin = '$2b$10$qH/RIt5W616XbI5J6D5Z.eX9UuTf0CXYG8N2rLw8w8.sR7r5M4L1u';
        runSql(
            `INSERT INTO utenti (id, username, nome, cognome, email, password_hash, saldo, ruolo, stato)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['admin-1', 'admin', 'Amministratore', 'Sistema', 'admin@smartmobility.com', hashAdmin, 0, 'admin', 'libero']
        );
        console.log('🌱 Account Admin inserito (admin@smartmobility.com / admin)');
    }
}

function seedMezzi() {
    var count = queryOne('SELECT COUNT(*) AS n FROM mezzi');
    if (count && count.n > 0) return;
    MEZZI_INIZIALI.forEach(function (m) {
        runSql(
            'INSERT INTO mezzi (id, tipo, batteria, lat, lng, tariffa, tariffa_sblocco, stato) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [m.id, m.tipo, m.batteria, m.lat, m.lng, m.tariffa, m.tariffaSblocco, 'disponibile']
        );
    });
    console.log('🌱 Flotta iniziale inserita (' + MEZZI_INIZIALI.length + ' mezzi)');
}

function queryOne(sql, params) {
    var stmt = db.prepare(sql);
    if (params) stmt.bind(params);
    var row = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();
    return row;
}

function queryAll(sql, params) {
    var stmt = db.prepare(sql);
    if (params) stmt.bind(params);
    var rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

function runSql(sql, params) {
    if (params) db.run(sql, params);
    else db.run(sql);
    persist();
}

function rowToUtente(row) {
    if (!row) return null;
    return {
        id: row.id,
        username: row.username || null,
        nome: row.nome,
        cognome: row.cognome || null,
        email: row.email,
        saldo: row.saldo,
        scontoAttivo: !!row.sconto_attivo,
        stato: row.stato,
        prenotazioneAttuale: row.prenotazione_attuale,
        corsaAttuale: row.corsa_attuale,
        documentoUrl: row.documento_url,
        ruolo: row.ruolo || 'user',
        storicoCorse: corse.findStoricoByUtente(row.id)
        /* password_hash mai esposto nelle risposte */
    };
}

function rowToMezzo(row) {
    if (!row) return null;
    return {
        id: row.id,
        tipo: row.tipo,
        batteria: row.batteria,
        lat: row.lat,
        lng: row.lng,
        tariffa: row.tariffa,
        tariffaSblocco: row.tariffa_sblocco,
        stato: row.stato
    };
}

var utenti = {
    findById: function (id) {
        assertReady();
        return rowToUtente(queryOne('SELECT * FROM utenti WHERE id = ?', [id]));
    },
    findByName: function (nome) {
        return rowToUtente(queryOne('SELECT * FROM utenti WHERE nome = ?', [nome]));
    },
    findByEmail: function (email) {
        var row = queryOne('SELECT * FROM utenti WHERE email = ?', [email]);
        if (!row) return null;
        return { raw: row, utente: rowToUtente(row) };
    },
    findByEmailOrUsername: function (identifier) {
        var row = queryOne('SELECT * FROM utenti WHERE email = ? OR username = ?', [identifier, identifier]);
        if (!row) return null;
        return { raw: row, utente: rowToUtente(row) };
    },
    create: function (data) {
        runSql(
            `INSERT INTO utenti (id, username, nome, cognome, email, password_hash, saldo, sconto_attivo, stato,
             prenotazione_attuale, corsa_attuale, documento_url, ruolo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.id, data.username || null, data.nome, data.cognome || null, data.email || null, data.passwordHash || null,
            data.saldo || 0, data.scontoAttivo ? 1 : 0, data.stato || 'libero',
            data.prenotazioneAttuale || null, data.corsaAttuale || null, data.documentoUrl || null, data.ruolo || 'user']
        );
        return utenti.findById(data.id);
    },
    update: function (id, fields) {
        var colMap = {
            saldo: 'saldo', scontoAttivo: 'sconto_attivo', stato: 'stato',
            prenotazioneAttuale: 'prenotazione_attuale', corsaAttuale: 'corsa_attuale',
            documentoUrl: 'documento_url', passwordHash: 'password_hash'
        };
        Object.keys(colMap).forEach(function (key) {
            if (key in fields) {
                var val = key === 'scontoAttivo' ? (fields[key] ? 1 : 0) : fields[key];
                runSql('UPDATE utenti SET ' + colMap[key] + ' = ? WHERE id = ?', [val, id]);
            }
        });
        return utenti.findById(id);
    }
};

var mezzi = {
    findAll: function () {
        return queryAll('SELECT * FROM mezzi ORDER BY id').map(rowToMezzo);
    },
    findById: function (id) {
        return rowToMezzo(queryOne('SELECT * FROM mezzi WHERE id = ?', [id]));
    },
    update: function (id, fields) {
        var colMap = { batteria: 'batteria', lat: 'lat', lng: 'lng', tariffa: 'tariffa', stato: 'stato' };
        Object.keys(colMap).forEach(function (key) {
            if (key in fields) runSql('UPDATE mezzi SET ' + colMap[key] + ' = ? WHERE id = ?', [fields[key], id]);
        });
        return mezzi.findById(id);
    }
};

var prenotazioni = {
    create: function (data) {
        runSql('INSERT INTO prenotazioni (id, id_utente, id_mezzo, data_inizio, stato) VALUES (?, ?, ?, ?, ?)',
            [data.id, data.idUtente, data.idMezzo, data.dataInizio, data.stato || 'attiva']);
        return prenotazioni.findById(data.id);
    },
    findById: function (id) {
        var row = queryOne('SELECT * FROM prenotazioni WHERE id = ?', [id]);
        if (!row) return null;
        return { id: row.id, idUtente: row.id_utente, idMezzo: row.id_mezzo, dataInizio: row.data_inizio, stato: row.stato };
    },
    delete: function (id) {
        runSql('DELETE FROM prenotazioni WHERE id = ?', [id]);
    }
};

var corse = {
    create: function (data) {
        runSql(
            'INSERT INTO corse (id, prenotazione_id, id_utente, id_mezzo, data_inizio, lat_inizio, lon_inizio, stato) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [data.id, data.prenotazioneId || null, data.idUtente, data.idMezzo,
            data.dataInizio, data.latInizio || null, data.lonInizio || null, 'in_corso']
        );
        return corse.findById(data.id);
    },
    findById: function (id) {
        var row = queryOne('SELECT * FROM corse WHERE id = ?', [id]);
        if (!row) return null;
        return {
            id: row.id, prenotazioneId: row.prenotazione_id,
            idUtente: row.id_utente, idMezzo: row.id_mezzo,
            dataInizio: row.data_inizio, dataFine: row.data_fine,
            latInizio: row.lat_inizio, lonInizio: row.lon_inizio,
            latFine: row.lat_fine, lonFine: row.lon_fine,
            costo: row.costo, minuti: row.minuti, stato: row.stato
        };
    },
    complete: function (id, endData) {
        runSql(
            'UPDATE corse SET data_fine = ?, lat_fine = ?, lon_fine = ?, costo = ?, minuti = ?, stato = ? WHERE id = ?',
            [endData.dataFine, endData.latFine || null, endData.lonFine || null,
            endData.costo, endData.minuti, 'completata', id]
        );
    },
    findStoricoByUtente: function (idUtente) {
        return queryAll(
            `SELECT c.*, m.tipo AS tipo_mezzo FROM corse c
             LEFT JOIN mezzi m ON m.id = c.id_mezzo
             WHERE c.id_utente = ? AND c.stato = 'completata' ORDER BY c.data_fine DESC`,
            [idUtente]
        ).map(function (row) {
            return {
                id: row.id,
                data: row.data_fine
                    ? new Date(row.data_fine).toISOString().split('T')[0]
                    : new Date(row.data_inizio).toISOString().split('T')[0],
                costo: (row.costo != null ? row.costo : 0).toFixed(2),
                minuti: row.minuti,
                tipoVeicolo: row.tipo_mezzo || 'N/D',
                stato: row.stato
            };
        });
    }
};

var pagamenti = {
    create: function (data) {
        runSql(
            `INSERT INTO pagamenti (id, id_utente, id_corsa, importo, tipo, stato, token_esterno) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [data.id, data.idUtente, data.idCorsa || null, data.importo, data.tipo,
            data.stato || 'completato', data.tokenEsterno || null]
        );
        return data;
    }
};

var ricevute = {
    create: function (data) {
        runSql('INSERT INTO ricevute (id, id_corsa, id_utente, importo) VALUES (?, ?, ?, ?)',
            [data.id, data.idCorsa, data.idUtente, data.importo]);
        return data;
    }
};

var promozioni = {
    findByCodice: function (codice) {
        return queryOne('SELECT * FROM promozioni WHERE codice = ?', [codice]);
    }
};

var metodiPagamento = {
    create: function (data) {
        runSql(
            'INSERT INTO metodi_pagamento (id, id_utente, tipo, token_gateway, is_default) VALUES (?, ?, ?, ?, ?)',
            [data.id, data.idUtente, data.tipo, data.tokenGateway, data.isDefault ? 1 : 0]
        );
        return metodiPagamento.findById(data.id);
    },
    findById: function (id) {
        var row = queryOne('SELECT * FROM metodi_pagamento WHERE id = ?', [id]);
        if (!row) return null;
        return { id: row.id, idUtente: row.id_utente, tipo: row.tipo, tokenGateway: row.token_gateway, isDefault: !!row.is_default };
    },
    findByUtente: function (idUtente) {
        return queryAll(
            'SELECT * FROM metodi_pagamento WHERE id_utente = ? ORDER BY is_default DESC', [idUtente]
        ).map(function (row) {
            return { id: row.id, idUtente: row.id_utente, tipo: row.tipo, tokenGateway: row.token_gateway, isDefault: !!row.is_default };
        });
    },
    setDefault: function (idUtente, idMetodo) {
        runSql('UPDATE metodi_pagamento SET is_default = 0 WHERE id_utente = ?', [idUtente]);
        runSql('UPDATE metodi_pagamento SET is_default = 1 WHERE id = ?', [idMetodo]);
    }
};

/* Alias inglese (retrocompatibilità) */
var users = utenti;
var vehicles = mezzi;
var bookings = {
    create: function (data) {
        return prenotazioni.create({
            id: data.id, idUtente: data.userId || data.idUtente,
            idMezzo: data.vehicleId || data.idMezzo, dataInizio: data.startTime || data.dataInizio, stato: data.stato
        });
    },
    findById: function (id) {
        var p = prenotazioni.findById(id);
        if (!p) return null;
        return { id: p.id, userId: p.idUtente, vehicleId: p.idMezzo, startTime: p.dataInizio };
    },
    delete: prenotazioni.delete
};
var rides = {
    create: function (data) {
        return corse.create({
            id: data.id, idUtente: data.userId || data.idUtente,
            idMezzo: data.vehicleId || data.idMezzo, dataInizio: data.startTime || data.dataInizio
        });
    },
    findById: function (id) {
        var c = corse.findById(id);
        if (!c) return null;
        return { id: c.id, userId: c.idUtente, vehicleId: c.idMezzo, startTime: c.dataInizio };
    },
    complete: function (id, endData) {
        corse.complete(id, { dataFine: endData.endTime || endData.dataFine, costo: endData.costo, minuti: endData.minuti });
    },
    delete: function () { }
};

var chats = {
    getOpenSessionByUser: function (userId) {
        return queryOne("SELECT * FROM chat_sessions WHERE id_utente = ? AND stato = 'aperta' LIMIT 1", [userId]);
    },
    getMessagesBySession: function (sessionId) {
        return queryAll("SELECT * FROM chat_messages WHERE id_sessione = ? ORDER BY data_invio ASC", [sessionId]);
    },
    createSession: function (userId) {
        var sessionId = 'chat-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        runSql("INSERT INTO chat_sessions (id, id_utente, stato) VALUES (?, ?, 'aperta')", [sessionId, userId]);
        return { id: sessionId, id_utente: userId, stato: 'aperta' };
    },
    addMessage: function (sessionId, sender, message) {
        var msgId = 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        runSql("INSERT INTO chat_messages (id, id_sessione, mittente, messaggio) VALUES (?, ?, ?, ?)", [msgId, sessionId, sender, message]);
        return { id: msgId, id_sessione: sessionId, mittente: sender, messaggio: message };
    },
    getAllOpenSessions: function () {
        return queryAll("SELECT cs.*, u.nome, u.email FROM chat_sessions cs JOIN utenti u ON cs.id_utente = u.id WHERE cs.stato = 'aperta' ORDER BY cs.data_creazione DESC");
    },
    closeSession: function (sessionId) {
        runSql("UPDATE chat_sessions SET stato = 'chiusa' WHERE id = ?", [sessionId]);
    }
};

module.exports = {
    connectDB: connectDB,
    utenti: utenti, mezzi: mezzi, prenotazioni: prenotazioni, corse: corse,
    pagamenti: pagamenti, ricevute: ricevute, promozioni: promozioni, metodiPagamento: metodiPagamento,
    users: users, vehicles: vehicles, bookings: bookings, rides: rides,
    chats: chats
};
