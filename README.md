# Guida Semplice al Progetto: SMART Mobility System (Sprint 1)

Benvenuto! Se non hai mai programmato, se sei uno studente universitario ai primi approcci, o semplicemente se è la prima volta che esplori come è fatto un software "reale", sei nel posto giusto. Questa guida ti spiegherà l'intera architettura del nostro sistema in modo chiaro, usando parole semplici.

Il nostro obiettivo per lo **Sprint 1** era creare un sistema base funzionante per il noleggio di veicoli (registrazione, visualizzazione mappa, prenotazione, corsa, pagamento simulato, e assistenza).

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
*   **`style.css`**: È il vestito. Dà i colori, posiziona i riquadri al centro, arrotonda i bottoni, e rende l'applicazione bella da vedere (ad esempio nascondendo le schermate che non ti servono in quel momento).
*   **`app.js`**: È il cervello della pagina web. Contiene le regole del tipo: "Quando l'utente clicca sul bottone 'Login', prendi il nome che ha scritto e spediscilo al Cameriere". Si occupa anche di disegnare i marker (segnalini) sulla mappa interattiva.

### ⚙️ La cartella `backend/` (Il Cameriere, i Cuochi e la Dispensa)
Questa è la parte nascosta, il motore (Server) che fa i calcoli, fa i controlli di sicurezza e ricorda i dati.

*   **`server.js` (Il Cameriere - API Gateway):** È il punto di ingresso di tutto il backend. Mettiamo in ascolto il nostro server sulla "porta 3000". Quando arriva una richiesta dal frontend, `server.js` la smista alla sezione giusta. 
*   **`database.js` (La Dispensa):** Nello Sprint 1 non abbiamo usato un database complesso (come MySQL o Oracle). Abbiamo usato un "Mock Database", ovvero un semplice file che contiene una memoria finta (un elenco di utenti, un elenco di veicoli) che dura finché il server è acceso. È utile per testare velocemente!
*   **`services/` (I Cuochi della Logica di Dominio):** È una sottocartella che contiene vari file. Invece di avere un unico file gigante e incomprensibile, abbiamo separato le responsabilità (si chiama *Modularità*):
    *   `userManagement.js`: Gestisce la creazione dell'account, il login e ricarica il saldo del portafoglio (Requisiti IF-UT.01, 02).
    *   `fleetService.js`: Conosce le coordinate GPS di tutti i veicoli liberi e te le invia (Requisiti IF-UT.03, 04, 05).
    *   `bookingService.js`: Gestisce le prenotazioni. Mette un "lucchetto virtuale" a un mezzo dicendo: "È di questo utente per 10 minuti" (Requisiti IF-UT.07, 08).
    *   `rideService.js`: Si occupa della corsa vera e propria. La fa partire, la fa finire e soprattutto scala i soldi dal tuo account in base ai minuti (Requisiti IF-UT.18, 11).
    *   `supportService.js`: Finge un sistema di chat di assistenza, permette di recensire la corsa e simula le chiamate SOS (Requisiti IF-UT.13, 15, 16).

---

## 2. Un esempio pratico: Il Flusso dei Soldi (Wallet System)

Per farti capire come tutte queste parti parlano tra di loro, vediamo cosa succede dietro le quinte quando fai una ricarica e paghi una corsa:

1. **Ricarichi il conto:** Sul Frontend, tu scrivi "10€" e clicchi "Ricarica".
2. **Il messaggio viaggia:** Il file `app.js` (Frontend) fa una chiamata al nostro Cameriere (`server.js`) dicendo: *"Ehi, questo utente vuole ricaricare 10€"*.
3. **Il cuoco lavora:** `server.js` sa che di soldi se ne occupa `userManagement.js`, quindi gli passa l'informazione. Questo servizio va in `database.js` (la dispensa), cerca il tuo profilo, aggiunge i 10€ e risponde *"Fatto!"*. Sul tuo schermo appare il saldo aggiornato.
4. **Fai la corsa:** Prenoti, sblocchi e dopo un po' clicchi "Termina Corsa".
5. **Calcolo e Pagamento:** Stavolta il Cameriere passa la palla a `rideService.js`. Questo servizio calcola quanti minuti hai viaggiato, verifica quanto costa il veicolo al minuto, va nella dispensa, prende i soldi dal tuo saldo (scalandoli) e poi libera il veicolo, rimettendolo sulla mappa per gli altri.

## Perché abbiamo costruito il sistema in questo modo?

Abbiamo diviso tutto in piccoli file separati per seguire le regole base dell'**Ingegneria del Software**. 
Se un domani c'è un bug nei pagamenti, un programmatore sa già che deve aprire e controllare solo `userManagement.js` o `rideService.js`, senza dover leggere milioni di righe di codice. 

Tutto il codice presente attualmente (sia frontend che backend) soddisfa al 100% i requisiti logici dello **Sprint 1**, permettendoci di dimostrare un flusso end-to-end (dall'ingresso nell'app, al pagamento della corsa) funzionante e facile da spiegare.

---

## 3. Cosa manca per completare al 100% lo Sprint 1 "Reale"?

Finora abbiamo creato un **"Mock"** (una simulazione intelligente), ovvero un prototipo funzionante che usa memoria temporanea e connessioni fittizie per dimostrare che l'idea funziona. 
Secondo i documenti di progetto ufficiali (il tuo Sprint Backlog e l'Architettura), per trasformare questa simulazione in un sistema pronto per un uso cittadino reale, restano da sviluppare i seguenti pezzi "veri":

1. **Fotografie e Documenti d'Identità (Requisito IF-UT.01):**
   * **Ora:** Ci registriamo inserendo solo il nome.
   * **Da fare:** Implementare il caricamento (upload) vero e proprio della foto della patente o carta d'identità. Queste foto pesanti non andranno nel database normale, ma in un "magazzino" speciale e sicuro per i file, chiamato **Object Storage (S3)**.

2. **Sostituire la Dispensa con un Database Vero:**
   * **Ora:** Usiamo `database.js`, che perde tutti i dati appena spegniamo il computer.
   * **Da fare:** Collegare **PostgreSQL**, un vero e proprio schedario d'acciaio che salva i dati per sempre (in modo sicuro e criptato), insieme a **Redis**, una memoria ultra-veloce (come la RAM) che serve per tracciare la posizione dei mezzi in tempo reale senza rallentare il sistema.

3. **Pagamenti Veri e Sicuri (Requisiti IF-UT.02 e IF-UT.11):**
   * **Ora:** Clicchiamo "Ricarica 10€" e il saldo sale magicamente.
   * **Da fare:** Collegare un vero *Payment Gateway* (come Stripe o Adyen). Il sistema chiederà la carta di credito, riceverà un "Gettone sicuro" (Token) dalla banca e preleverà i soldi veri, emettendo persino una ricevuta fiscale. I dati della carta non saranno mai salvati da noi, per rispettare le rigide norme di sicurezza (PCI-DSS).

4. **Collegarsi ai Mezzi Fisici (IoT e Requisito IIN-3):**
   * **Ora:** Diciamo che il mezzo è sbloccato semplicemente cambiando una scritta sullo schermo.
   * **Da fare:** Il nostro Backend dovrà parlare con il "cervellino elettronico" (IoT) installato sul monopattino fisico tramite un protocollo speciale (MQTT). Il Server manderà l'impulso fisico per far scattare il lucchetto, e il monopattino inizierà a inviarci la sua vera posizione GPS ogni 30 secondi.

5. **Email e Notifiche sul Cellulare:**
   * **Ora:** I messaggi (come "Prenotazione scaduta") compaiono solo se hai la pagina web aperta.
   * **Da fare:** Creare un servizio dedicato (*Notification Service*) in grado di mandare veri SMS, Push sul cellulare o una vera email contenente il PDF della ricevuta a fine corsa (nel rispetto della privacy del GDPR).

Una volta sostituiti questi 5 "mattoncini finti" con i "mattoncini veri", lo Sprint 1 sarà tecnicamente concluso e pronto a ospitare tutte le novità previste per lo Sprint 2 (come le zone di divieto di sosta e le interfacce per gli operatori sul campo)!
