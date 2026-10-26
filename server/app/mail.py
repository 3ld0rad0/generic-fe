import logging
import os
import smtplib
from email.message import EmailMessage

log = logging.getLogger("mail")

ACTIVITY_NAMES = {"paintball": "Paintball", "arco": "Tiro con l'arco", "carabina": "Carabina"}


def booking_message(booking, sender, base_url):
    """Costruisce la mail di conferma; `booking` è un dict con i dati della prenotazione."""
    msg = EmailMessage()
    msg["Subject"] = "Conferma prenotazione"
    msg["From"] = sender
    msg["To"] = booking["email"]
    date = "/".join(reversed(booking["date"].split("-")))
    body = (
        f"Ciao {booking['name']},\n\n"
        "la tua prenotazione è confermata.\n\n"
        f"Attività: {ACTIVITY_NAMES.get(booking['activity'], booking['activity'])}\n"
        f"Data: {date}\n"
        f"Ora: {booking['time']}\n"
        f"Partecipanti: {booking['players']}\n"
        f"Totale: {booking['price_cents'] / 100:.2f} EUR (pagamento al poligono)\n\n"
        "Se non puoi più venire, annulla la prenotazione da questo link:\n"
        f"{base_url.rstrip('/')}/annulla/{booking['cancel_token']}\n\n"
        "Le prenotazioni si possono annullare fino all'inizio della sessione: "
        "così lasci il posto a qualcun altro.\n"
    )
    msg.set_content(body)
    return msg


def admin_message(booking, sender, admin_email):
    """Mail all'admin per una nuova prenotazione."""
    msg = EmailMessage()
    msg["Subject"] = f"Nuova prenotazione #{booking['id']}"
    msg["From"] = sender
    msg["To"] = admin_email
    date = "/".join(reversed(booking["date"].split("-")))
    msg.set_content(
        f"{ACTIVITY_NAMES.get(booking['activity'], booking['activity'])} - {date} alle {booking['time']}\n"
        f"Nome: {booking['name']}\n"
        f"Partecipanti: {booking['players']}\n"
        f"Telefono: {booking['phone']}\n"
        f"Email: {booking['email']}\n"
    )
    return msg


def cancellation_admin_message(booking, sender, admin_email):
    """Mail all'admin per una disdetta."""
    msg = EmailMessage()
    msg["Subject"] = f"Disdetta prenotazione #{booking['id']}"
    msg["From"] = sender
    msg["To"] = admin_email
    date = "/".join(reversed(booking["date"].split("-")))
    msg.set_content(
        f"{ACTIVITY_NAMES.get(booking['activity'], booking['activity'])} - {date} alle {booking['time']}\n"
        f"Nome: {booking['name']}\n"
        f"Partecipanti: {booking['players']}\n"
        f"Telefono: {booking['phone']}\n"
        f"Email: {booking['email']}\n"
    )
    return msg


def smtp_mailer_from_env():
    """Ritorna `send(booking)`.

    Nuova prenotazione: conferma al cliente e, se ADMIN_EMAIL è impostata, avviso all'admin.
    Con `booking["event"] == "cancelled"`: solo avviso di disdetta all'admin, se ADMIN_EMAIL è impostata.
    Senza SMTP_HOST le mail vengono solo scritte nel log.
    """
    host = os.environ.get("SMTP_HOST")
    sender = os.environ.get("MAIL_FROM", "no-reply@localhost")
    base_url = os.environ.get("PUBLIC_URL", "http://localhost:5173")
    admin_email = os.environ.get("ADMIN_EMAIL")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user, password = os.environ.get("SMTP_USER"), os.environ.get("SMTP_PASSWORD")

    def deliver(msg):
        if not host:
            log.warning("SMTP_HOST non impostato, mail non inviata:\n%s", msg)
            return
        try:
            with smtplib.SMTP(host, port, timeout=15) as smtp:
                smtp.starttls()
                if user:
                    smtp.login(user, password or "")
                smtp.send_message(msg)
        except Exception:
            log.exception("Invio mail fallito (destinatario %s)", msg["To"])

    def send(booking):
        if booking.get("event") == "cancelled":
            if admin_email:
                deliver(cancellation_admin_message(booking, sender, admin_email))
            return
        deliver(booking_message(booking, sender, base_url))
        if admin_email:
            deliver(admin_message(booking, sender, admin_email))

    return send
