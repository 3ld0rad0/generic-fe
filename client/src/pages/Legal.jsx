import { Link } from 'react-router-dom'
import { usePageMeta } from '../helpers.js'

// Da completare con i dati reali dell'attività prima della pubblicazione.
const COMPANY = {
  legalName: '[Ragione sociale]',
  vat: '[Partita IVA]',
  address: 'Via del Bosco 24, Milano',
  email: 'info@cardinalipoligono.it',
  phone: '+39 02 1234 5678',
}
const UPDATED = '22 ottobre 2026'

function LegalPage({ title, intro, children }) {
  return (
    <main className="booking-page">
      <div className="page-hero compact">
        <span className="eyebrow">Informazioni legali</span>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      <article className="legal">
        {children}
        <p className="legal-updated">Ultimo aggiornamento: {UPDATED}</p>
        <nav className="legal-links" aria-label="Altre informazioni legali">
          <Link to="/privacy">Privacy</Link>
          <Link to="/cookie">Cookie</Link>
          <Link to="/termini">Condizioni di prenotazione</Link>
        </nav>
      </article>
    </main>
  )
}

export function Privacy() {
  usePageMeta({ title: 'Informativa privacy', description: 'Come trattiamo i dati personali raccolti con la prenotazione.' })
  return (
    <LegalPage title="Informativa privacy" intro="Quali dati raccogliamo quando prenoti e come li usiamo.">
      <h2>1. Titolare del trattamento</h2>
      <p>
        {COMPANY.legalName}, P. IVA {COMPANY.vat}, {COMPANY.address}. Per qualsiasi richiesta sui tuoi dati scrivi a{' '}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> o telefona al {COMPANY.phone}.
      </p>

      <h2>2. Dati che trattiamo</h2>
      <ul>
        <li>
          <strong>Dati che ci fornisci prenotando:</strong> nome e cognome, email, numero di telefono, numero di partecipanti,
          attività, data e orario scelti, data e ora della prenotazione.
        </li>
        <li>
          <strong>Dati tecnici:</strong> l’indirizzo IP da cui ti colleghi. Il sito lo usa solo in memoria, per limitare le
          richieste ripetute e i tentativi di accesso abusivi, e non lo salva insieme alla prenotazione. I registri tecnici del
          server possono comunque conservarlo per il tempo necessario alla sicurezza e al funzionamento del servizio.
        </li>
      </ul>

      <h2>3. Perché li trattiamo e su quale base</h2>
      <ul>
        <li>Registrare e gestire la tua prenotazione, contattarti per comunicazioni legate alla sessione: esecuzione del servizio che richiedi (art. 6.1.b GDPR).</li>
        <li>Adempiere a obblighi di legge, contabili e fiscali: obbligo legale (art. 6.1.c).</li>
        <li>Garantire la sicurezza del sito e difendere un nostro diritto: legittimo interesse (art. 6.1.f).</li>
      </ul>
      <p>
        Il conferimento di nome, email e telefono è necessario per prenotare: senza questi dati non possiamo registrare la
        sessione. Non facciamo profilazione né invii pubblicitari.
      </p>

      <h2>4. Per quanto tempo li conserviamo</h2>
      <p>
        I dati di prenotazione sono conservati per [indicare il periodo, ad esempio 12 mesi dalla data della sessione] e poi
        cancellati o resi anonimi, salvo obblighi di legge che richiedano un tempo maggiore.
      </p>

      <h2>5. A chi li comunichiamo</h2>
      <p>
        I dati sono accessibili al nostro personale autorizzato e ai fornitori che ospitano e mantengono il sito
        ([indicare il fornitore di hosting]), nominati responsabili del trattamento. Non li diffondiamo e non li vendiamo.
        [Indicare se i dati restano nello Spazio economico europeo.]
      </p>

      <h2>6. Dati salvati sul tuo dispositivo</h2>
      <p>
        Se scegli “Ricorda i miei dati su questo dispositivo”, nome, email e telefono restano nella memoria del tuo browser
        per precompilare le prossime prenotazioni. Non vengono inviati a noi finché non prenoti. Puoi cancellarli in
        qualsiasi momento con “Dimentica i miei dati” nel modulo di prenotazione o svuotando i dati del sito dal browser.
      </p>

      <h2>7. I tuoi diritti</h2>
      <p>
        Puoi chiedere l’accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione del trattamento, la portabilità e
        opporti al trattamento (artt. 15-22 GDPR) scrivendo a <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. Hai
        inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali (
        <a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer">
          garanteprivacy.it
        </a>
        ).
      </p>
    </LegalPage>
  )
}

export function Cookies() {
  usePageMeta({ title: 'Cookie', description: 'Il sito non usa cookie di profilazione né strumenti di terze parti.' })
  return (
    <LegalPage title="Cookie" intro="Il sito non traccia la tua navigazione.">
      <h2>Cosa usiamo</h2>
      <p>
        Il sito non usa cookie di profilazione, cookie pubblicitari né strumenti di analisi o servizi di terze parti. Per questo
        non mostra un banner di consenso. Anche i caratteri e le immagini sono serviti dal nostro stesso dominio.
      </p>

      <h2>Memoria del browser</h2>
      <p>Il sito usa solo la memoria locale del tuo browser, e solo per queste funzioni:</p>
      <ul>
        <li>
          <strong>Dati del cliente</strong> (<code>customerData</code>): solo se scegli “Ricorda i miei dati su questo
          dispositivo”. Contiene nome, email e telefono e resta sul tuo dispositivo fino a quando non lo cancelli.
        </li>
        <li>
          <strong>Sessione dell’area riservata</strong> (<code>adminToken</code>): riguarda solo il personale che accede alla
          gestione; si cancella alla chiusura della scheda.
        </li>
      </ul>

      <h2>Link esterni</h2>
      <p>
        I collegamenti ai nostri profili Instagram e Facebook portano a siti di terzi, che applicano le proprie informative e
        i propri cookie una volta che li visiti.
      </p>
    </LegalPage>
  )
}

export function Terms() {
  usePageMeta({ title: 'Condizioni di prenotazione', description: 'Regole per prenotare, annullare e partecipare alle sessioni.' })
  return (
    <LegalPage title="Condizioni di prenotazione" intro="Le regole da conoscere prima di prenotare.">
      <h2>1. Come funziona</h2>
      <p>
        Ogni sessione si prenota una sola volta, a nome di una persona di riferimento. Il numero di partecipanti che indichi
        serve a organizzare l’attività ed è indicativo.
      </p>

      <h2>2. Limiti di prenotazione</h2>
      <ul>
        <li>Le prenotazioni online si chiudono un’ora prima dell’inizio della sessione.</li>
        <li>Con la stessa email o lo stesso numero di telefono puoi avere al massimo 3 prenotazioni attive.</li>
        <li>Per tutelare tutti i clienti il sito può limitare le prenotazioni ripetute da una stessa connessione.</li>
      </ul>

      <h2>3. Prezzo e pagamento</h2>
      <p>Il prezzo è indicato per ogni prenotazione. Il pagamento avviene direttamente al poligono.</p>

      <h2>4. Arrivo e sicurezza</h2>
      <p>
        Presentati almeno 20 minuti prima dell’inizio per il briefing e segui le indicazioni degli istruttori: la sicurezza
        viene prima di tutto. [Indicare requisiti di età, accompagnamento dei minori e idoneità fisica.]
      </p>

      <h2>5. Annullamenti e modifiche</h2>
      <p>
        Per annullare o spostare una prenotazione contattaci il prima possibile a{' '}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> o al {COMPANY.phone}, così lo slot torna disponibile per altri.
        [Indicare l’eventuale politica di annullamento tardivo.]
      </p>

      <h2>6. Maltempo e imprevisti</h2>
      <p>[Indicare come vengono gestite le sessioni annullate dal poligono per maltempo o cause di forza maggiore.]</p>

      <h2>7. Legge applicabile</h2>
      <p>Alle prenotazioni si applica la legge italiana.</p>
    </LegalPage>
  )
}
