const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
    if (!transporter) {
        const testAccount = await Promise.race([
            nodemailer.createTestAccount(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Ethereal timeout')), 4000))
        ]);
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass },
        });
        console.log("📨 Ethereal Email account pronto per i test!");
    }
    return transporter;
}

/**
 * Invia un'email di benvenuto dopo la registrazione
 */
async function sendWelcomeEmail(email, nome) {
    try {
        const t = await getTransporter();
        const htmlTemplate = `
            <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                <h1 style="color: #4CAF50;">Benvenuto su SMART Mobility! 🚗</h1>
                <p>Ciao <b>${nome}</b>,</p>
                <p>Siamo felici di averti a bordo. La tua registrazione è stata completata con successo!</p>
                <p>Ora puoi prenotare, noleggiare e gestire la tua mobilità intelligente direttamente dalla nostra piattaforma.</p>
                <br/>
                <p style="font-size: 12px; color: #777;">Il team di SMART Mobility</p>
            </div>
        `;

        const info = await t.sendMail({
            from: '"SMART Mobility Support" <support@smartmobility.com>',
            to: email,
            subject: "Benvenuto su SMART Mobility! 🎉",
            text: `Ciao ${nome}, benvenuto su SMART Mobility! La tua registrazione è avvenuta con successo.`,
            html: htmlTemplate,
        });

        console.log(`📧 [Email Inviata] Benvenuto a ${email}`);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log("🔗 URL Anteprima Email: %s", previewUrl);
        return previewUrl;
    } catch (err) {
        console.error("Errore durante l'invio dell'email di benvenuto:", err);
    }
}

/**
 * Invia un'email di avviso dopo un login avvenuto con successo
 */
async function sendLoginAlertEmail(email, nome) {
    try {
        const t = await getTransporter();
        const date = new Date().toLocaleString('it-IT');
        
        const htmlTemplate = `
            <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 5px;">
                <h2 style="color: #FF9800;">Avviso di Sicurezza - SMART Mobility 🛡️</h2>
                <p>Ciao <b>${nome}</b>,</p>
                <p>Ti informiamo che è stato rilevato un nuovo accesso al tuo account in data <b>${date}</b>.</p>
                <p>Se sei stato tu, puoi ignorare questa email. Se invece non riconosci questo accesso, ti consigliamo di cambiare immediatamente la password e contattare l'assistenza.</p>
                <br/>
                <p style="font-size: 12px; color: #777;">Il team di sicurezza di SMART Mobility</p>
            </div>
        `;

        const info = await t.sendMail({
            from: '"SMART Mobility Security" <security@smartmobility.com>',
            to: email,
            subject: "Nuovo Accesso Rilevato",
            text: `Ciao ${nome}, abbiamo rilevato un nuovo accesso al tuo account in data ${date}. Se non sei tu, contatta il supporto.`,
            html: htmlTemplate,
        });

        console.log(`📧 [Email Inviata] Avviso Login a ${email}`);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log("🔗 URL Anteprima Email: %s", previewUrl);
        return previewUrl;
    } catch (err) {
        console.error("Errore durante l'invio dell'email di login:", err);
    }
}

module.exports = {
    sendWelcomeEmail,
    sendLoginAlertEmail
};
