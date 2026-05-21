# Guida Semplice al Progetto: SMART Mobility System (Sprint 1)

Benvenuto! Se non hai mai programmato, se sei uno studente universitario ai primi approcci, o semplicemente se è la prima volta che esplori come è fatto un software "reale", sei nel posto giusto. Questa guida ti spiegherà l'intera architettura del nostro sistema in modo chiaro, usando parole semplici.

Il nostro obiettivo per lo **Sprint 1** era creare un sistema base funzionante per il noleggio di veicoli (registrazione, visualizzazione mappa, prenotazione, corsa, pagamento simulato, e assistenza).

---

## Changelog

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

*   **`index.html`**: È lo scheletro della pagina. Definisce letteralmente i "mattoni": dove si trova il bottone "Prenota", il form per il login, o il contenitore della mappa.
*   **`style.css`**: È il vestito. Dà i colori, posiziona i riquadri al centro, arrotonda i bottoni, e rende l'applicazione bella da vedere.
*   **`app.js`**: È il cervello della pagina web. Contiene le regole del tipo: "Quando l'utente clicca sul bottone 'Login', prendi l'email e la password, spediscile al Cameriere e salva il token JWT ricevuto". Si occupa anche di disegnare i marker sulla mappa interattiva.

### ⚙️ La cartella `backend/` (Il Cameriere, i Cuochi e la Dispensa)
Questa è la parte nascosta, il motore (Server) che fa i calcoli, fa i controlli di sicurezza e ricorda i dati.

*   **`server.js` (Il Cameriere - API Gateway):** È il punto di ingresso di tutto il backend. Mette in ascolto il server sulla porta 3000. Applica il middleware JWT per proteggere tutte le rotte tranne registrazione e login.
*   **`auth.js` (Il Buttafuori - JWT):** ✅ Genera e verifica i token JWT (Bearer Token, scadenza 24h). Nessuna rotta protetta è accessibile senza un token valido.
*   **`database.js` (La Dispensa):** ✅ Database SQLite locale persistente (`smartmobility.db`). I dati sopravvivono al riavvio del server. Schema completo: `utenti`, `mezzi`, `prenotazioni`, `corse`, `pagamenti`, `ricevute`, `promozioni`, `metodi_pagamento`.
*   **`services/` (I Cuochi della Logica di Dominio):** È una sottocartella che contiene vari file separati per responsabilità (*Modularità*):
    *   ✅ `userManagement.js`: Registrazione con `bcrypt` (cost 12), login con verifica password e restituzione JWT, ricarica saldo, gestione metodi di pagamento, promozioni (IF-UT.01, 02, 12, 14).
    *   ✅ `fleetService.js`: Coordinate GPS di tutti i veicoli liberi (IF-UT.03, 04, 05).
    *   ✅ `bookingService.js`: Prenotazioni con scadenza automatica sia client-side (countdown) sia server-side (`setTimeout` 600 s) (IF-UT.07, 08, 09).
    *   ✅ `rideService.js`: Sblocco, corsa con GPS salvato, termine con costo = `durata × tariffa + tariffaSblocco`, controllo saldo insufficiente, emissione ricevuta (IF-UT.18, 11).
    *   ✅ `supportService.js`: Chat di assistenza, recensione corsa (1-5 stelle), emergenza SOS simulata (IF-UT.13, 15, 16).

---

## 2. Un esempio pratico: Il Flusso dei Soldi (Wallet System)

Per farti capire come tutte queste parti parlano tra di loro, vediamo cosa succede dietro le quinte quando fai una ricarica e paghi una corsa:

1. **Ricarichi il conto:** Sul Frontend, tu scrivi "10€" e clicchi "Ricarica".
2. **Il messaggio viaggia:** Il file `app.js` (Frontend) fa una chiamata al nostro Cameriere (`server.js`) allegando il token JWT nell'header: *"Ehi, questo utente vuole ricaricare 10€"*.
3. **Il cuoco lavora:** `server.js` verifica il token, poi passa la richiesta a `userManagement.js`. Questo servizio va in `database.js`, cerca il profilo, aggiunge i 10€ e risponde *"Fatto!"*. Sul tuo schermo appare il saldo aggiornato.
4. **Fai la corsa:** Prenoti, sblocchi e dopo un po' clicchi "Termina Corsa".
5. **Calcolo e Pagamento:** `rideService.js` calcola i minuti, applica `durata × tariffa + tariffaSblocco`, verifica che il saldo sia sufficiente, scala i soldi, registra il GPS di fine corsa e libera il veicolo rimettendolo sulla mappa.

## Perché abbiamo costruito il sistema in questo modo?

Abbiamo diviso tutto in piccoli file separati per seguire le regole base dell'**Ingegneria del Software**.
Se un domani c'è un bug nei pagamenti, un programmatore sa già che deve aprire e controllare solo `userManagement.js` o `rideService.js`, senza dover leggere milioni di righe di codice.

---

## 3. Cosa manca per completare al 100% lo Sprint 1 "Reale"?

Finora abbiamo creato un **"Mock"** (una simulazione intelligente), ovvero un prototipo funzionante che usa database locale e connessioni fittizie per dimostrare che l'idea funziona.
Secondo i documenti di progetto ufficiali (Sprint Backlog e Architettura), per trasformare questa simulazione in un sistema pronto per un uso cittadino reale, restano da sviluppare i seguenti 5 blocchi "veri":

1. ⬜ **Object Storage per Documenti e Foto (Requisito IF-UT.01):**
   * **Ora:** Il documento d'identità viene caricato in locale nella cartella `uploads/` tramite multer.
   * **Da fare:** Collegare un vero **Object Storage S3-compatible** (AWS S3 o MinIO). Le foto non andranno nel file system locale, ma in un magazzino sicuro con URL pre-firmati a scadenza (max 15 min), come specificato nel modello dati della documentazione.

2. ⬜ **PostgreSQL + Redis al posto di SQLite (Architettura):**
   * **Ora:** Usiamo `sql.js` con file `smartmobility.db` — persistente e funzionante per lo sviluppo.
   * **Da fare:** Migrare su **PostgreSQL 16 + PostGIS** (per le query geospaziali sulle zone) e **Redis 7** (cache sessioni JWT, posizioni GPS live con TTL 5 s, stato prenotazioni). Questo è necessario per reggere il carico di produzione.

3. ⬜ **Payment Gateway Reale (Requisiti IF-UT.02 e IF-UT.11):**
   * **Ora:** Il saldo sale e scende nel database locale. I token di pagamento sono stringhe mock.
   * **Da fare:** Collegare **Stripe o Adyen** (IFC-04). La tokenizzazione avverrà lato client (Stripe.js), il backend conserverà solo il token opaco — mai i dati PAN (IQ-3, PCI-DSS). I rimborsi e la ricevuta fiscale PDF saranno gestiti dallo stesso gateway.

4. ⬜ **IoT e MQTT Reale (Requisito IIN-3):**
   * **Ora:** Il comando `unlock`/`lock` al mezzo è una riga di `console.log`.
   * **Da fare:** Connettere un broker **MQTT 3.1.1** (Mosquitto o AWS IoT Core). Il Fleet Service invierà comandi reali al mezzo (topic `smart-mobility/vehicles/{id}/commands`) e riceverà telemetria GPS ogni 30 secondi (topic `.../telemetry`), come da IFC-03.

5. ⬜ **Notification Service Reale (Email, Push, SMS):**
   * **Ora:** Le notifiche (prenotazione confermata, ricevuta, SOS) sono solo `console.log`.
   * **Da fare:** Creare un **Notification Service** dedicato che integri **SendGrid** (email transazionali + ricevuta PDF), **FCM/APNs** (push mobile), e **Twilio** (SMS OTP), come da IFC-01 e dal diagramma componenti.

Una volta sostituiti questi 5 blocchi con le implementazioni reali, lo Sprint 1 sarà tecnicamente concluso e pronto per le novità dello Sprint 2 (zone no-parking, pannello operatori, dashboard Amministrazione Pubblica).

---

## 4. Come avviare il progetto

```bash
cd backend
npm install
npm start
```

Apri `frontend/index.html` nel browser. Il server è in ascolto su `http://localhost:3000`.

> **Nota:** Se aggiorni da una versione precedente, elimina `backend/smartmobility.db` prima di riavviare per applicare il nuovo schema (le migrazioni ALTER TABLE gestiscono aggiornamenti incrementali, ma un DB molto vecchio potrebbe avere conflitti).
