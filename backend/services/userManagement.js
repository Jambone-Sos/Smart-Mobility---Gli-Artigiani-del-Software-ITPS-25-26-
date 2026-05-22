/* =================================================================
   SERVIZIO: User Service — userManagement.js
   -----------------------------------------------------------------
   Registrazione, login (JWT + bcrypt), profilo, ricarica,
   metodi di pagamento, promozioni.
   Requisiti: IF-UT.01, IF-UT.02, IF-UT.12, IF-UT.14
   ================================================================= */

var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var multer = require('multer');
var bcrypt = require('bcryptjs');
var db = require('../database');
var auth = require('../auth');
var notificationService = require('./notificationService');

var UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

var upload = multer({
    storage: multer.diskStorage({
        destination: UPLOAD_DIR,
        filename: function (req, file, cb) {
            cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        var ok = ['image/jpeg', 'image/png', 'application/pdf'];
        cb(null, ok.indexOf(file.mimetype) >= 0);
    }
});



/**
 * IF-UT.01 — Registrazione (UC-01)
 * POST /api/utenti/registrazione
 */
router.post('/registrazione', upload.single('documento'), async function (req, res) {
    var username = req.body.username;
    var nome = req.body.nome;
    var cognome = req.body.cognome;
    var email = req.body.email;
    var password = req.body.password;

    if (!username) return res.status(400).json({ error: 'Il campo "username" è obbligatorio' });
    if (!nome) return res.status(400).json({ error: 'Il campo "nome" è obbligatorio' });
    if (!email) return res.status(400).json({ error: 'Il campo "email" è obbligatorio' });
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'La password deve essere di almeno 6 caratteri' });
    }
    if (!req.file) {
        return res.status(400).json({ error: 'Il documento d\'identità è obbligatorio' });
    }

    /* UC-01 scenario B: email o username già registrati */
    if (db.utenti.findByEmailOrUsername(email.trim().toLowerCase()) || db.utenti.findByEmailOrUsername(username.trim())) {
        return res.status(409).json({ error: 'Email o Username già in uso. Accedi con le tue credenziali.' });
    }

    var documentoUrl = req.file ? '/uploads/' + path.basename(req.file.path) : null;
    var newUserId = 'user-' + Date.now();
    var passwordHash = bcrypt.hashSync(password, 12);

    var nuovoUtente = db.utenti.create({
        id: newUserId,
        username: username.trim(),
        nome: nome.trim(),
        cognome: cognome ? cognome.trim() : null,
        email: email.trim().toLowerCase(),
        passwordHash: passwordHash,
        saldo: 0,
        scontoAttivo: false,
        stato: 'libero',
        prenotazioneAttuale: null,
        corsaAttuale: null,
        documentoUrl: documentoUrl
    });

    var token = auth.generateToken(newUserId);
    var emailPreviewUrl = await notificationService.sendWelcomeEmail(nuovoUtente.email, nuovoUtente.nome);
    console.log('📝 Registrazione:', nuovoUtente.nome);

    res.status(201).json({
        messaggio: 'Utente registrato con successo.',
        token: token,
        userId: newUserId,
        user: nuovoUtente,
        emailPreviewUrl: emailPreviewUrl
    });
});

/**
 * IF-UT.01 — Login (email + password → JWT)
 * POST /api/utenti/login
 */
router.post('/login', function (req, res) {
    var email = req.body.email;
    var password = req.body.password;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email/Username e password sono obbligatori' });
    }

    var result = db.utenti.findByEmailOrUsername(email.trim().toLowerCase()) || db.utenti.findByEmailOrUsername(email.trim());
    if (!result) return res.status(404).json({ error: 'Utente non trovato. Registrati prima.' });

    var raw = result.raw;
    var user = result.utente;

    if (!raw.password_hash) {
        return res.status(401).json({ error: 'Account senza password. Ri-registrati.' });
    }

    if (!bcrypt.compareSync(password, raw.password_hash)) {
        return res.status(401).json({ error: 'Password errata.' });
    }

    var token = auth.generateToken(user.id);
    notificationService.sendLoginAlertEmail(user.email, user.nome);
    console.log('🔑 Login:', user.nome);
    res.json({ messaggio: 'Login effettuato.', token: token, userId: user.id, user: user });
});

/**
 * IF-UT.12 — Storico corse
 * GET /api/utenti/:idUtente/storico-corse
 */
router.get('/:idUtente/storico-corse', function (req, res) {
    var user = db.utenti.findById(req.params.idUtente);
    if (!user) return res.status(404).json({ error: 'Utente non trovato.' });
    res.json({
        messaggio: 'Storico corse recuperato.',
        corse: db.corse.findStoricoByUtente(req.params.idUtente)
    });
});

/**
 * IF-UT.02 — Lista metodi di pagamento
 * GET /api/utenti/:idUtente/metodi-pagamento
 */
router.get('/:idUtente/metodi-pagamento', function (req, res) {
    var user = db.utenti.findById(req.params.idUtente);
    if (!user) return res.status(404).json({ error: 'Utente non trovato.' });
    var metodi = db.metodiPagamento.findByUtente(req.params.idUtente);
    res.json({
        messaggio: 'Metodi di pagamento recuperati.',
        metodi: metodi.map(function (m) {
            return { id: m.id, tipo: m.tipo, isDefault: m.isDefault };
        })
    });
});

/**
 * Profilo utente
 * GET /api/utenti/:idUtente
 */
router.get('/:idUtente', function (req, res) {
    var user = db.utenti.findById(req.params.idUtente);
    if (user) res.json({ user: user });
    else res.status(404).json({ error: 'Utente non trovato.' });
});

/**
 * IF-UT.02 — Ricarica portafoglio (Payment Service simulato)
 * POST /api/utenti/ricarica
 */
router.post('/ricarica', function (req, res) {
    var userId = req.body.userId || req.body.idUtente;
    var importo = parseFloat(req.body.importo);

    if (!userId || !importo || importo <= 0) {
        return res.status(400).json({ error: 'idUtente e importo valido sono obbligatori' });
    }

    var user = db.utenti.findById(userId);
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });

    var txnId = 'pay-' + Date.now();
    db.pagamenti.create({
        id: txnId,
        idUtente: userId,
        importo: importo,
        tipo: 'ricarica',
        stato: 'completato',
        tokenEsterno: 'mock-token-' + txnId
    });

    var nuovoSaldo = parseFloat((user.saldo + importo).toFixed(2));
    db.utenti.update(userId, { saldo: nuovoSaldo });

    console.log('💳 Ricarica €' + importo + ' → ' + user.nome);

    res.json({
        messaggio: 'Ricarica di €' + importo + ' completata.',
        nuovoSaldo: nuovoSaldo,
        transazioneId: txnId
    });
});

/**
 * IF-UT.02 — Aggiungi metodo di pagamento (Payment Gateway simulato — IFC-04)
 * POST /api/utenti/metodi-pagamento
 */
router.post('/metodi-pagamento', function (req, res) {
    var userId = req.body.userId || req.body.idUtente;
    var tipo = req.body.tipo;
    var isDefault = !!req.body.isDefault;

    if (!userId || !tipo) {
        return res.status(400).json({ error: 'userId e tipo sono obbligatori' });
    }

    var user = db.utenti.findById(userId);
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });

    var metodoId = 'pm-' + Date.now();
    /* token_gateway: token opaco simulato — mai dati PAN (IQ-3, PCI-DSS) */
    var tokenGateway = 'tok_mock_' + tipo.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();

    var metodo = db.metodiPagamento.create({
        id: metodoId,
        idUtente: userId,
        tipo: tipo,
        tokenGateway: tokenGateway,
        isDefault: isDefault
    });

    if (isDefault) db.metodiPagamento.setDefault(userId, metodoId);

    console.log('💳 Metodo di pagamento aggiunto: ' + tipo + ' → ' + user.nome);
    res.status(201).json({
        messaggio: 'Metodo di pagamento aggiunto.',
        metodo: { id: metodo.id, tipo: metodo.tipo, isDefault: metodo.isDefault }
    });
});

/**
 * IF-UT.14 — Promozioni
 * POST /api/utenti/promozioni
 */
router.post('/promozioni', function (req, res) {
    var userId = req.body.userId || req.body.idUtente;
    var codice = req.body.codice;
    var user = db.utenti.findById(userId);
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });

    var promo = db.promozioni.findByCodice(codice);
    if (promo) {
        db.utenti.update(userId, { scontoAttivo: true });
        res.json({ messaggio: 'Codice applicato! Sconto ' + promo.sconto_percentuale + '% sulla prossima corsa.' });
    } else {
        res.json({ messaggio: 'Codice non riconosciuto.' });
    }
});

module.exports = router;
