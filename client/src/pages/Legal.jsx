import { Link } from 'react-router-dom'
import { usePageMeta } from '../helpers.js'
import { Icon } from '../ui.jsx'

const COMPANY = {
  legalName: 'Cardinali Poligono',
  address: 'Ponte Corvo, 87046 Montalto Uffugo (CS)',
  email: 'cardinalipoligono@libero.it',
  phone: '+39 342 142 8985 o +39 335 644 8314',
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
          <Link to="/termini">Condizioni e regolamento</Link>
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
        {COMPANY.legalName}, {COMPANY.address}. Per qualsiasi richiesta sui tuoi dati scrivi a{' '}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> o telefona al {COMPANY.phone}.
      </p>

      <h2>2. Dati che trattiamo</h2>
      <ul>
        <li>
          <strong>Dati che ci fornisci prenotando:</strong> nome e cognome, email, numero di telefono, numero di partecipanti,
          attività, data e orario scelti, data e ora della prenotazione.
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
      </ul>

      <h2>Link esterni</h2>
      <p>
        I collegamenti ai nostri profili Instagram e Facebook portano a siti di terzi, che applicano le proprie informative e
        i propri cookie una volta che li visiti.
      </p>
    </LegalPage>
  )
}

const RULES_PDF = '/Regolamento_Paintball_Cardinali_Distanza_4_Metri.pdf'

const CANCEL_RULE = (
  <>
    In caso di disdetta, è obbligatorio comunicarla entro e non oltre le ore 17:00 del giorno precedente a quello
    prenotato, per consentire l’accesso al campo ad altre squadre. La disdetta deve essere comunicata telefonicamente al{' '}
    <a href="tel:+393356448314">335 644 8314</a> (Paolo) oppure tramite WhatsApp al{' '}
    <a href="https://wa.me/393421428985" target="_blank" rel="noreferrer">
      342 142 8985
    </a>{' '}
    (Angela).
  </>
)

const RULES = [
  [
    'Art. 1 — Accesso e partecipazione',
    [
      'L’accesso al gioco con marcatori da paintball è consentito a partire dai 14 anni. I partecipanti tra 14 e 17 anni possono utilizzare i marcatori esclusivamente con il consenso e sotto la sorveglianza previsti dall’art. 6, comma 3, del D.M. 17 febbraio 2020, n. 20. Il gestore verifica la documentazione e le condizioni applicabili prima dell’attività.',
      'Per iniziare una partita sono necessari almeno 8 giocatori, suddivisi in due squadre da almeno 4. I gruppi più piccoli possono aderire a una lista d’attesa per essere abbinati ad altri partecipanti.',
      'Prima di giocare è obbligatorio partecipare al briefing di sicurezza e seguire tutte le istruzioni dello staff.',
    ],
  ],
  [
    'Art. 2 — Maschere e dispositivi di protezione',
    [
      'Nelle aree di gioco e in tutte le zone segnalate con “OBBLIGO MASCHERA” o “GOGGLE ON” è obbligatorio indossare correttamente e senza interruzione una maschera specifica per paintball, anche in assenza temporanea di gioco e dopo l’eliminazione. La maschera si rimuove soltanto dopo aver raggiunto un’area sicura indicata dallo staff.',
      'Si utilizzano esclusivamente marcatori, palline e protezioni autorizzati dallo staff. È vietato manomettere le attrezzature. Sono obbligatorie calzature chiuse e abbigliamento adeguato, oltre alle ulteriori protezioni eventualmente richieste.',
      'Se la maschera si sposta, si danneggia o impedisce una corretta visione, il giocatore deve interrompere il gioco, non rimuoverla e richiedere immediatamente l’intervento dello staff. La maschera può essere tolta solo nelle aree sicure autorizzate.',
    ],
  ],
  [
    'Art. 3 — Sicurezza dei marcatori',
    [
      'Fuori dalle aree di gioco, ove previsto, il marcatore deve avere correttamente applicato il tappo o calzino di sicurezza della canna e gli altri sistemi di blocco indicati dallo staff. Tali dispositivi possono essere rimossi esclusivamente nell’area di gioco autorizzata e secondo le istruzioni ricevute.',
      'I marcatori a noleggio non possono essere trasportati fuori dall’area recintata quando lo staff ne prevede la permanenza all’interno.',
      'È vietato lanciare, lasciar cadere intenzionalmente o abbandonare i marcatori. Devono essere riposti nelle aree designate. Solo in caso di emergenza è consentito lasciarli sul campo, comunicandone immediatamente la posizione allo staff.',
      'È vietato raccogliere e riutilizzare palline da terra, anche se apparentemente integre, per evitare inceppamenti e rischi di lesione.',
      'In caso di guasto, perdita d’aria o inceppamento del marcatore, il giocatore deve interrompere il tiro e avvisare lo staff. Sono vietate riparazioni, regolazioni e interventi autonomi sui marcatori e sui sistemi di alimentazione.',
    ],
  ],
  [
    'Art. 4 — Distanze e condotta di tiro',
    [
      'È vietato sparare intenzionalmente contro un altro giocatore a una distanza inferiore a 4 metri. In caso di incontro ravvicinato si interrompe il tiro e si segue la procedura spiegata nel briefing.',
      'Non sparare a giocatori eliminati, operatori, spettatori o persone fuori dal campo. È vietato sparare in direzione della rete perimetrale da meno di 2 metri.',
      'Al comando “STOP” tutti devono interrompere immediatamente il fuoco e seguire le indicazioni dello staff.',
    ],
  ],
  [
    'Art. 5 — Campo, ripari e movimenti',
    [
      'È vietato spostare i ripari, usarli come appigli, salirvi, saltarci sopra o esercitare pressioni eccessive. I ripari servono soltanto come protezione durante il gioco.',
      'Il terreno e le strutture possono presentare irregolarità, spigoli o usura: ogni partecipante deve muoversi con prudenza. Sono vietati tuffi, capriole e movimenti che comportino urti intenzionali contro il suolo o le strutture.',
      'Sono vietati contatti fisici violenti o comunque potenzialmente pericolosi, anche tra compagni di squadra.',
    ],
  ],
  [
    'Art. 6 — Modalità, durata ed eliminazione',
    [
      'Sono previste diverse modalità di gioco illustrate prima della partita. Durata, composizione delle squadre e regole specifiche sono stabilite dallo staff. Le decisioni di arbitri e operatori devono essere rispettate.',
      'Salvo diversa modalità comunicata, è eliminato chi viene colpito da una pallina che si rompe lasciando una macchia. Il giocatore eliminato grida “COLPITO”, alza una mano, smette di sparare e raggiunge l’uscita indicata mantenendo la maschera.',
      'Il giocatore eliminato non può fornire indicazioni tattiche ai compagni.',
    ],
  ],
  [
    'Art. 7 — Salute e rischi dell’attività',
    [
      'Il paintball comporta attività fisica, movimenti rapidi e possibili situazioni di tensione. Possono verificarsi abrasioni, contusioni e danni o usura agli indumenti per effetto di urti, terreno, ripari e impatto delle palline.',
      'Chi presenta condizioni di salute, limitazioni motorie, gravidanza, interventi chirurgici recenti o altre circostanze che possano rendere rischiosa l’attività deve segnalarlo preventivamente allo staff e valutare l’idoneità con un professionista sanitario. L’elenco non è esaustivo; eventuali modalità di partecipazione adattate devono essere concordate con l’ASD.',
      'Lo staff può non consentire la partecipazione quando ritenga sussistano rischi per la persona o per gli altri. È obbligatorio segnalare tempestivamente malesseri, infortuni e guasti.',
      'In caso di infortunio, malore o situazione di pericolo, il gioco deve essere immediatamente sospeso. I partecipanti devono attenersi alle indicazioni dello staff, liberare gli accessi e non spostare la persona infortunata salvo pericolo immediato. Lo staff attiva le procedure di primo soccorso e, se necessario, chiama il numero unico di emergenza 112.',
    ],
  ],
  [
    'Art. 8 — Alcol, sostanze e comportamento',
    [
      'È vietato introdurre o consumare bevande alcoliche nella struttura e partecipare alle attività sotto l’effetto di alcol, droghe o sostanze che compromettano attenzione e riflessi. Lo staff può negare l’accesso al gioco in caso di alterazione.',
      'È obbligatorio mantenere un comportamento rispettoso verso personale, giocatori, pubblico e struttura. Sono vietati insulti, gesti offensivi, imprecazioni volgari, bestemmie e qualsiasi contatto fisico ostile o rischioso.',
      'I rifiuti devono essere conferiti nei contenitori previsti e gli spazi comuni, inclusi spogliatoi, tavoli e parcheggi, lasciati in ordine.',
      'È vietato danneggiare volontariamente attrezzature, ripari e altri beni della struttura. I danni imputabili al partecipante sono valutati secondo le norme applicabili e le circostanze del caso.',
    ],
  ],
  [
    'Art. 9 — Responsabilità e sanzioni',
    [
      'Il partecipante dichiara di essere informato che il paintball comporta rischi ordinari, tra cui urti, cadute, abrasioni, contusioni e possibili danni all’abbigliamento, e si impegna a rispettare il regolamento e le istruzioni dello staff.',
      'Il partecipante risponde, nei limiti previsti dalla legge, dei danni causati a persone o cose da proprie condotte dolose, negligenti, imprudenti o contrarie al regolamento.',
      'L’ASD Cardinali Poligono Club non risponde dei danni riconducibili esclusivamente a condotte del partecipante o di terzi, oppure ai rischi ordinari dell’attività, soltanto nei casi e nei limiti consentiti dalla legge e in base alle circostanze concrete.',
      'Nessuna disposizione del presente regolamento esclude o limita preventivamente la responsabilità dell’ASD Cardinali Poligono Club per dolo o colpa grave, né le altre responsabilità inderogabili previste dalla legge, ai sensi dell’art. 1229 del Codice civile.',
      'La firma per presa visione attesta la conoscenza del regolamento e dei rischi illustrati, ma non costituisce rinuncia ai diritti riconosciuti dalla legge.',
      'In caso di violazione, lo staff può effettuare richiami, sospendere la partita, escludere il giocatore o disporne l’allontanamento dalla struttura. L’eventuale mancato rimborso per espulsione è soggetto alle norme applicabili e alle condizioni comunicate prima dell’acquisto.',
    ],
  ],
  [
    'Art. 10 — Prenotazioni e pagamento in struttura',
    [
      'Le prenotazioni possono essere effettuate secondo le modalità comunicate dall’ASD Cardinali Poligono Club. Non è richiesta alcuna caparra né alcun pagamento anticipato.',
      'Il pagamento dell’attività avviene direttamente presso la struttura.',
      CANCEL_RULE,
      'In caso di maltempo, lo svolgimento dell’attività viene valutato con lo staff; rinvii e rimborsi seguono le condizioni preventivamente comunicate e i diritti previsti dalla legge.',
    ],
  ],
  [
    'Art. 11 — Area ristoro, spazi comuni e divieto di accesso agli animali',
    [
      'L’area ristoro è accessibile negli orari indicati dallo staff. Salvo diversa indicazione, l’utilizzo termina 60 minuti dopo la conclusione delle attività di gioco.',
      'Cibo e bevande possono essere consumati esclusivamente negli spazi autorizzati. I rifiuti devono essere raccolti e smaltiti secondo le indicazioni della struttura. È vietato accedere o sostare nelle zone non autorizzate.',
      'È vietato introdurre animali all’interno della struttura, comprese le aree di gioco, ristoro e gli spazi comuni, fatti salvi gli accessi garantiti dalla normativa vigente, inclusi quelli dei cani guida.',
      'Spettatori e accompagnatori possono accedere esclusivamente alle aree loro riservate e non possono entrare nel campo di gioco o nelle zone di tiro senza autorizzazione e dispositivi di protezione prescritti dallo staff.',
    ],
  ],
  [
    'Art. 12 — Organizzazione e accettazione',
    [
      'Le partite si svolgono secondo la disponibilità del campo e del personale. Lo staff può rinviare, sospendere o annullare le attività per maltempo, problemi tecnici o ragioni di sicurezza.',
      'La partecipazione è subordinata alla presa visione del regolamento, al briefing e alla consegna della documentazione richiesta.',
      'Fotografie e riprese effettuate dai partecipanti non devono interferire con il gioco o con la sicurezza. L’eventuale pubblicazione da parte dell’ASD di immagini riconoscibili dei partecipanti per finalità promozionali richiede una base giuridica adeguata e, quando necessario, il relativo consenso; per i minorenni si applicano le tutele specifiche previste dalla legge.',
    ],
  ],
]

export function Terms() {
  usePageMeta({
    title: 'Condizioni e regolamento',
    description: 'Condizioni di prenotazione per tutte le attività e regolamento ufficiale del paintball.',
  })
  return (
    <LegalPage
      title="Condizioni e regolamento"
      intro="ASD Cardinali Poligono Club · le regole da conoscere prima di prenotare."
    >
      <h2>Condizioni di prenotazione</h2>
      <p>Valgono per tutte le attività.</p>
      <ul>
        <li>Ogni sessione si prenota una sola volta, a nome di una persona di riferimento. Il numero di partecipanti serve a organizzare l’attività ed è indicativo.</li>
        <li>Le prenotazioni online si chiudono un’ora prima dell’inizio della sessione.</li>
        <li>Con la stessa email o lo stesso numero di telefono puoi avere al massimo 3 prenotazioni attive. Per tutelare tutti i clienti il sito può limitare le prenotazioni ripetute da una stessa connessione.</li>
        <li>Non è richiesta alcuna caparra né alcun pagamento anticipato: il prezzo indicato per la prenotazione si paga direttamente presso la struttura.</li>
        <li>{CANCEL_RULE}</li>
      </ul>

      <h2>Regolamento paintball</h2>
      <p>
        Il presente regolamento si applica alle attività di paintball presso la sede dell’ASD Cardinali Poligono Club. Il
        personale incaricato ne cura l’applicazione. Tutti i partecipanti devono attenersi al briefing e alla segnaletica
        presente.
      </p>
      <a className="btn btn-primary legal-download" href={RULES_PDF} download>
        <span>Scarica il regolamento (PDF)</span>
        <Icon name="download" size={19} />
      </a>
      {RULES.map(([title, paragraphs]) => (
        <section key={title}>
          <h2>{title}</h2>
          {paragraphs.map((text, i) => (
            <p key={i}>
              {i + 1}. {text}
            </p>
          ))}
        </section>
      ))}
      <p>
        <strong>La sicurezza di tutti dipende dal comportamento di ciascun giocatore.</strong>
      </p>
    </LegalPage>
  )
}
