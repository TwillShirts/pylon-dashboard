# Dashboard Τζίρου Καταστημάτων (PYLON)

Mobile-first dashboard που δείχνει τον ημερήσιο τζίρο για 3 καταστήματα και
ανανεώνεται αυτόματα κάθε 5 λεπτά. Φτιαγμένο με Next.js, έτοιμο για deploy
στο Vercel.

## Τρέχουσα κατάσταση

Το dashboard είναι **πλήρως λειτουργικό με demo δεδομένα** (`PYLON_MOCK=true`,
προεπιλογή) — άνοιξέ το και δουλεύει αμέσως, με ρεαλιστικά νούμερα ανά ώρα
για τα 3 καταστήματα. Το πραγματικό PYLON Connectivity API (μέσω Epsilon
Digital) δεν έχει δημόσια τεκμηρίωση με τα ακριβή endpoints — αυτά τα δίνει
η υποστήριξη PYLON/Epsilon Digital μόλις εγκριθεί ο δικός σου API user. Η
σύνδεση με το πραγματικό API είναι ήδη «καλωδιωμένη» σε ένα σημείο
(`lib/pylon.js`) ώστε να χρειάζεται μόνο να συμπληρώσεις τα σωστά endpoint
paths μόλις τα πάρεις.

## Δομή του project

```
app/
  page.js              το ίδιο το dashboard (UI, polling κάθε 5')
  layout.js            βασικό layout / meta
  globals.css          στυλ (mobile-first, ανοιχτόχρωμο/σκούρο θέμα)
  api/turnover/route.js  serverless endpoint που το page.js καλεί
lib/
  pylon.js             προσαρμογέας για το PYLON API (mock + real mode)
.env.example           όλες οι μεταβλητές περιβάλλοντος που χρειάζεσαι
```

## 1. Τοπική δοκιμή (προαιρετικό)

```bash
npm install
npm run dev
```

Άνοιξε http://localhost:3000 — θα δεις demo δεδομένα.

## 2. Ανέβασμα στο GitHub

Ο φάκελος έχει ήδη αρχικοποιηθεί ως git repo με ένα πρώτο commit. Χρειάζεται
μόνο να τον συνδέσεις με ένα κενό repository στο GitHub:

```bash
git remote add origin https://github.com/<το-username-σου>/pylon-dashboard.git
git branch -M main
git push -u origin main
```

(Δημιούργησε πρώτα ένα **κενό** repo στο github.com/new — χωρίς README, χωρίς
.gitignore, για να μην έρθει σε σύγκρουση με τα υπάρχοντα αρχεία.)

## 3. Deploy στο Vercel

1. Πήγαινε στο [vercel.com/new](https://vercel.com/new) και κάνε import το
   repository που μόλις έφτιαξες (σύνδεσε τον GitHub λογαριασμό σου αν δεν
   είναι ήδη συνδεδεμένος).
2. Το Vercel αναγνωρίζει αυτόματα ότι είναι Next.js — δεν χρειάζεται καμία
   ρύθμιση build.
3. Πριν πατήσεις Deploy (ή μετά, από Project → Settings → Environment
   Variables), πρόσθεσε:
   - `PYLON_STORES` = `Παλαιό Φάληρο:1001,Γλυφάδα:1002,Κηφισιά:1003`
     (βάλε τα πραγματικά ονόματα/IDs των 3 καταστημάτων σου)
   - `PYLON_MOCK` = `true` (άφησέ το `true` μέχρι να έχεις πρόσβαση στο
     πραγματικό PYLON API)
4. Deploy. Θα πάρεις ένα link τύπου `pylon-dashboard.vercel.app` — αυτό είναι
   το mobile dashboard, ανοίγει κανονικά από κινητό.

Κάθε φορά που κάνεις `git push`, το Vercel κάνει αυτόματα νέο deploy.

## 4. Απόκτηση πρόσβασης στο πραγματικό PYLON API

Αυτό είναι ακριβώς αυτό που περιέγραφε το σημείωμα: πρέπει να ζητήσεις από
την Epsilon Digital / PYLON support να επιβεβαιώσουν τα εξής, πριν μπορέσεις
να βάλεις live δεδομένα:

- Αν υπάρχει δυνατότητα σύνδεσης API μέσω Epsilon Digital.
- Αν μπορείτε να δημιουργήσετε Χρήστη API Παρόχου + service account
  (η διαδικασία που βρήκες: Epsilon Digital → Συνδρομή → Ενέργειες →
  Δημιουργία Χρήστη API → Δημιουργία service account — επιβεβαιώθηκε ότι
  είναι η σωστή διαδρομή).
- Ποια reports/endpoints δίνει το API: τζίρος ημέρας, πωλήσεις ανά
  κατάστημα, ανά τρόπο πληρωμής, ακυρώσεις/επιστροφές.
- Σε τι μορφή βγαίνουν τα δεδομένα (JSON/REST είναι ό,τι χρειάζεται αυτό το
  dashboard).
- Αν υπάρχει test/staging περιβάλλον.
- Ποια ακριβώς credentials θα πάρεις (client id/secret, api key, κ.λπ.) και
  ποιο είναι το token endpoint / base URL.

Η δημόσια τεκμηρίωση της Epsilon Net επιβεβαιώνει μόνο τα βήματα δημιουργίας
του API user (χωρίς λεπτομέρειες endpoints) — [Δημιουργία Χρήστη API Παρόχου
- Pylon KB](https://kb.epsilonnet.gr/pylonacc/dimioyrgia-christi-api-parochoy/).
Οι απαντήσεις στα παραπάνω ερωτήματα έρχονται μόνο από την ίδια την
υποστήριξη μόλις εγκρίνουν το αίτημα.

## 5. Σύνδεση με πραγματικά δεδομένα

Μόλις έχεις τα credentials:

1. Άνοιξε `lib/pylon.js` και δες τη συνάρτηση `realTurnover()`. Έχει ήδη ένα
   στάνταρ OAuth2 client-credentials flow (token request + κλήση ανά
   κατάστημα) — προσάρμοσε τα paths/ονόματα πεδίων σε ό,τι σου δώσει η
   υποστήριξη (π.χ. αν το endpoint δεν είναι `/connect/token` ή
   `/api/v1/stores/{id}/turnover/today`, άλλαξέ το εκεί).
2. Στο Vercel, πρόσθεσε τα environment variables:
   - `PYLON_MOCK=false`
   - `PYLON_BASE_URL=` (το base URL που θα σου δώσουν)
   - `PYLON_CLIENT_ID=` και `PYLON_CLIENT_SECRET=` (ή το αντίστοιχο API key)
3. Redeploy. Το dashboard θα αρχίσει να δείχνει πραγματικά δεδομένα, με
   ανανέωση κάθε 5 λεπτά (server-side cache 1 λεπτού ώστε πολλά κινητά που
   κοιτάνε ταυτόχρονα να μη χτυπάνε το PYLON API κάθε φορά ξεχωριστά).

## Σημειώσεις

- Το UI δείχνει και σύνολο (τα 3 καταστήματα μαζί) και ξεχωριστή κάρτα ανά
  κατάστημα, με sparkline της πορείας μέσα στη μέρα.
- Αν αργότερα θέλεις επιπλέον reports (ανά τρόπο πληρωμής, ακυρώσεις/
  επιστροφές), η ίδια δομή σε `lib/pylon.js` / `app/api/turnover/route.js`
  επεκτείνεται εύκολα — πες μου τι ακριβώς δίνει το API μόλις το μάθεις.
