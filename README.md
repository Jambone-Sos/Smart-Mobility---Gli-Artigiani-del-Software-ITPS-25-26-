# Guida Semplice al Progetto: SMART Mobility System (Sprint 1)

Benvenuto! Se non hai mai programmato, se sei uno studente universitario ai primi approcci, o semplicemente se è la prima volta che esplori come è fatto un software "reale", sei nel posto giusto. Questa guida ti spiegherà l'intera architettura del nostro sistema in modo chiaro, usando parole semplici.

Il nostro obiettivo per lo **Sprint 1** era creare un sistema base funzionante per il noleggio di veicoli (registrazione, visualizzazione mappa, prenotazione, corsa, pagamento simulato, e assistenza).

---

## Changelog

### ✅ Versione 1.3 — Mattia Di Tondo
**Correzione bug e allineamento UML Sprint 1**

Interventi effettuati:
- **Bug fix login:** `notificationService` poteva bloccare il login per 30+ secondi attendendo Ethereal Email (servizio esterno). Aggiunto timeout di 4 s con `Promise.race` — il login risponde sempre entro pochi millisecondi anche offline.
- **Veicoli sulla mappa:** aggiunto `map.invalidateSize()` dopo l'inizializzazione Leaflet per garantire che i marker vengano disegnati alla prima apertura; aggiunto null-guard in `drawMarkers()` per evitare crash se `state.vehicles` non è ancora caricato.
- **Password admin:** il seed `seedAdmin()` generava un hash bcrypt non corretto. Ora usa `bcrypt.hashSync('Admin1234', 12)` calcolato a runtime — password aggiornata nel DB e nel codice.
- **SOS (UC-18):** percorso API corretto da `/call-sos` a `/sos`; il frontend ora acquisisce le coordinate GPS prima di inviare l'allarme (UC-18 sequenza 2); il backend salva il record nella nuova tabella `segnalazioni_sos`.
- **Recensioni (UC-UT.13):** percorso API corretto da `/review` a `/recensione`; le valutazioni vengono ora persistite nella nuova tabella `recensioni` (id\_utente, stelle, id\_corsa opzionale).
- **UML alignment:** aggiunte tabelle `recensioni` e `segnalazioni_sos` al database per allineare il modello dati al diagramma delle classi v5.
- **Decisione architetturale:** confermato **SQLite** (sql.js) come database per lo Sprint 1 — stabile, zero dipendenze esterne, persistente su file. La migrazione a PostgreSQL + PostGIS è documentata come blocco Sprint 2.

### ✅ Versione 1.2 — Chat di Assistenza & Pannello Amministratore
**Sistema di chat persistente in tempo reale e account amministratore** — gli utenti possono ora comunicare con un operatore tramite una vera chat bidirezionale.

Interventi effettuati:

- **Account Amministratore:** aggiunto il concetto di `ruolo` (`user` / `admin`) nella tabella `utenti`. Al primo avvio viene creato automaticamente un account admin di sistema:
  - **Email:** `admin@smartmobility.com`
  - **Password:** `Admin1234`
- **Schema Database esteso:** create due nuove tabelle `chat_sessions` (sessioni di conversazione con stato aperta/chiusa) e `chat_messages` (singoli messaggi con mittente, testo e timestamp). Aggiunti metodi di utilità nel modulo `database.js` per gestire CRUD delle chat.
- **Backend — Nuove API REST (`supportService.js`):**
  - `GET /api/supporto/chat` — l'utente recupera i messaggi della propria sessione attiva
  - `POST /api/supporto/chat` — l'utente invia un messaggio (la sessione viene creata automaticamente se non esiste)
  - `GET /api/supporto/admin/chats` — l'admin recupera tutte le sessioni aperte (con nome ed email dell'utente)
  - `GET /api/supporto/admin/chats/:id` — l'admin legge i messaggi di una specifica sessione
  - `POST /api/supporto/admin/chats/:id/reply` — l'admin risponde a una sessione
  - `POST /api/supporto/admin/chats/:id/close` — l'admin chiude/risolve una sessione
- **Frontend — Chat Utente (`index.html` + `app.js`):** la vecchia input box di assistenza è stata sostituita con una vera interfaccia a bolle di chat (stile messenger), con bolle verdi per i messaggi inviati e grigie per le risposte dell'operatore, auto-scroll verso il basso, e aggiornamento automatico ogni 3 secondi tramite **HTTP polling**.
- **Frontend — Pannello Admin:** aggiunto un nuovo tab nella sidebar (🛡️ Pannello Admin) visibile **solo** quando l'utente loggato ha `ruolo === 'admin'`. Da qui l'amministratore può: visualizzare l'elenco delle chat aperte, selezionarne una, leggere e rispondere ai messaggi, e chiudere la conversazione una volta risolta.
- **Sicurezza:** tutte le rotte admin verificano il ruolo dell'utente tramite `db.users.findById()` prima di eseguire l'operazione, restituendo `403 Forbidden` se il richiedente non è un amministratore.

### ✅ Versione 1.1 — Mattia Di Tondo
**Miglioramento frontend e completamento mock Sprint 1** — prototipo funzionante con autenticazione, gestione saldo, prenotazione mezzi e notifiche in-app.

Interventi effettuati:
- **Autenticazione sicura:** registrazione con `bcrypt` (cost 12) + login con JWT Bearer Token (scadenza 24h), allineato a IFC-01 della documentazione
- **Database locale persistente (SQLite):** sostituito il mock in-memoria con `sql.js` su file `smartmobility.db`; schema allineato al diagramma delle classi con migrazioni safe su DB esistenti
- **Schema completato:** aggiunti `cognome` e `password_hash` in `utenti`; `prenotazione_id`, `lat_inizio/fine`, `lon_inizio/fine` in `corse`; nuova tabella `metodi_pagamento` (IF-UT.02)
- **Costo corsa corretto:** formula allineata a UC-14 → `durata × tariffa + tariffaSblocco`
- **Scadenza prenotazione lato server:** `setTimeout` da 600 s libera il mezzo anche se l'utente chiude il browser
- **Controllo saldo insufficiente:** il sistema blocca la fine corsa se il saldo è inferiore al costo
- **Frontend aggiornato:** form login con email + password; form registrazione con `cognome` + `password`; tutte le chiamate API inviano `Authorization: Bearer <token>`
- **Documentati i 5 blocchi mancanti** al completamento reale: Object Storage, PostgreSQL/Redis, Payment Gateway (Stripe/Adyen), IoT/MQTT, Notification Service

### Versione 1.0 — Push iniziale Sprint 1
Struttura iniziale del progetto con mock database in-memoria, 5 servizi REST, mappa Leaflet e interfaccia Lime-inspired.

---

## L'Idea di Base: Il Ristorante

Per capire l'architettura (cioè come i vari pezzi del programma parlano tra loro), immagina il nostro sistema come se fosse un **Ristorante**:

1. **Il Cliente al Tavolo (Frontend):** È l'applicazione che usi tu, con i pulsanti e la mappa visibile sullo schermo.
2. **Il Cameriere (API Gateway):** Prende i tuoi ordini dal tavolo (es. "Voglio prenotare questo veicolo") e li porta nella cucina del ristorante.
3. **I Cuochi specializzati (Backend - Services):** In cucina non c'è una sola persona che fa tutto. C'è chi si occupa dei soldi, chi delle prenotazioni, chi della mappa. Ognuno ha il suo compito preciso.
4. **La Dispensa (Database):** È il registro dove viene appuntato tutto in modo da non dimenticare nulla (quanti soldi hai nel conto, dove si trova il monopattino 1, chi l'ha prenotato).

---

## 1. Come sono organizzate le cartelle del progetto?

Il nostro codice si trova in una singola grande cartella, divisa in due sezioni distinte. Ecco cosa fanno e dove si trovano i file:

### 📱 La cartella `frontend/` (Il Cliente)
Questa cartella contiene tutto quello che l'utente vede (l'interfaccia). Non usa tecnologie complesse, ma solo le basi (HTML, CSS e JavaScript), per renderne facile lo studio.

*   **`index.html`**: È lo scheletro della pagina. Definisce i "mattoni": il form di login/registrazione, il contenitore della mappa, la sidebar con portafoglio/storico/assistenza/pannello admin, e i bottom panel per prenotazioni e corse.
*   **`style.css`**: È il vestito. Dà i colori, posiziona i riquadri al centro, arrotonda i bottoni, e rende l'applicazione bella da vedere con un design ispirato a Lime.
*   **`app.js`**: È il cervello della pagina web. Gestisce:
    *   Login / Registrazione (con upload documento)
    *   Mappa Leaflet con marker veicoli, popup e filtro per tipo
    *   Prenotazione, sblocco e corsa con timer
    *   Chat di assistenza in tempo reale (polling ogni 3 secondi)
    *   Pannello Admin per gestire le chat aperte (visibile solo per `ruolo === 'admin'`)

### ⚙️ La cartella `backend/` (Il Cameriere, i Cuochi e la Dispensa)
Questa è la parte nascosta, il motore (Server) che fa i calcoli, fa i controlli di sicurezza e ricorda i dati.

*   **`server.js` (Il Cameriere - API Gateway):** È il punto di ingresso di tutto il backend. Mette in ascolto il server sulla porta 3000. Applica il middleware JWT per proteggere tutte le rotte tranne registrazione e login.
*   **`auth.js` (Il Buttafuori - JWT):** ✅ Genera e verifica i token JWT (Bearer Token, scadenza 24h). Nessuna rotta protetta è accessibile senza un token valido.
*   **`database.js` (La Dispensa):** ✅ Database SQLite locale persistente (`smartmobility.db`). I dati sopravvivono al riavvio del server. Schema completo con 10 tabelle:

    | Tabella | Descrizione |
    |---|---|
    | `utenti` | Profili utente con username, email, password hash, saldo, ruolo (`user`/`admin`) |
    | `mezzi` | Flotta veicoli con tipo, batteria, coordinate GPS, tariffa |
    | `prenotazioni` | Prenotazioni attive con scadenza automatica |
    | `corse` | Storico corse con GPS inizio/fine, durata e costo |
    | `pagamenti` | Transazioni (ricariche, pagamenti corsa) |
    | `ricevute` | Ricevute digitali post-corsa |
    | `promozioni` | Codici sconto (es. `SCONTO50`) |
    | `metodi_pagamento` | Carte/metodi tokenizzati (mock PCI-DSS) |
    | `chat_sessions` | Sessioni di chat supporto (stato: aperta/chiusa) |
    | `chat_messages` | Singoli messaggi con mittente, testo e timestamp |

*   **`services/` (I Cuochi della Logica di Dominio):** È una sottocartella che contiene vari file separati per responsabilità (*Modularità*):
    *   ✅ `userManagement.js`: Registrazione con `bcrypt` (cost 12), login con verifica password e restituzione JWT, ricarica saldo, gestione metodi di pagamento, promozioni (IF-UT.01, 02, 12, 14).
    *   ✅ `fleetService.js`: Coordinate GPS di tutti i veicoli liberi (IF-UT.03, 04, 05).
    *   ✅ `bookingService.js`: Prenotazioni con scadenza automatica sia client-side (countdown) sia server-side (`setTimeout` 600 s) (IF-UT.07, 08, 09).
    *   ✅ `rideService.js`: Sblocco, corsa con GPS salvato, termine con costo = `durata × tariffa + tariffaSblocco`, controllo saldo insufficiente, emissione ricevuta (IF-UT.18, 11).
    *   ✅ `supportService.js`: Chat di assistenza persistente (utente ↔ admin), recensione corsa (1-5 stelle), emergenza SOS simulata (IF-UT.13, 15, 16). Endpoint admin protetti da controllo ruolo.

---

## 2. Un esempio pratico: Il Flusso dei Soldi (Wallet System)

Per farti capire come tutte queste parti parlano tra di loro, vediamo cosa succede dietro le quinte quando fai una ricarica e paghi una corsa:

1. **Ricarichi il conto:** Sul Frontend, tu scrivi "10€" e clicchi "Ricarica".
2. **Il messaggio viaggia:** Il file `app.js` (Frontend) fa una chiamata al nostro Cameriere (`server.js`) allegando il token JWT nell'header: *"Ehi, questo utente vuole ricaricare 10€"*.
3. **Il cuoco lavora:** `server.js` verifica il token, poi passa la richiesta a `userManagement.js`. Questo servizio va in `database.js`, cerca il profilo, aggiunge i 10€ e risponde *"Fatto!"*. Sul tuo schermo appare il saldo aggiornato.
4. **Fai la corsa:** Prenoti, sblocchi e dopo un po' clicchi "Termina Corsa".
5. **Calcolo e Pagamento:** `rideService.js` calcola i minuti, applica `durata × tariffa + tariffaSblocco`, verifica che il saldo sia sufficiente, scala i soldi, registra il GPS di fine corsa e libera il veicolo rimettendolo sulla mappa.

---

## 3. Un esempio pratico: Il Flusso della Chat di Assistenza

Vediamo come funziona la comunicazione tra un utente che ha bisogno di aiuto e l'amministratore:

1. **L'utente apre la chat:** Nella sidebar, clicca "💬 Assistenza" e scrive un messaggio, ad esempio *"Non riesco a sbloccare il veicolo 3!"*.
2. **Il backend crea la sessione:** `supportService.js` controlla se esiste già una sessione aperta per quell'utente. Se no, ne crea una nuova nella tabella `chat_sessions` e salva il messaggio in `chat_messages`.
3. **L'utente vede il suo messaggio:** Il frontend fa **polling** (una richiesta GET ogni 3 secondi) per recuperare i nuovi messaggi. La bolla verde del messaggio appare nella chat.
4. **L'admin accede al pannello:** In un'altra finestra del browser, l'amministratore fa login con `admin@smartmobility.com` / `admin`. Nella sidebar vede il tab "🛡️ Pannello Admin" (invisibile per gli utenti normali).
5. **L'admin risponde:** Clicca sulla sessione dell'utente, legge il messaggio e risponde *"Prova a chiudere e riaprire l'app"*. Il messaggio viene salvato con `mittente = 'admin'`.
6. **L'utente riceve la risposta:** Grazie al polling, la risposta appare come bolla grigia nella chat dell'utente dopo pochi secondi.
7. **Chiusura:** Quando il problema è risolto, l'admin clicca "Chiudi Chat (Risolto)". La sessione passa allo stato `chiusa` e scompare dall'elenco delle chat attive.

### Perché usiamo il Polling e non i WebSocket?

Per lo Sprint 1 abbiamo scelto il **polling HTTP** (richieste cicliche ogni 3 secondi) invece dei WebSocket per semplicità:
- Non serve nessuna libreria aggiuntiva (es. Socket.io)
- L'architettura REST rimane semplice e comprensibile
- Per un numero limitato di utenti (prototipo universitario), il polling è più che sufficiente
- In uno Sprint futuro si potrà migrare a WebSocket per prestazioni migliori

---

## 4. Perché abbiamo costruito il sistema in questo modo?

Abbiamo diviso tutto in piccoli file separati per seguire le regole base dell'**Ingegneria del Software**.
Se un domani c'è un bug nei pagamenti, un programmatore sa già che deve aprire e controllare solo `userManagement.js` o `rideService.js`, senza dover leggere milioni di righe di codice.

### Separazione dei Ruoli (RBAC)
Il sistema ora supporta il concetto di **ruoli**:
- **`user`** (default): può prenotare, fare corse, ricaricare, chattare con il supporto
- **`admin`**: ha tutte le funzionalità dell'utente, più il Pannello Admin per gestire le chat di supporto

Il ruolo è memorizzato nel campo `ruolo` della tabella `utenti` e viene incluso nell'oggetto `user` restituito dal login. Il frontend usa questo valore per mostrare/nascondere le sezioni appropriate.

---

## 5. Cosa manca per completare al 100% lo Sprint 1 "Reale"?

Finora abbiamo creato un **"Mock"** (una simulazione intelligente), ovvero un prototipo funzionante che usa database locale e connessioni fittizie per dimostrare che l'idea funziona.
Secondo i documenti di progetto ufficiali (Sprint Backlog e Architettura), per trasformare questa simulazione in un sistema pronto per un uso cittadino reale, restano da sviluppare i seguenti 5 blocchi "veri":

1. ⬜ **Object Storage per Documenti e Foto (Requisito IF-UT.01):**
   * **Ora:** Il documento d'identità viene caricato in locale nella cartella `uploads/` tramite multer.
   * **Da fare:** Collegare un vero **Object Storage S3-compatible** (AWS S3 o MinIO). Le foto non andranno nel file system locale, ma in un magazzino sicuro con URL pre-firmati a scadenza (max 15 min), come specificato nel modello dati della documentazione.

2. ⬜ **PostgreSQL + Redis (Sprint 2 — produzione):**
   * **Ora (decisione confermata Sprint 1):** Usiamo **SQLite** (`sql.js` su file `smartmobility.db`) — zero dipendenze esterne, persistente, ottimale per lo sviluppo locale e le demo universitarie. Schema completo con 12 tabelle, migrazioni safe su DB esistente.
   * **Da fare (Sprint 2):** Migrare su **PostgreSQL 16 + PostGIS** (query geospaziali per zone no-parking, IF-UT.19) e **Redis 7** (cache sessioni JWT, posizioni GPS live TTL 5 s, stato prenotazioni). Necessario per scalabilità a 5.000 sblocchi/sec (IQ-1).

3. ⬜ **Payment Gateway Reale (Requisiti IF-UT.02 e IF-UT.11):**
   * **Ora:** Il saldo sale e scende nel database locale. I token di pagamento sono stringhe mock.
   * **Da fare:** Collegare **Stripe o Adyen** (IFC-04). La tokenizzazione avverrà lato client (Stripe.js), il backend conserverà solo il token opaco — mai i dati PAN (IQ-3, PCI-DSS). I rimborsi e la ricevuta fiscale PDF saranno gestiti dallo stesso gateway.

4. ⬜ **IoT e MQTT Reale (Requisito IIN-3):**
   * **Ora:** Il comando `unlock`/`lock` al mezzo è una riga di `console.log`.
   * **Da fare:** Connettere un broker **MQTT 3.1.1** (Mosquitto o AWS IoT Core). Il Fleet Service invierà comandi reali al mezzo (topic `smart-mobility/vehicles/{id}/commands`) e riceverà telemetria GPS ogni 30 secondi (topic `.../telemetry`), come da IFC-03.

5. ✅ **Notification Service Reale (Email):**
   * **Implementato:** È stato integrato `nodemailer` con un account di test dinamico **Ethereal Email**. 
   * **Funzionamento:** Alla registrazione e al login, il sistema genera un'email HTML e restituisce un URL di anteprima. Il frontend rileva questo URL e chiede all'utente se desidera aprire l'email direttamente in una nuova scheda del browser. Questo permette di testare l'invio reale delle email senza necessitare di configurazioni SMTP complesse o variabili d'ambiente.
   * **Da fare (Futuro):** Integrare **FCM/APNs** (push mobile) e **Twilio** (SMS OTP) come da IFC-01.

Una volta sostituiti questi 5 blocchi con le implementazioni reali, lo Sprint 1 sarà tecnicamente concluso e pronto per le novità dello Sprint 2 (zone no-parking, pannello operatori, dashboard Amministrazione Pubblica).

---

## 6. Mappa delle API REST

Tutte le rotte sono protette da JWT, tranne registrazione e login.

### Utenti (`/api/utenti`)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/registrazione` | Registrazione con upload documento (🔓 pubblica) |
| `POST` | `/login` | Login con email/username + password → JWT (🔓 pubblica) |
| `GET` | `/:idUtente` | Profilo utente |
| `GET` | `/:idUtente/storico-corse` | Storico corse completate |
| `POST` | `/ricarica` | Ricarica saldo portafoglio |
| `POST` | `/promozioni` | Applica codice promo |
| `GET` | `/:idUtente/metodi-pagamento` | Lista metodi di pagamento |
| `POST` | `/metodi-pagamento` | Aggiungi metodo di pagamento |

### Mezzi (`/api/mezzi`)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/` | Lista tutti i mezzi con coordinate GPS |

### Prenotazioni (`/api/prenotazioni`)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/` | Prenota un mezzo (scadenza 10 min) |
| `POST` | `/annulla` | Annulla prenotazione attiva |

### Corse (`/api/corse`)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/sblocco` | Sblocca il mezzo e inizia la corsa |
| `POST` | `/termine` | Termina la corsa, calcola costo e scala saldo |

### Supporto (`/api/supporto`)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/chat` | Messaggi della sessione chat attiva (utente) |
| `POST` | `/chat` | Invia messaggio al supporto (utente) |
| `POST` | `/sos` | Attiva allarme SOS con GPS (UC-18) |
| `POST` | `/recensione` | Invia recensione 1-5 stelle (UC-UT.13) |
| `GET` | `/admin/chats` | Lista sessioni aperte (🔒 solo admin) |
| `GET` | `/admin/chats/:id` | Messaggi di una sessione (🔒 solo admin) |
| `POST` | `/admin/chats/:id/reply` | Rispondi a una sessione (🔒 solo admin) |
| `POST` | `/admin/chats/:id/close` | Chiudi sessione risolta (🔒 solo admin) |

---

## 7. Come avviare il progetto

### Prerequisiti
- **Node.js** v18 o superiore
- **npm** (incluso con Node.js)

### Avvio rapido

```bash
# 1. Installa le dipendenze del backend
cd backend
npm install

# 2. Avvia il server API (porta 3000)
npm start
```

In un secondo terminale (opzionale, per un'esperienza migliore):

```bash
# 3. Servi il frontend con un server locale (porta 8080, senza cache)
npx -y http-server ./frontend -p 8080 -c-1
```

Poi apri **http://localhost:8080** nel browser.

> **Alternativa senza http-server:** Puoi anche aprire direttamente il file `frontend/index.html` nel browser. Il server API è in ascolto su `http://localhost:3000`.

### Account di test

| Ruolo | Email | Password |
|-------|-------|----------|
| 👑 Admin | `admin@smartmobility.com` | `Admin1234` |
| 👤 Utente | Registrati dal form | (scegli tu) |

## 🚀 Tutorial: Come Avviare e Testare l'App in Locale

1. **Avviare il Server Backend:**
   Apri un terminale nella cartella `backend` ed esegui:
   ```bash
   cd backend
   npm install
   npm start
   ```
   Il server partirà sulla porta `http://localhost:3000`.

2. **Avviare il Frontend:**
   Non c'è bisogno di un server complesso, puoi semplicemente fare **doppio clic sul file `frontend/index.html`** per aprirlo nel browser, oppure se preferisci usare un web server locale esegui (in un altro terminale, nella root):
   ```bash
   npx -y http-server ./frontend -p 8080 -c-1
   ```

3. **Testare le Funzionalità:**
   * **Registrazione & Notifiche Email:** Vai sul frontend, clicca "Registrati", inserisci i dati e seleziona un file a caso per il documento d'identità. Al successo, si aprirà in automatico un pop-up: clicca "OK" per visualizzare l'email HTML inviata tramite il servizio mock Ethereal!
   * **Chat Supporto (Admin vs Utente):** Apri due finestre del browser (una normale e una in incognito). Nella prima, fai login come utente normale e scrivi in "💬 Assistenza". Nella seconda, fai login con le credenziali `admin@smartmobility.com` (password: `Admin1234`), vai nel "🛡️ Pannello Admin", seleziona l'utente e rispondi. Vedrai i messaggi apparire da una finestra all'altra!

---

## 🌐 Tutorial: Come Hostare su Vercel (Gratis)

Vercel è una piattaforma fantastica e gratuita per hostare frontend e API backend in Node.js.

### Passo 1: Preparare il file di configurazione
Nella cartella principale (root) del progetto, crea un file chiamato `vercel.json` e incolla questo codice:
```json
{
  "version": 2,
  "builds": [
    { "src": "backend/server.js", "use": "@vercel/node" },
    { "src": "frontend/**", "use": "@vercel/static" }
  ],
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/backend/server.js" },
    { "source": "/(.*)", "destination": "/frontend/$1" }
  ]
}
```

### Passo 2: Effettuare il Deploy

**Metodo 1: Tramite GitHub (Consigliato e automatico)**
1. Assicurati che tutto il codice sia "pushato" sul tuo repository GitHub.
2. Vai su [vercel.com](https://vercel.com/) e accedi col tuo account GitHub.
3. Clicca su **Add New Project** e seleziona il tuo repository.
4. Lascia tutte le impostazioni di default (Vercel leggerà automaticamente il file `vercel.json`) e clicca su **Deploy**.
5. Finito! Avrai un link pubblico (es. `tuo-progetto.vercel.app`).

**Metodo 2: Tramite Terminale**
1. Installa la CLI di Vercel: `npm i -g vercel`
2. Nel terminale, assicurati di essere nella cartella root del progetto ed esegui: `vercel`
3. Segui le istruzioni a schermo premendo sempre Invio (Yes) per usare i default.

> ⚠️ **ATTENZIONE SU VERCEL E SQLITE:** 
> Vercel utilizza un'architettura **Serverless**. Significa che il file del database locale (`smartmobility.db`) verrà resettato ogni volta che la funzione si spegne o viene riavviata (circa ogni 15 minuti di inattività). L'app funzionerà perfettamente per mostrare un portfolio, ma per renderla "pronta alla produzione" e mantenere i dati degli utenti salvati per sempre, dovrai migrare SQLite su un database esterno come **PostgreSQL** (es. Supabase o Neon), come descritto al punto 2 dello Sprint 1 Reale!

---
*Documentazione aggiornata al termine dell'implementazione del Notification Service - ITPS 25-26*
