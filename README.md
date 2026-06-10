# SMART Mobility System

**Versione:** 9.1
**Realizzato da:** Gli Artigiani del Software (Facchini Domenico, Gambarrota Antonio, Di Tondo Mattia)

## Introduzione
Il sistema **SMART Mobility** è una piattaforma integrata di mobilità sostenibile per il Comune di Zootropolis. Consente agli utenti di localizzare, prenotare e utilizzare mezzi di trasporto in sharing (biciclette, monopattini, auto e motocicli elettrici) tramite un'applicazione mobile e offre strumenti avanzati di gestione e monitoraggio per gli operatori e per l'Amministrazione Pubblica.

## Architettura del Sistema
Il progetto (in versione Sprint 2) è stato sviluppato seguendo un'architettura modulare:
- **Backend:** Node.js con framework Express. Architettura a microservizi (Auth, Payment, SOS, User Management) isolati in moduli separati.
- **Database:** SQLite (tramite `sql.js`). Database relazionale per la gestione sicura di utenti (con password hashate via `bcrypt`), mezzi, prenotazioni e corse.
- **Autenticazione:** Basata su JSON Web Token (JWT).
- **Frontend:** HTML, CSS e JavaScript vanilla per garantire alte performance, con un'interfaccia responsiva, dinamica e basata sul tema scuro (glassmorphism).

## Requisiti di Sistema
- **Node.js** (versione consigliata 18+ o superiore)
- **npm** (Node Package Manager)

## Istruzioni per l'Avvio in Locale (Localhost)

Per testare l'applicazione in ambiente locale, è necessario avviare separatamente il backend (che fornisce le API REST) e il frontend.

### 1. Avvio del Backend

Il backend gestisce il database SQLite, l'autenticazione JWT, le notifiche email simulate (tramite Ethereal/Nodemailer) e i vari microservizi.

1. Aprire il terminale e posizionarsi nella cartella del progetto.
2. Spostarsi nella cartella `backend`:
   ```bash
   cd backend
   ```
3. Installare le dipendenze richieste (`express`, `sqlite3`, `bcryptjs`, `jsonwebtoken`, ecc.):
   ```bash
   npm install
   ```
4. Avviare il server:
   ```bash
   npm start
   ```
   *Il server si avvierà in ascolto (tipicamente sulla porta 3000 o 5000, come specificato nel terminale).*

### 2. Avvio del Frontend

Il frontend è composto da file statici (Vanilla JS, HTML, CSS). Non richiede un processo di build complesso.

Opzione A: Usare un server HTTP leggero (Consigliata)
Se hai Node.js installato, puoi usare `serve` per servire la cartella `frontend`:
1. Aprire una **nuova finestra** del terminale.
2. Posizionarsi nella directory radice del progetto e avviare:
   ```bash
   npx serve frontend
   ```
3. Aprire il browser all'indirizzo restituito dal comando (es. `http://localhost:3000` o `http://localhost:5000`).

Opzione B: VS Code Live Server
Se utilizzi Visual Studio Code, puoi installare l'estensione **Live Server**, fare clic col tasto destro sul file `frontend/index.html` e selezionare **"Open with Live Server"**.

## Credenziali di Accesso (Admin)
Il database include un account predefinito per testare le funzionalità amministrative e di backoffice:
- **Email:** `admin@smartmobility.com` (oppure username: `admin`)
- **Password:** `Admin1234`

## Documentazione e Struttura
- **`/backend`**: Contiene il server `server.js`, il file del database `database.js`, i moduli di servizio e i file relativi al caricamento.
- **`/frontend`**: Contiene le viste (`index.html`), i fogli di stile (`style.css`) e la logica client (`app.js`).

Per un dettaglio completo sui casi d'uso (UT, OP, AP), si rimanda alla documentazione ufficiale del Product Backlog allegata al progetto.
