# Handleiding Ambulance Planning Systeem
**Versie 2025.20 - Laatst bijgewerkt: 22 december 2025**

---

## 📖 Voorwoord

Dit is de complete handleiding voor het Ambulance Planning Systeem. Het document is opgedeeld in twee delen:

- **Deel I: Gebruikershandleiding** - Voor ambulanciers, admins en supervisors die het systeem dagelijks gebruiken
- **Deel II: IT Beheerders Handleiding** - Voor IT beheerders die het systeem installeren en onderhouden op Windows Server

Gebruik de inhoudsopgave om snel naar de juiste sectie te navigeren.

---

# 📚 DEEL I: GEBRUIKERSHANDLEIDING

---


## 📋 Inhoudsopgave

### Algemeen
- [Inleiding](#-inleiding)
- [Inloggen en Navigatie](#-inloggen-en-navigatie)
- [App Installatie (Progressive Web App)](#-app-installatie-progressive-web-app)
- [Responsieve Weergave](#-responsieve-weergave)

### Handleiding per Rol
- [Handleiding voor Ambulanciers](#-handleiding-voor-ambulanciers)
  - [Voorkeuren Opgeven](#-voorkeuren-opgeven)
  - [Exporteer Beschikbaarheden naar Excel](#-exporteer-beschikbaarheden-naar-excel)
  - [Planning Bekijken](#-uw-planning-bekijken)
  - [Profiel Beheren](#-profiel-beheren)
  - [Kalender Synchronisatie](#-kalender-synchronisatie)
  - [Push Notificaties](#-push-notificaties)
  - [Overuren Registreren](#-overuren-registreren)
  - [Shift Ruilen of Overnemen](#-shift-ruilen)
  - [Bieden op Open Shifts](#-bieden-op-open-shifts)
- [Handleiding voor Viewers](#-handleiding-voor-viewers)
  - [Wat Kunnen Viewers?](#wat-kunnen-viewers)
  - [Display Link (Kiosk Modus)](#-display-link-kiosk-modus)
- [Handleiding voor Admins](#-handleiding-voor-admins)
  - [Gebruikersbeheer](#-gebruikersbeheer)
  - [Planning Genereren](#-planning-genereren)
  - [Feestdagen Beheren](#-feestdagen-beheren)
  - [Statistieken Bekijken](#-statistieken-bekijken)
  - [Weekdag Instellingen](#-weekdag-instellingen)
  - [Push Meldingen Versturen](#-push-meldingen-versturen)
  - [Integraties Beheer](#-integraties-beheer)
  - [Verdi Integratie](#-verdi-integratie)
  - [Reportage Personeelsdienst](#-reportage-personeelsdienst)
  - [Activiteitenlog](#-activiteitenlog)
- [Handleiding voor Supervisors](#-handleiding-voor-supervisors)
  - [Supervisor Gebruikersbeheer](#-supervisor-gebruikersbeheer)
  - [Cross-Team Beheer](#-cross-team-beheer)
  - [Noodinplanning](#-noodinplanning)

### Ondersteuning
- [IT Beheerders](#-it-beheerders)
- [Veelgestelde Vragen](#-veelgestelde-vragen)
- [Problemen Oplossen](#-problemen-oplossen)
- [Systeem Updates](#-systeem-updates)

---

## 🚑 Inleiding

Het Ambulance Planning Systeem is een webapplicatie voor het beheren van shift planningen bij ambulance posten. Het systeem ondersteunt verschillende gebruikersrollen met elk hun eigen rechten en mogelijkheden.

**Gebruikersrollen:**

- **Ambulanciers**: Kunnen voorkeuren opgeven en hun planning bekijken
- **Admins**: Hebben volledige controle over hun station + alle ambulancier mogelijkheden
- **Supervisors**: Kunnen meerdere stations beheren/bekijken en cross-team functionaliteit instellen
- **Viewers**: Alleen-lezen toegang - kunnen alleen de planning bekijken (ideaal voor dispatching personeel). Viewers hebben een speciale **Fullscreen modus** voor weergave op display schermen (zoals Lumaps)

---

## 🔐 Inloggen en Navigatie

### Eerste Keer Inloggen

**Station Selecteren**
- Kies uw ambulance post uit de lijst (bijv. "ZW Westerlo", "PIT Mol")
- Dit bepaalt welke planning en gebruikers u ziet

**Inloggegevens Invoeren**
- Gebruikersnaam: Uw toegewezen login naam
- Wachtwoord: Uw persoonlijke wachtwoord
- Neem contact op met uw admin/supervisor als u geen toegang heeft

### Hoofdnavigatie

Het systeem heeft een centrale dashboard met snelle toegang tot alle functies:

- **Dashboard**: Overzicht van uw planning en beschikbare acties (homepagina)
- **Voorkeuren Opgeven**: Uw beschikbaarheid voor komende maanden instellen
- **Profiel**: Persoonlijke gegevens en instellingen bekijken/wijzigen

---

## 📱 App Installatie (Progressive Web App)

Het planning systeem kan als een **native app** worden geïnstalleerd op uw smartphone, tablet of computer! Dit geeft u een snellere ervaring en werkt ook zonder internetverbinding.

### Voordelen van Installatie

✅ **Snelle toegang**: Icoon op uw startscherm/desktop, net als een gewone app  
✅ **Beter prestaties**: Sneller laden door slimme caching  
✅ **Offline werken**: Bekijk uw planning zonder internetverbinding  
✅ **Geen app store nodig**: Installeer direct vanuit uw browser  
✅ **Automatische updates**: Altijd de nieuwste versie  

### 📲 Installeren op Android

**Methode 1: Via Installatie Knop**
1. Open het planning systeem in Chrome
2. Klik op de **"Installeer App"** knop rechtsbovenin
3. Klik op **"Installeren"** in de popup
4. De app verschijnt nu op uw startscherm

**Methode 2: Via Browser Menu**
1. Open het planning systeem in Chrome
2. Tik op het menu (⋮) rechtsboven
3. Kies **"App installeren"** of **"Toevoegen aan startscherm"**
4. Bevestig de installatie

### 📲 Installeren op iPhone/iPad

**Via Safari:**
1. Open het planning systeem in Safari
2. Tik op het **Deel** icoon (vierkant met pijl omhoog)
3. Scroll naar beneden en kies **"Zet op beginscherm"**
4. Geef de app een naam (bijvoorbeeld "APK Planning")
5. Tik op **"Voeg toe"**
6. De app verschijnt nu op uw beginscherm

**Let op:** iOS ondersteunt alleen installatie via Safari, niet via Chrome.

### 💻 Installeren op Computer (Windows/Mac/Linux)

**Via Chrome/Edge:**
1. Open het planning systeem in Chrome of Edge
2. Klik op het **installatie icoon** in de adresbalk (rechtsboven)
3. Klik op **"Installeren"**
4. De app opent in een eigen venster

**Via Browser Menu:**
1. Klik op het menu (⋮) rechtsboven
2. Kies **"Installeren Ambulance Planning..."**
3. Bevestig de installatie

### 🔄 Offline Functionaliteit

**Wat werkt offline?**
- ✅ Bekijken van uw planning (laatst geladen data)
- ✅ Bekijken van uw profiel
- ✅ Navigeren door de app

**Wat werkt NIET offline?**
- ❌ Wijzigen van voorkeuren (vereist internet)
- ❌ Nieuwe shifts toevoegen
- ❌ Planning updates ophalen

**Hoe werkt het?**
- De app slaat automatisch data op tijdens gebruik
- Bij offline gebruik ziet u de laatst opgehaalde informatie
- Zodra u weer online bent, worden nieuwe updates automatisch geladen
- U krijgt een melding als een actie internet vereist

### 🔧 App Beheer

**App Verwijderen - Android:**
1. Houd het app icoon ingedrukt
2. Kies **"Verwijderen"** of sleep naar prullenbak

**App Verwijderen - iOS:**
1. Houd het app icoon ingedrukt
2. Kies **"Verwijder app"**
3. Bevestig met **"Verwijder van beginscherm"**

**App Verwijderen - Computer:**
1. Open de app
2. Klik op het menu (⋮) rechtsboven
3. Kies **"Ambulance Planning verwijderen..."**
4. Bevestig de verwijdering

### ❓ Veelgestelde Vragen PWA

**Q: Waarom zie ik geen installatie knop?**  
A: Controleer of:
- U de website bezoekt via HTTPS (niet HTTP)
- U een ondersteunde browser gebruikt (Chrome, Safari, Edge)
- U de website nog niet heeft geïnstalleerd

**Q: Verschilt de app van de website?**  
A: Nee, het is exact dezelfde applicatie, maar dan met betere prestaties en offline functionaliteit.

**Q: Neemt de app veel opslagruimte in?**  
A: Nee, ongeveer 5-10 MB voor de app en cached data.

**Q: Krijg ik automatisch updates?**  
A: Ja! Bij het openen van de app worden updates automatisch gedownload en geïnstalleerd.

**Q: Kan ik de app op meerdere apparaten installeren?**  
A: Ja, u kunt de app op zoveel apparaten installeren als u wilt. Uw data is altijd gesynchroniseerd via uw account.

---

## 📐 Responsieve Weergave

Het planning systeem past zich **automatisch aan** aan de grootte van uw scherm. Of u nu werkt op een grote monitor, een tablet in de ambulance, of uw smartphone - de app toont altijd een optimale weergave.

### Automatische Layout Aanpassing

**Op grote schermen (computer/laptop):**
- Volledige navigatiebalk met alle menu-opties zichtbaar
- Tabellen met alle kolommen naast elkaar
- Ruime kalenderweergave met volledige details

**Op middelgrote schermen (tablet):**
- Compactere navigatie
- Tabellen passen zich aan met minder kolommen
- Kalender toont essentiële informatie

**Op kleine schermen (smartphone):**
- **Hamburger menu** (☰) voor navigatie - tik om het menu te openen
- **Kaart-weergave** in plaats van tabellen - makkelijker lezen op klein scherm
- Compacte kalender met swipe-navigatie
- Grotere knoppen voor eenvoudig tikken

### Touch-Vriendelijke Bediening

Alle knoppen en interactieve elementen zijn geoptimaliseerd voor touchscreens:
- ✅ Minimaal 44 pixels groot (Apple/Google richtlijn)
- ✅ Voldoende ruimte tussen knoppen
- ✅ Duidelijke visuele feedback bij tikken

### Tips voor Mobiel Gebruik

1. **Draai uw scherm**: Sommige overzichten (zoals de maandkalender) zijn beter leesbaar in landscape modus
2. **Installeer de app**: De geïnstalleerde PWA werkt sneller dan de browser
3. **Zoom**: U kunt altijd in- en uitzoomen met twee vingers indien nodig

### Hamburger Menu Uitleg

Op kleine schermen ziet u rechtsboven een **☰ icoon** (drie horizontale streepjes). Dit is het "hamburger menu":

1. **Tik op ☰** om het menu te openen
2. Alle navigatie-opties verschijnen
3. **Tik op een optie** om erheen te gaan
4. Het menu sluit automatisch

> 💡 **Tip**: Als admin of supervisor ziet u in dit menu ook de beheer-opties die normaal in de navigatiebalk staan.

---

## 👥 Handleiding voor Ambulanciers

### Dashboard Overzicht

Als ambulancier ziet u op het dashboard:

- **Uw Rol**: Bevestiging dat u bent ingelogd als ambulancier
- **Planning Status**: Welke maanden open zijn voor het opgeven van voorkeuren
- **Mijn Planning**: Overzicht van uw komende shifts
- **Station Informatie**: Info over het team dat je aan het bekijken bent

### 📅 Voorkeuren Opgeven

**Stap-voor-stap Process:**

**Naar Shift Planner**
- Klik "Voorkeuren Opgeven" op het dashboard

**Maand Selecteren**
- Het systeem toont automatisch de juiste maand
- U kunt alleen voorkeuren opgeven voor toekomstige maanden
- **Let op de deadline!** (Na deze deadline is het niet meer mogelijk om beschikbaarheden door te geven!)

**Kalender Gebruiken**
- 🟢 **Groen**: Zowel dag als nacht beschikbaar
- 🟠 **Oranje**: Alleen dag OF nacht beschikbaar
- 🔴 **Rood**: Niet beschikbaar
- ⚪ **Wit**: Geen voorkeur opgegeven

**Datum Selecteren**
- Klik op een datum in de kalender
- Rechts verschijnen de beschikbare opties
- Druk steeds op opslaan

### 🏥 Multi-Station Medewerkers

**Werkt u bij meerdere stations?** Het systeem detecteert dit automatisch!

**Hoe het werkt:**

Als u bij **meerdere stations** werkt (bijvoorbeeld PIT Mol én ZW Balen):
- ✅ U ziet **ALTIJD beide shift formulieren** (dag én nacht)
- ✅ U geeft **1x uw voorkeuren op** - alle stations kunnen deze zien
- ✅ Elk station plant u in op basis van hun eigen behoeften

**Voorbeeld Scenario:**

U werkt bij **PIT Mol** (zoekt alleen dagshifts op maandag) én **ZW Balen** (zoekt dag + nacht op maandag):

1. U logt in bij PIT Mol
2. U ziet op maandag **beide shift formulieren**:
   - Dagshift formulier (7:00-19:00)
   - Nachtshift formulier (19:00-7:00)
3. U geeft uw beschikbaarheid op:
   - Bijvoorbeeld: Dagshift = beschikbaar, Nachtshift = beschikbaar
4. **PIT Mol** kan u inplannen voor dagshift (zoekt geen nacht)
5. **ZW Balen** kan u inplannen voor dag OF nacht (afhankelijk van hun behoefte)

**Waarom beide shifts tonen?**
- Elk station heeft andere behoeften per dag
- Door altijd beide shifts op te geven, kan elk station u optimaal inplannen
- U hoeft maar 1x uw voorkeuren in te voeren

**Single-Station Medewerkers:**

Werkt u bij **1 station**?
- U ziet alleen de shifts die uw station zoekt voor die dag
- Bijvoorbeeld: Als PIT Mol op maandag alleen dagshifts zoekt, ziet u alleen het dagshift formulier

### Shift Types en Tijden

**Dag Shifts**

- **Volledige shift**: 7:00 - 19:00 (12 uur)
- **Eerste deel**: 7:00 - 13:00 (6 uur) *(alleen beschikbaar bij split shifts)*
- **Tweede deel**: 13:00 - 19:00 (6 uur) *(alleen beschikbaar bij split shifts)*
- **Niet beschikbaar**: Geen dienst mogelijk

**Nacht Shifts**

- **Volledige shift**: 19:00 - 7:00 (12 uur)
- **Niet beschikbaar**: Geen dienst mogelijk

**Split Shifts (Halve Diensten):**

**Cross-team Gebruikers en Halve Dagshiften**

Als u bij **meerdere stations** werkt:
- ✅ U kunt **altijd** halve dagshiften opgeven (ochtend 7-13u / middag 13-19u)
- ✅ Dit geeft maximale flexibiliteit voor uw beschikbaarheid
- ℹ️ Elk station gebruikt uw halve shift voorkeuren op basis van hun eigen systeem:
  - **Uitgebreid systeem**: kan u inplannen voor halve dagshiften (ochtend OF middag)
  - **Eenvoudig systeem**: heeft volledige dagshiften nodig (ochtend ÉN middag)

**Voorbeeld:**
Jan werkt bij PIT Geel (uitgebreid) en ZW Balen (eenvoudig). Hij geeft op:
- Maandag 1 december: "Ochtend beschikbaar" (7-13u)
- **PIT Geel**: kan Jan inplannen voor ochtend shift
- **ZW Balen**: kan Jan NIET inplannen (heeft hele dag nodig, maar Jan is alleen ochtend beschikbaar)

Als u bij **1 station** werkt:
- Split shift opties zijn alleen zichtbaar als uw station dit toestaat

**Belangrijke Tips:**

- **Geef ruim voorkeuren op** - Meer beschikbaarheid = meer kans op shifts
- **Let op deadlines** - Na de deadline kunt u geen voorkeuren meer wijzigen
- **Multi-station**: Geef altijd beide shifts op (dag + nacht) voor optimale planning bij alle stations
- **Split shifts** - Halve shifts zijn handig als u beperkt beschikbaar bent. Het programma geeft wel de voorkeur aan personen die een volledige dag kunnen.

### 📥 Exporteer Beschikbaarheden naar Excel

U kunt uw opgegeven beschikbaarheden exporteren naar een Excel bestand voor uw eigen administratie.

**Hoe exporteren:**

1. Ga naar **Voorkeuren Opgeven** (Shift Planner pagina)
2. Selecteer de **maand** waarvoor u wilt exporteren
3. Scroll naar beneden naar de sectie **"Exporteer Beschikbaarheden"**
4. Klik op **"Exporteer naar Excel"**

**Excel Inhoud:**

Het Excel bestand bevat:
- **Datum**: De datum van elke opgegeven beschikbaarheid
- **Dag**: De weekdag (Maandag, Dinsdag, etc.)
- **Type Shift**: Dag of Nacht (met eventueel Ochtend/Middag bij halve shifts)
- **Tijd**: De exacte tijden (bijv. 07:00 - 19:00)
- **Opmerkingen**: Eventuele notities die u heeft toegevoegd
- **Totaal**: Aantal opgegeven beschikbaarheden
- **Timestamp**: Datum en tijd van de export

**Bestandsnaam:**
`Mijn_Beschikbaarheden_[Maand]_[Jaar].xlsx`

Bijvoorbeeld: `Mijn_Beschikbaarheden_Januari_2026.xlsx`

> 💡 **Tip**: De knop is uitgeschakeld als u nog geen beschikbaarheden heeft opgegeven voor de geselecteerde maand.

### 📋 Uw Planning Bekijken

**Dashboard Planning:**

- **Maand navigatie**: Blader door verschillende maanden
- **Shift details**: Datum, type (dag/nacht), tijden, status
- **Uw shifts**: Groen gemarkeerd voor duidelijkheid
- **Open slots**: Rood gemarkeerd - nog geen medewerker toegewezen

**Planning Status Betekenis:**

- **Toegewezen**: U bent ingepland voor deze shift
- **Open**: Shift is nog niet ingevuld
- **Beschikbaar**: Anderen kunnen hier nog voor worden ingepland

### 👤 Profiel Beheren

**Profiel Openen**
- Klik "Profiel" in de navigatie
- Bekijk uw persoonlijke informatie

**Wat U Kunt Zien:**
- Naam en contactgegevens
- Aantal gekozen werkuren per maand
- Station toewijzing
- Professional status (beroepspersoneel)

**Wijzigingen:**
- Voor wijzigingen max werkuren per maand neem je contact op met uw admin
- Wachtwoord wijzigen kan je zelf doen. Indien je wachtwoord bent vergeten kan je ook de Admin een nieuw wachtwoord laten instellen

#### Weergave Instellingen

In de Profiel pagina vindt u **Weergave Instellingen** waarmee u de app kunt personaliseren:

**Donkere Modus (Dark Mode)**
- Schakel de donkere modus in voor een oogvriendelijke weergave in omgevingen met weinig licht
- Ideaal voor nachtshifts of gebruik in donkere ruimtes
- Uw voorkeur wordt automatisch opgeslagen en onthouden bij volgende bezoeken

### 📅 Kalender Synchronisatie

**Nieuw! Synchroniseer uw shifts automatisch met uw persoonlijke kalender**

#### Wat is Kalender Synchronisatie?

Met de kalender synchronisatie functie kunt u uw ingeplande shifts automatisch laten verschijnen in uw favoriete kalender app (Google Calendar, Outlook, Apple Agenda). Zodra u bent ingepland, verschijnt de shift in uw persoonlijke agenda.

**Event Format in uw Kalender:**
- Dagshift volledig: `Dagshift - Chiro` (07:00-19:00)
- Dagshift voormiddag: `Dagshift VM - Tenerife` (07:00-13:00)
- Dagshift namiddag: `Dagshift NM - Mol` (13:00-19:00)
- Nachtshift: `Nachtshift - Westerlo` (19:00-07:00)

**📍 Locatie in Kalender Events:**
Als een station een adres heeft geconfigureerd, wordt dit automatisch toegevoegd aan de kalender events als **LOCATION**. Dit is handig voor:
- Snelle navigatie naar het station via Google Maps of Apple Maps
- Duidelijk zien waar u die dag moet zijn, direct vanuit uw agenda

*Het adres wordt beheerd door de supervisor via Integraties → Stationbeheer.*

**💡 Belangrijk voor Cross-Station Medewerkers:**
Als u werkt voor meerdere stations, worden **alle uw shifts van alle stations** automatisch gesynchroniseerd naar uw kalender. De stationnaam in de event titel laat zien bij welk station u bent ingepland - handig om snel te zien waar u die dag moet zijn!

#### Kalender Link Instellen

**Stap 1: Ga naar uw Profiel**
- Klik op "Profiel" in de navigatie
- Scroll naar de "Kalender Synchronisatie" sectie

**Stap 2: Kopieer uw Persoonlijke Link**
- U ziet een unieke kalender link
- Klik op het kopieer icoon (📋) om de link te kopiëren
- ⚠️ **Belangrijk**: Deze link is persoonlijk en vertrouwelijk - deel deze niet met anderen!

**Stap 3: Voeg Link toe aan uw Kalender App**
- Klik op "Handleiding: Link toevoegen aan je kalender" voor gedetailleerde instructies
- Kies uw kalender app (Google, Outlook, of Apple)
- Volg de stap-voor-stap instructies

#### 📱 Ondersteunde Kalender Apps

**Google Calendar**

*Via Website/Computer (aanbevolen):*
1. Open Google Calendar op je computer
2. Klik aan de linkerkant op het + icoon naast "Andere agenda's"
3. Kies "Via URL"
4. Plak jouw kalender link in het veld "URL van agenda"
5. Klik "Agenda toevoegen"
6. ✅ Klaar! De agenda verschijnt nu links in de lijst

*Zichtbaar maken op mobiele app:*
- Als je de agenda via de website hebt toegevoegd, synchroniseert deze automatisch naar je mobiele app
- Open de Google Calendar app op je telefoon
- Tik op je profielfoto (rechtsboven)
- Ga naar "Instellingen"
- Tik op je account naam
- Zoek je ambulance shifts agenda in de lijst
- Zet het vinkje AAN om deze zichtbaar te maken
- ✅ Je shifts zijn nu zichtbaar in de app!

⚠️ **Let op**: Google Calendar app ondersteunt geen URL-abonnementen direct toevoegen. Voeg de agenda altijd toe via de website, dan verschijnt deze automatisch in de mobiele app.

⏱️ **Synchronisatie tijd**: 1-24 uur (meestal binnen enkele uren). Google synchroniseert geabonneerde agenda's automatisch meerdere keren per dag.

**Outlook / Microsoft 365**
1. Open Outlook Calendar
2. Klik "Agenda toevoegen"
3. Kies "Abonneren vanaf web"
4. Plak uw kalender link
5. Geef een naam (bijv. "Ambulance Shifts")
6. Klik "Importeren"

⏱️ **Synchronisatie tijd**: 3-24 uur (meestal 3-6 uur). Microsoft synchroniseert geabonneerde agenda's 2-4 keer per dag.

**Apple Agenda (iPhone/iPad)**
1. Open Instellingen app
2. Ga naar Agenda → Accounts → Account toevoegen
3. Kies "Overige"
4. Tik "Geabonneerde agenda"
5. Plak de link en tik "Volgende"

⏱️ **Synchronisatie tijd**: 15 minuten - 1 uur (meestal binnen 30 minuten). Apple synchroniseert geabonneerde agenda's elk uur of vaker.

**Apple Agenda (Mac)**
1. Open Agenda app
2. Klik Bestand → Nieuwe agenda-abonnement
3. Plak de kalender link
4. Klik "Abonneren"

⏱️ **Synchronisatie tijd**: 15 minuten - 1 uur (meestal binnen 30 minuten). Apple synchroniseert geabonneerde agenda's elk uur of vaker.

#### 🔄 Synchronisatie Informatie

**Automatische Updates:**
- Uw shifts worden automatisch bijgewerkt
- Updatefrequentie: zie de specifieke synchronisatie tijden per platform hierboven
  - Google Calendar: 1-24 uur (meestal binnen enkele uren)
  - Outlook/Microsoft 365: 3-24 uur (meestal 3-6 uur)
  - Apple Agenda: 15 minuten - 1 uur (meestal binnen 30 minuten)
- Nieuwe shifts verschijnen automatisch
- Verwijderde shifts verdwijnen automatisch

**Alleen Lezen:**
- U kunt shifts alleen bekijken in uw kalender
- Wijzigingen moet u maken in het planning systeem
- De synchronisatie is eenrichtingsverkeer (van planning naar kalender)

#### 🔒 Privacy & Veiligheid

**Persoonlijke Link:**
- Elke gebruiker heeft een unieke, beveiligde link
- Deel deze link NOOIT met anderen
- Alleen uw eigen shifts zijn zichtbaar via uw link

**Nieuwe Link Genereren:**
- Bij twijfel of verlies kunt u een nieuwe link genereren
- Klik op "Nieuwe Link Genereren" in uw profiel
- De oude link werkt dan niet meer
- Update de link in uw kalender app

#### ❓ Veelgestelde Vragen Kalender Sync

**Q: Waarom zie ik mijn shifts niet in mijn kalender?**
A: Controleer of:
- De link correct is toegevoegd aan uw kalender app
- De synchronisatie tijd is verstreken (kan tot 24 uur duren)
- U daadwerkelijk shifts heeft voor de periode die u bekijkt

**Q: Kan ik de shifts aanpassen in mijn kalender?**
A: Nee, de kalender is alleen-lezen. Wijzigingen maakt u in het planning systeem.

**Q: Hoe vaak worden mijn shifts bijgewerkt?**
A: Dit hangt af van uw kalender app:
- Google Calendar: 1-24 uur (meestal binnen enkele uren)
- Outlook/Microsoft 365: 3-24 uur (meestal 3-6 uur)  
- Apple Agenda: 15 minuten - 1 uur (meestal binnen 30 minuten)

**Q: Wat gebeurt er als ik mijn link deel met iemand anders?**
A: Ze kunnen dan al uw shifts zien. Deel de link dus nooit! Genereer een nieuwe link als u vermoedt dat anderen toegang hebben.

**Q: Werkt dit ook op mijn telefoon?**
A: Ja! Eenmaal ingesteld synchroniseert uw kalender app automatisch op al uw apparaten (telefoon, tablet, computer).

**Q: Mijn shifts staan een uur te vroeg of te laat in mijn kalender. Hoe los ik dit op?**
A: Gebruik de **Tijdcorrectie voor kalender** instelling:
1. Ga naar uw Profiel
2. Scroll naar de "Kalender Synchronisatie" sectie
3. Zoek "Tijdcorrectie voor kalender"
4. Kies de juiste correctie:
   - Als een shift om 07:00 zou moeten starten maar om 06:00 in uw agenda staat, kies **+1 uur**
   - Als een shift om 07:00 zou moeten starten maar om 08:00 in uw agenda staat, kies **-1 uur**
5. De wijziging wordt actief bij de volgende synchronisatie van uw kalender app

**💡 Tip**: Dit probleem komt voor bij sommige kalender apps die tijdzones anders interpreteren. De tijdcorrectie compenseert dit verschil.

---

### 🔔 Push Notificaties

**Ontvang directe meldingen op uw apparaat wanneer er iets verandert in de planning!**

#### Wat zijn Push Notificaties?

Push notificaties zijn berichten die u ontvangt op uw smartphone, tablet of computer om u op de hoogte te houden van belangrijke gebeurtenissen in het planning systeem, zoals:

- 📅 **Nieuwe planning gepubliceerd**: Zodra de planning voor een nieuwe maand klaar is
- 🔄 **Shift wijzigingen**: Wanneer uw ingeplande shifts worden gewijzigd
- ⏰ **Deadline herinneringen**: Waarschuwingen voordat de deadline voor beschikbaarheid verloopt
- 🔔 **Shift herinneringen**: Herinnering X uur voor uw shift begint (instelbaar per station)

#### Push Notificaties Inschakelen

**Stap 1: Ga naar uw Profiel**
- Klik op "Profiel" in de navigatie
- Scroll naar de "Push Notificaties" sectie

**Stap 2: Sta Browser Notificaties Toe**
- Klik op de knop "Notificaties Inschakelen"
- Uw browser vraagt toestemming - klik op **"Toestaan"**
- ✅ U bent nu geabonneerd op push notificaties!

**Stap 3: Stel uw Voorkeuren In**
- U ziet drie soorten notificaties met aan/uit schakelaars:
  - **Planning Gepubliceerd** (standaard UIT)
  - **Mijn Shift Gewijzigd** (standaard UIT)
  - **Beschikbaarheid Deadline** (standaard AAN)

#### Notificatie Types

**1. Planning Gepubliceerd**
- **Wat**: Melding wanneer een nieuwe maandplanning wordt gepubliceerd
- **Wanneer**: Direct na generatie van de planning door de admin
- **Standaard**: UIT (zelf aan te zetten)
- **Voorbeeld**: "Nieuwe Planning Gepubliceerd - De planning voor januari 2026 is beschikbaar."

**2. Mijn Shift Gewijzigd**
- **Wat**: Melding wanneer uw ingeplande shifts worden gewijzigd
- **Wanneer**: Bij aanpassen, toevoegen of verwijderen van uw shifts
- **Standaard**: UIT (zelf aan te zetten)
- **Voorbeeld**: "Dienst Gewijzigd - Je dagdienst op 15 januari 2026 is gewijzigd."
- **Let op**: U ontvangt ALLEEN meldingen over uw eigen shifts

**3. Beschikbaarheid Deadline**
- **Wat**: Herinnering om uw beschikbaarheid in te vullen
- **Wanneer**: X dagen voor de deadline (instelbaar: 1-7 dagen)
- **Standaard**: AAN met 3 dagen waarschuwing
- **Voorbeeld**: "[PIT Geel] Deadline Beschikbaarheid Nadert - Je hebt nog 3 dagen om je beschikbaarheid voor februari 2026 in te vullen."
- **Instelbaar**: Pas aan hoeveel dagen van tevoren u gewaarschuwd wilt worden (1 t/m 7 dagen)
- **Cross-Team**: Als u toegang heeft tot meerdere stations, ontvangt u een **aparte melding per station** zodat u duidelijk weet voor welke stations u nog beschikbaarheid moet invullen

**4. Shift Herinneringen**
- **Wat**: Persoonlijke herinnering voordat uw shift begint
- **Wanneer**: X uur voor uw shift begint (instelbaar: 0-48 uur)
- **Standaard**: AAN met 12 uur waarschuwing
- **Voorbeeld**: "[ZW Westerlo] Shift Herinnering - Je dagdienst op maandag 15 januari begint over 12 uur (07:00)."
- **Instelbaar**: 
  - Globale herinneringstijd (0-48 uur, 0 = uitgeschakeld)
  - Per station aan/uit zetten via Station Notificatie Voorkeuren
- **Cross-Team**: U kunt per station kiezen of u shift herinneringen wilt ontvangen

#### Instellingen Aanpassen

**Notificaties Aan/Uit Zetten**
- Klik op de schakelaar naast elk notificatie type
- Groen = AAN, Grijs = UIT
- Wijzigingen worden automatisch opgeslagen

**Deadline Waarschuwing Aanpassen**
- Bij "Beschikbaarheid Deadline" kunt u kiezen:
  - 1 dag van tevoren
  - 2 dagen van tevoren
  - 3 dagen van tevoren (standaard)
  - ... tot 7 dagen van tevoren
- Selecteer uw voorkeur uit de keuzelijst
- De instelling wordt automatisch opgeslagen

#### Station-specifieke Notificatie Voorkeuren

**Voor Cross-Team Medewerkers en Supervisors:**

Als u toegang heeft tot meerdere stations, kunt u per station kiezen welke notificaties u wilt ontvangen. Dit voorkomt dat u overspoeld wordt met meldingen van stations die minder relevant voor u zijn.

**Waar vindt u deze instelling?**
1. Ga naar **Profiel**
2. Scroll naar **"Station Notificatie Voorkeuren"**
3. U ziet een tabel met alle stations waartoe u toegang heeft

**Wat kunt u instellen?**

Voor elk station kunt u de volgende notificatie types aan of uit zetten:

| Notificatie Type | Beschrijving |
|------------------|--------------|
| **Nieuwe Planning** | Melding wanneer een nieuwe maandplanning wordt gepubliceerd |
| **Ruilverzoeken** | Updates over ingediende en goedgekeurde ruilverzoeken |
| **Biedingen** | Meldingen over biedingen op open shifts |
| **Open Wissels** | Wanneer een collega vraagt om te wisselen |

**Voorbeeld:**
- U bent supervisor en wilt alleen meldingen van ZW Geel en PIT Mol
- Zet alle notificatie types UIT voor de andere stations
- U ontvangt nu alleen relevante meldingen

**Standaard Instelling:**
- Alle notificaties zijn standaard AAN voor alle stations
- Pas aan naar wens door op de schakelaars te klikken
- Klik **"Voorkeuren Opslaan"** om uw wijzigingen op te slaan

**Wie ziet deze optie?**
- **Supervisors**: Zien alle stations
- **Cross-team medewerkers**: Zien hun primaire station + alle extra toegewezen stations
- **Gewone ambulanciers**: Zien deze sectie niet (zij hebben maar één station)

**Test Notificatie Versturen**
- Klik op de knop "Test Notificatie Versturen"
- U ontvangt direct een testbericht
- Controleer of notificaties goed werken

#### Notificaties Uitschakelen

**Tijdelijk Uitschakelen (aanbevolen)**
- Zet de schakelaars UIT in uw profiel
- U blijft geabonneerd en kunt later weer inschakelen

**Volledig Uitschakelen**
- Klik op "Notificaties Uitschakelen" onderaan de sectie
- Dit verwijdert uw abonnement volledig
- Om opnieuw te abonneren moet u de browser toestemming opnieuw geven

**Via Browser Instellingen**
- Chrome: Instellingen → Privacy en beveiliging → Website-instellingen → Notificaties
- Safari: Voorkeuren → Websites → Notificaties
- Zoek het planning systeem en blokkeer notificaties

#### 📱 Platform Ondersteuning

**Ondersteunde Browsers:**
- ✅ Chrome (Android, Windows, Mac, Linux)
- ✅ Edge (Windows, Mac)
- ✅ Firefox (Android, Windows, Mac, Linux)
- ✅ Safari (Mac, iPhone, iPad) - vanaf iOS 16.4+

**Werkt op:**
- 📱 Smartphones (Android en iPhone)
- 💻 Computers (Windows, Mac, Linux)
- 🖥️ Tablets (iPad en Android tablets)

**Let op voor iPhone/iPad gebruikers:**
- Werkt alleen in Safari (niet in Chrome of andere browsers)
- Vereist iOS 16.4 of nieuwer
- Installeer de app als PWA voor beste ervaring (zie sectie "App Installatie")

#### ❓ Veelgestelde Vragen Push Notificaties

**Q: Ik krijg geen notificaties, wat nu?**
A: Controleer of:
- U de browser toestemming heeft gegeven (zie browser adresbalk voor een icoon)
- De notificatie types zijn ingeschakeld (groen) in uw profiel
- U een ondersteunde browser gebruikt
- Browser notificaties niet zijn uitgeschakeld in uw systeem instellingen

**Q: Kan ik notificaties ontvangen als de website niet open is?**
A: Ja! Push notificaties werken zelfs als de browser gesloten is (mits de browser op de achtergrond mag draaien).

**Q: Werken notificaties op meerdere apparaten?**
A: Ja! Als u de notificaties op elk apparaat apart inschakelt, ontvangt u berichten op al deze apparaten.

**Q: Hoeveel notificaties krijg ik?**
A: Dit hangt af van uw instellingen:
- Planning Gepubliceerd: Max 1x per maand (als ingeschakeld)
- Shift Gewijzigd: Alleen bij daadwerkelijke wijzigingen in uw shifts
- Deadline: 1x per maand op de door u gekozen dag voor de deadline

**Q: Kan ik specifieke notificaties uitschakelen?**
A: Ja! Elke notificatie type heeft een eigen aan/uit schakelaar in uw profiel.

**Q: Ik ben supervisor/cross-team - kan ik per station kiezen welke meldingen ik krijg?**
A: Ja! Ga naar Profiel → "Station Notificatie Voorkeuren". Hier kunt u per station kiezen welke notificatie types u wilt ontvangen. Dit is alleen zichtbaar als u toegang heeft tot meerdere stations.

**Q: Zijn mijn notificaties privé?**
A: Ja, u ontvangt alleen meldingen over uw eigen shifts en planning van uw station(s).

**Q: Wat gebeurt er bij een test notificatie?**
A: U ontvangt direct een testbericht: "Test Notificatie - Dit is een test om te controleren of push notificaties werken."

**Q: Kan ik de deadline waarschuwing aanpassen?**
A: Ja! U kunt kiezen tussen 1 tot 7 dagen van tevoren gewaarschuwd worden.

#### 🔒 Privacy & Veiligheid

**Veilig & Privé:**
- Notificaties worden direct naar uw apparaat verzonden
- Geen tussenkomst van externe diensten (zoals Google of Apple voor de inhoud)
- Alleen u kunt uw notificaties zien
- U kunt altijd uitschrijven

**Technische Details:**
- Gebruikt Web Push Protocol standaard (W3C)
- End-to-end versleuteld tussen server en uw apparaat
- VAPID authenticatie voor veilige verzending

#### 🛠️ Probleemoplossing Push Notificaties

Als u geen push notificaties ontvangt, controleer dan de volgende punten per platform:

---

##### 📱 Android - Probleemoplossing

**Stap 1: Controleer Browser Notificatie Instellingen**
1. Open Chrome op uw Android telefoon
2. Tik op de **drie puntjes** rechtsboven → **Instellingen**
3. Tik op **Site-instellingen** → **Notificaties**
4. Zoek het planning systeem in de lijst
5. Zorg dat het op **"Toestaan"** staat

**Stap 2: Controleer Systeem Notificatie Instellingen**
1. Ga naar **Instellingen** → **Apps** → **Chrome** (of uw browser)
2. Tik op **Notificaties**
3. Zorg dat notificaties zijn **ingeschakeld**
4. Controleer dat **"Stil weergeven"** is **uitgeschakeld**

**Stap 3: Controleer Batterij Optimalisatie**
1. Ga naar **Instellingen** → **Apps** → **Chrome**
2. Tik op **Batterij**
3. Selecteer **"Niet beperken"** of **"Onbeperkt"**
4. Dit voorkomt dat Android de browser op de achtergrond stopt

**Stap 4: Controleer "Niet Storen" Modus**
1. Open **Instellingen** → **Geluid** → **Niet storen**
2. Zorg dat deze modus is **uitgeschakeld**, of
3. Voeg Chrome toe aan de **uitzonderingen**

**Stap 5: PWA Installatie (Aanbevolen)**
1. Open de planning website in Chrome
2. Tik op de **drie puntjes** rechtsboven
3. Tik op **"Installeren"** of **"Toevoegen aan startscherm"**
4. De app werkt nu betrouwbaarder op de achtergrond

---

##### 🍎 iPhone/iPad (iOS) - Probleemoplossing

**BELANGRIJK: iOS vereist speciale stappen!**

Push notificaties op iPhone/iPad werken ALLEEN als:
- U **iOS 16.4 of nieuwer** heeft
- U **Safari** gebruikt (niet Chrome of Firefox!)
- U de app als **PWA installeert** (verplicht op iOS!)

**Stap 1: Controleer iOS Versie**
1. Ga naar **Instellingen** → **Algemeen** → **Info**
2. Controleer dat de versie **16.4 of hoger** is
3. Zo niet, update eerst uw iPhone/iPad

**Stap 2: Installeer als PWA (VERPLICHT)**
1. Open **Safari** (niet een andere browser!)
2. Ga naar de planning website
3. Tik op het **deel-icoon** (vierkant met pijl omhoog)
4. Scroll naar beneden en tik op **"Zet op beginscherm"**
5. Geef de app een naam en tik op **"Voeg toe"**
6. Open nu de app vanaf uw beginscherm (NIET vanuit Safari)

**Stap 3: Schakel Notificaties In (in de PWA)**
1. Open de geïnstalleerde app vanaf uw beginscherm
2. Ga naar uw **Profiel**
3. Klik op **"Notificaties Inschakelen"**
4. Tik op **"Sta toe"** wanneer iOS vraagt om toestemming

**Stap 4: Controleer iOS Notificatie Instellingen**
1. Ga naar **Instellingen** → **Notificaties**
2. Zoek de planning app in de lijst
3. Zorg dat **"Sta berichtgeving toe"** is ingeschakeld
4. Kies hoe u notificaties wilt ontvangen (banner, geluid, badge)

**Stap 5: Controleer Focus/Concentratie Modus**
1. Ga naar **Instellingen** → **Focus**
2. Controleer of een Focus modus actief is
3. Zo ja, voeg de planning app toe aan de toegestane apps

**Veelvoorkomende iOS Problemen:**
- ❌ **Chrome/Firefox op iOS**: Ondersteunt GEEN push notificaties - gebruik Safari
- ❌ **Niet geïnstalleerd als PWA**: Push werkt niet in de browser op iOS
- ❌ **iOS ouder dan 16.4**: Push notificaties worden niet ondersteund
- ❌ **Sluimerstand/Focus actief**: Notificaties worden geblokkeerd

---

##### 💻 Windows/Mac/Linux Desktop - Probleemoplossing

**Stap 1: Controleer Browser Notificatie Toestemming**

**Chrome:**
1. Klik op het **slot-icoon** of **i-icoon** links van de URL
2. Zoek **"Notificaties"** in het dropdown menu
3. Zet op **"Toestaan"**
4. Herlaad de pagina

**Edge:**
1. Klik op het **slot-icoon** links van de URL
2. Klik op **"Machtigingen voor deze site"**
3. Zet **"Notificaties"** op **"Toestaan"**

**Firefox:**
1. Klik op het **slot-icoon** links van de URL
2. Klik op **"Verbinding beveiligd"** → **"Meer informatie"**
3. Ga naar **"Machtigingen"** → **"Notificaties"**
4. Verwijder blokkade en sta toe

**Safari (Mac):**
1. Ga naar **Safari** → **Voorkeuren** → **Websites** → **Notificaties**
2. Zoek het planning systeem
3. Selecteer **"Toestaan"**

**Stap 2: Controleer Systeem Notificatie Instellingen**

**Windows:**
1. Ga naar **Instellingen** → **Systeem** → **Notificaties**
2. Zorg dat notificaties zijn **ingeschakeld**
3. Scroll naar beneden en zoek uw browser (Chrome/Edge/Firefox)
4. Zorg dat deze **aan** staat
5. Controleer **Focushulp** - zet uit of voeg browser toe

**Mac:**
1. Ga naar **Systeemvoorkeuren** → **Berichtgeving & Focus**
2. Zoek uw browser in de lijst
3. Zorg dat **"Sta berichtgeving toe"** is ingeschakeld
4. Kies **"Banners"** of **"Meldingen"**

**Stap 3: Houd Browser Open op Achtergrond**
- Notificaties werken het beste als de browser op de achtergrond draait
- Sluit de browser niet volledig af
- Overweeg de browser te starten bij het opstarten van uw computer

---

##### ✅ Algemene Checklist

Doorloop deze checklist als notificaties niet werken:

| # | Controle | Actie |
|---|----------|-------|
| 1 | **Ingeschakeld in app?** | Ga naar Profiel → Push Notificaties sectie → Klik "Notificaties Inschakelen" |
| 2 | **Toestemming gegeven?** | Browser vraagt toestemming → Klik "Toestaan" |
| 3 | **Types ingeschakeld?** | Zet minstens één type AAN (groen) |
| 4 | **Test notificatie werkt?** | Klik "Test Notificatie" → Ontvangt u een bericht? |
| 5 | **Juiste browser?** | iOS: ALLEEN Safari. Android: Chrome aanbevolen |
| 6 | **PWA geïnstalleerd?** | iOS: VERPLICHT. Android: Aanbevolen |
| 7 | **Systeem notificaties aan?** | Check telefoon/computer instellingen |
| 8 | **Niet storen uit?** | Zet Focus/Niet Storen modus uit |
| 9 | **Batterij optimalisatie?** | Android: Zet op "Niet beperken" |
| 10 | **Abonnement verlopen?** | Schakel uit en opnieuw in bij Profiel |

---

##### 🔄 Opnieuw Abonneren

Als niets werkt, probeer opnieuw te abonneren:

1. Ga naar uw **Profiel**
2. Klik op **"Notificaties Uitschakelen"** (onderaan de sectie)
3. Wacht 5 seconden
4. Klik op **"Notificaties Inschakelen"**
5. Geef opnieuw toestemming wanneer de browser vraagt
6. Test met de **"Test Notificatie"** knop

---

##### 📞 Nog Steeds Problemen?

Neem contact op met uw beheerder met de volgende informatie:
- Welk apparaat gebruikt u? (bijv. iPhone 14, Samsung Galaxy S23)
- Welke browser? (bijv. Safari, Chrome)
- Welke versie van het besturingssysteem? (bijv. iOS 17.2, Android 14)
- Welke foutmelding ziet u (indien van toepassing)?
- Werkt de test notificatie?

---

### ⏱️ Overuren Registreren

**Functie:**

U kunt extra gewerkte uren registreren die gekoppeld zijn aan een specifieke shift.

#### Wanneer Overuren Registreren?

- Extra tijd gewerkt na uw normale shift
- Onverwachte verlengingen van diensten
- Aanvullende taken buiten reguliere werktijden

#### Hoe Overuren Invoeren?

**Via het Dashboard:**

1. Ga naar uw **Dashboard**
2. Zoek de shift waarvoor u overuren wilt registreren
3. Klik op de **"Overuren"** knop (klok icoon) naast uw shift
4. Vul in:
   - **Starttijd**: Wanneer begonnen de overuren
   - **Duur**: Aantal minuten overwerk
   - **Reden**: Korte omschrijving waarom overuren gemaakt zijn
5. Klik **"Toevoegen"**

**Let Op - Invoerperiode:**
- U kunt overuren invoeren voor de **huidige maand**
- En tot **7 dagen na het einde van de vorige maand**
- Na deze periode kunnen geen overuren meer worden toegevoegd

#### Overuren Overzicht Bekijken

**Via het Menu:**

1. Klik op **"Overuren"** in het navigatiemenu
2. Selecteer de gewenste maand/jaar
3. Bekijk al uw geregistreerde overuren
4. U kunt hier ook overuren verwijderen (binnen de invoerperiode)

#### Overuren Verwijderen

- Klik op het prullenbak icoon naast de overuren
- Bevestig de verwijdering
- Let op: Dit kan alleen binnen de invoerperiode (huidige maand + 7 dagen na vorige maand)

#### Overuren in Rapportages

Overuren worden automatisch meegenomen in de maandelijkse Excel rapportages:
- **Samenvatting Tab**: Toont totaal overuren per station (in minuten en uren)
- **Overuren Tab**: Gedetailleerd overzicht van alle overuren met datum, medewerker, duur en reden

---

### 🔄 Shift Ruilen

Het Shift Ruilen systeem stelt ambulanciers in staat om onderling van shift te wisselen, mits goedkeuring van een admin of supervisor.

#### Wat is Shift Ruilen?

Er zijn twee manieren om shifts te wisselen:

1. **Overnemen** - Een collega neemt uw shift over (eenrichtingsverkeer)
   - Wanneer u verhinderd bent, vraagt u een collega om uw shift over te nemen
   - Uw collega krijgt uw shift, u heeft dan geen shift meer op die dag

2. **Ruilen** - U wisselt shifts met een collega (tweerichtingsverkeer)
   - U en uw collega wisselen van shift
   - U krijgt de shift van uw collega, en uw collega krijgt uw shift

Bij beide opties moet het verzoek goedgekeurd worden door een admin of supervisor.

#### Hoe een Verzoek Indienen?

1. Ga naar uw **Dashboard**
2. Zoek de shift die u wilt overdragen of ruilen in de planning sectie
3. Klik op de **"Ruilen"** knop (🔄 icoon) naast uw shift
4. **Kies het type verzoek:**
   - **Overnemen**: Uw collega neemt uw shift over
   - **Ruilen**: U wisselt shifts met uw collega
5. Selecteer een collega
6. **Bij Ruilen**: Selecteer de shift van uw collega waarmee u wilt ruilen
7. Voeg optioneel een reden toe (bijv. "vakantie", "afspraak")
8. Klik **"Verzoek Indienen"**

#### Mijn Verzoeken Bekijken

Op uw dashboard ziet u een overzicht van uw ingediende verzoeken:
- **In behandeling** (geel): Wacht op goedkeuring
- **Goedgekeurd** (groen): Shift is overgedragen of geruild
- **Afgewezen** (rood): Verzoek is afgewezen

Bij ruilverzoeken ziet u ook:
- Een paarse **"Ruilen"** badge
- De shift van uw collega waarmee wordt geruild

#### Verzoek Annuleren

- U kunt een lopend verzoek annuleren zolang het nog niet is goedgekeurd
- Klik op het X icoon naast uw verzoek
- Bevestig de annulering

#### Push Notificaties

Bij shift verzoeken ontvangt u automatisch meldingen (indien ingeschakeld):
- **Aanvrager**: Melding bij goedkeuring of afwijzing
- **Overnemer/Ruilpartner**: Melding wanneer de shift is toegewezen
- **Admins/Supervisors**: Melding bij nieuwe verzoeken

#### Let Op

- Shift ruilen moet eerst ingeschakeld zijn door de admin voor uw station
- De collega moet dezelfde station hebben als de shift
- U kunt alleen uw eigen shifts ruilen of overdragen
- Bij ruilen: beide shifts moeten in de toekomst liggen
- Goedgekeurde verzoeken kunnen niet ongedaan gemaakt worden

---

### 🙋 Bieden op Open Shifts

Het biedingssysteem stelt ambulanciers in staat om zich aan te melden voor open (niet-ingevulde) shifts. Admins en supervisors kunnen vervolgens kiezen wie de shift krijgt toegewezen.

#### Hoe werkt Bieden?

1. **Bekijk Open Shifts**: Op uw dashboard ziet u shifts die nog niet zijn ingevuld (aangegeven met "Niet ingevuld" in rood)
2. **Plaats een Bieding**: Klik op de blauwe **"Ik wil deze shift"** knop naast een open shift
3. **Bevestiging**: Na het plaatsen verschijnt een groene badge "Ingediend" als bevestiging
4. **Wacht op Toewijzing**: Een admin of supervisor bekijkt alle biedingen en wijst de shift toe

#### Mijn Biedingen

- Na het bieden ziet u een groene "Ingediend" badge naast de shift
- U kunt niet meerdere keren bieden op dezelfde shift
- Zodra de shift is toegewezen, ontvangt u een push notificatie

#### Push Notificaties bij Bieden

- **Bieding Geaccepteerd**: U ontvangt een melding wanneer de shift aan u is toegewezen
- **Bieding Afgewezen**: U ontvangt een melding als een andere bieder is gekozen
- **Admins/Supervisors**: Ontvangen een melding bij elke nieuwe bieding

#### Bieding Intrekken

Zolang uw bieding nog niet is verwerkt (pending status), kunt u deze intrekken:

1. Ga naar uw **Dashboard**
2. Zoek de shift waarvoor u geboden heeft (met de "Ingediend" badge)
3. Klik op het rode **X** icoon naast de badge
4. Uw bieding wordt direct ingetrokken

#### Let Op

- U kunt alleen bieden op open shifts van uw eigen station
- Alleen pending biedingen kunnen worden ingetrokken
- Als meerdere mensen bieden, kiest de admin/supervisor wie de shift krijgt
- Toegewezen shifts verschijnen direct in uw rooster

---

## 👁️ Handleiding voor Viewers

**Viewers hebben alleen-lezen toegang - ideaal voor dispatching personeel en display schermen**

Viewers zijn speciale gebruikersaccounts met beperkte rechten, ontworpen voor:
- 📺 **Display schermen**: Lumaps en andere digitale displays in de dispatching
- 👀 **Alleen bekijken**: Geen mogelijkheid om planning te wijzigen
- 🖥️ **Kiosk modus**: Speciale fullscreen weergave voor onbemande displays

### Wat Kunnen Viewers?

| Functie | Beschikbaar |
|---------|-------------|
| Planning bekijken | ✅ Ja |
| Fullscreen/kiosk modus | ✅ Ja |
| Profiel bekijken | ✅ Ja |
| Voorkeuren opgeven | ❌ Nee |
| Shifts ruilen | ❌ Nee |
| Overuren registreren | ❌ Nee |
| Bieden op shifts | ❌ Nee |

### 📺 Display Link (Kiosk Modus)

De Display Link is een speciale URL waarmee een viewer account automatisch wordt ingelogd en de planning in fullscreen modus wordt getoond. Dit is ideaal voor displays in de dispatching.

#### Kenmerken Kiosk Modus

- ✅ **Automatische login**: Geen wachtwoord nodig via de speciale link
- ✅ **Fullscreen weergave**: Geen navigatiebalk, alleen de planning
- ✅ **Sticky header met stationnaam**: De titel "Planning ZW Geel" (of ander station) blijft altijd zichtbaar bovenaan het scherm, ook bij scrollen
- ✅ **Rolling 14-dagen weergave**: Toont altijd de komende 14 dagen, ongeacht maand- of jaarwisselingen (bijv. 31 december toont ook 1-14 januari)
- ✅ **Auto-verversing**: Elke 60 seconden wordt de data automatisch ververst
- ✅ **Scroll naar vandaag**: De pagina scrollt automatisch naar de huidige dag
- ✅ **Alle shifts zichtbaar**: Toont alle shifts van het station (niet alleen "eigen" shifts)
- ✅ **Actieve shift markering**: Alleen de shift die op dit moment actief is wordt geel gemarkeerd (niet de hele dag). Dagshift 07:00-19:00 is geel tijdens die uren, nachtshift 19:00-07:00 is geel 's avonds en 's nachts
- ✅ **Open shifts rood**: Shifts zonder toegewezen medewerker worden rood weergegeven

#### Display Links Beheren (Admin/Supervisor)

**Nieuw vanaf versie 2025.20**: Admins en supervisors kunnen nu station kiosk links beheren via de **Integraties** pagina. Dit maakt het onnodig om eerst in te loggen als viewer.

**Belangrijk: Viewer Account Vereist**

Om de kiosk link te laten werken, moet er voor het betreffende station een **viewer account** bestaan. De kiosk link logt automatisch in met dit viewer account.

**Stappen om kiosk te activeren voor een station:**

1. **Eerst**: Maak een viewer account aan voor het station (zie [Viewer Account Aanmaken voor Displays](#viewer-account-aanmaken-voor-displays))
2. **Daarna**: Genereer de kiosk link via de Integraties pagina

**Station Kiosk Links via Integraties:**
1. Ga naar **Integraties** in het menu
2. Klik op **Kiosk/Display Modus** → **Beheren**
3. U ziet alle stations waartoe u toegang heeft
4. Per station kunt u:
   - **Link genereren**: Klik "Kiosk link genereren" om een nieuwe link aan te maken
   - **Link kopiëren**: Klik op het kopieer icoon om de link te kopiëren
   - **Nieuwe link genereren**: Oude link wordt ongeldig, nieuwe wordt aangemaakt
   - **Link intrekken**: Verwijdert de link zodat deze niet meer werkt

**Let op:** Als er geen viewer account voor een station is, zal de kiosk link niet correct werken. De planning wordt dan niet getoond.

**Voordelen:**
- ✅ Supervisors zien alle stations in één overzicht
- ✅ Admins zien hun eigen station(s)
- ✅ Eenvoudig links vernieuwen of intrekken

#### Display Link Ophalen (Viewer Profiel)

Viewers kunnen hun eigen link bekijken (alleen-lezen) in hun profiel:

**Stap 1: Log in als Viewer**
- Log in met het viewer account dat is aangemaakt voor de display
- Dit is een speciaal account dat alleen voor het display wordt gebruikt

**Stap 2: Ga naar Profiel**
- Klik op "Profiel" in de navigatie
- Scroll naar de sectie "Display Link (Lumaps)"

**Stap 3: Kopieer de Link**
- U ziet uw persoonlijke display link
- Klik op het kopieer icoon (📋) om de link te kopiëren
- **Let op**: Viewers kunnen de link niet zelf regenereren - vraag een admin/supervisor

#### Display Link Gebruiken met Lumaps

**Configuratie in Lumaps:**
1. Open de Lumaps configuratie interface
2. Voeg een nieuwe pagina/widget toe van type "Webpagina"
3. Plak de display link in het URL veld
4. De pagina ververst zichzelf al elke 60 seconden

**Testen:**
- Bekijk het display om te verifiëren dat de planning correct wordt weergegeven
- Alleen de actieve shift (die nu bezig is) moet geel gemarkeerd zijn
- De planning moet automatisch naar vandaag scrollen
- De stationnaam moet zichtbaar blijven in de sticky header bij scrollen
- Controleer rond maandwisselingen dat de 14-dagen weergave correct doorloopt

#### Weergave Details

| Element | Weergave |
|---------|----------|
| **Titel** | "Planning [Station Naam]" (bijv. "Planning ZW Geel") |
| **Huidige dag** | Geel gemarkeerd |
| **Open shifts** | Rood weergegeven (niet-ingevuld) |
| **Ingevulde shifts** | Naam van de medewerker |
| **Auto-refresh** | Elke 60 seconden |

#### Veiligheid

- 🔐 Elke viewer heeft een **unieke token** in de link
- 🔒 Deel de link alleen met mensen die toegang nodig hebben
- ⚠️ Bij vermoeden van misbruik: vraag admin om nieuw viewer account

#### Probleemoplossing Display

| Probleem | Oplossing |
|----------|-----------|
| **Lege pagina** | Controleer of de link correct is gekopieerd |
| **Inlogscherm i.p.v. planning** | Token is ongeldig, vraag nieuwe link aan admin |
| **Geen shifts zichtbaar** | Controleer of er shifts zijn voor de huidige maand |
| **Verkeerd station** | Controleer of viewer account aan juiste station is gekoppeld |
| **Link werkt niet extern** | Zie IT configuratie: BASE_URL instellen (Deel II) |

---

## 🔧 Handleiding voor Admins

**Admins hebben alle rechten van ambulanciers PLUS extra beheersrechten**

### 🏠 Dashboard - Admin Versie

Als admin ziet u extra knoppen:

- **Feestdagen**: Beheer nationale en lokale feestdagen
- **Gebruikersbeheer**: Medewerkers toevoegen/bewerken/verwijderen
- **Statistieken**: Gedetailleerde rapporten over shifts en voorkeuren
- **Planning**: Automatische planningen genereren
- **Weekdag Instellingen**: Configureer shift tijden en regels

### 👥 Gebruikersbeheer

#### Nieuwe Gebruiker Aanmaken

**Gebruikersbeheer Openen**
- Klik "Gebruikersbeheer" op dashboard
- Klik "Nieuwe Gebruiker"

**Gegevens Invullen:**
- **Gebruikersnaam**: Unieke login naam (bijv. jeva400). Hiervoor word de Windows login gebruikt in kleine letters
- **Wachtwoord**: Minimaal 6 karakters en is hoofdletter gevoelig
- **Voor/Achternaam**: Volledige naam
- **Email**: Voor wachtwoord reset en notificaties. Geef het volledige e-mail adres in (bijv. jeroen.vanhoof@brandweerzonekempen.be)
- **Rol**: Kies de juiste rol:
  - **Ambulancier**: Standaard rol voor medewerkers die shifts werken
  - **Admin**: Volledige beheersrechten voor het station
  - **Viewer**: Alleen-lezen toegang (voor displays/dispatching)
- **Werkuren**: Max aantal uren per maand dat automatisch wordt ingepland (bijv. 24). Gebruik veelvouden van 12 uur
- **Beroepspersoneel**: Aanvinken voor beroepspersoneel met opt-out regeling. **Effect**: Maximum 1 shift per week wordt automatisch ingepland door het systeem. Dit voorkomt dat beroepspersoneel te vaak wordt ingeroosterd naast hun reguliere werk
- **Heeft rijbewijs C**: Aanvinken als de ambulancier rijbewijs C heeft. Standaard staat dit **AAN**. Vink **UIT** voor ambulanciers zonder rijbewijs C.

**Opslaan en Testen:**
- Klik "Aanmaken"
- Test login met nieuwe gebruiker
- Deel inloggegevens veilig

#### Viewer Account Aanmaken voor Displays

Om een display scherm (Lumaps) te koppelen aan het planningsysteem, maakt u een **viewer account** aan:

**Stap 1: Maak Viewer Account Aan**
1. Ga naar **Gebruikersbeheer**
2. Klik **"Nieuwe Gebruiker"**
3. Vul in:
   - **Gebruikersnaam**: Beschrijvende naam (bijv. `display-mol` of `lumaps-geel`)
   - **Wachtwoord**: Willekeurig wachtwoord (wordt niet gebruikt bij kiosk link)
   - **Voornaam/Achternaam**: Bijv. "Display" / "PIT Mol"
   - **Rol**: **Viewer** (belangrijk!)
   - **Station**: Het station waarvan de planning getoond moet worden
4. Klik **"Aanmaken"**

**Stap 2: Haal de Display Link Op**
1. Log in als de nieuwe viewer (of reset het wachtwoord als u het bent vergeten)
2. Ga naar **Profiel**
3. Kopieer de **Display Link** uit de "Display Link (Lumaps)" sectie

**Stap 3: Configureer het Display**
1. Plak de link in Lumaps of ander display systeem
2. Test of de planning correct wordt weergegeven

**Tips:**
- Maak per display/station een apart viewer account aan
- Gebruik duidelijke namen (bijv. `display-zwgeel`, `lumaps-mol`)
- De kiosk link werkt alleen voor accounts met de **Viewer** rol

#### Bestaande Gebruiker Bewerken

**Gebruiker Vinden**
- Gebruik zoekbalk voor naam/gebruikersnaam
- Klik bewerkknop (potlood icoon)

**Mogelijke Wijzigingen:**
- Namen en contactgegevens
- Email adres (optioneel)
- **Telefoonnummer**: Voeg contactinformatie toe (optioneel, max 20 karakters)
- **Profielfoto**: Upload een profielfoto (max 2MB, JPG/PNG/GIF)
- Aantal werkuren aanpassen
- Rol wijzigen (ambulancier ↔ admin)
- Professional status wijzigen
- Rijbewijs C status wijzigen

**Profielfoto Uploaden:**
1. Klik bewerkknop (potlood icoon) naast gebruiker
2. Klik op "Bestand kiezen" bij Profielfoto sectie
3. Selecteer een foto (max 2MB)
4. Bekijk de preview rechts van het upload veld
5. Klik "Opslaan" om alle wijzigingen toe te passen

**Telefoonnummer Toevoegen:**
1. Klik bewerkknop (potlood icoon) naast gebruiker
2. Vul het telefoonnummer in (bijvoorbeeld: +32 123 45 67 89)
3. Klik "Opslaan"

**Wachtwoord Wijzigen:**
- Klik sleutel icoon naast gebruiker
- Voer nieuw wachtwoord in (min. 6 karakters)
- Deel nieuwe wachtwoord veilig

#### Gebruiker Beschikbaarheden Bekijken

**Oog Icoon Klikken**
- Naast elke gebruiker staat een oog icoon
- Selecteer de maand waarvan je hun voorkeuren van wilt bekijken

**Maand/Jaar Selecteren:**
- Kies de gewenste periode
- Bekijk alle opgegeven voorkeuren
- Handig voor planning controle

#### Gebruiker Verwijderen

⚠️ **Let Op: Verwijderen is permanent!**

- Klik prullenbak icoon naast gebruiker
- Bevestig verwijdering
- Alle shifts en voorkeuren worden ook verwijderd
- Je kan jezelf niet verwijderen

📋 **Cross-Team Admins**: Als je admin bent van meerdere stations (primair + cross-team), kun je gebruikers verwijderen uit alle stations waar je toegang toe hebt. Dit geldt zowel voor je primaire station als voor je cross-team stations.

**Wat wordt automatisch verwijderd:**
- Alle shifts van de gebruiker
- Alle shift voorkeuren
- Verdi synchronisatie logs
- Cross-team station toewijzingen
- Kalender tokens (gedeelde kalender links worden ongeldig)
- Gebruikerscommentaren

### 📊 Planning Genereren

#### Automatische Planning

**Planning Pagina**
- Klik "Planning" op dashboard
- Selecteer juiste maand en jaar

**Planning Starten:**
- Klik "Genereer Planning"
- Controleer in de pop-up of je de juiste maand hebt geselecteerd en bevestig dit
- Systeem analyseert alle voorkeuren
- Algoritme wijst optimaal shifts toe

**Handmatige Aanpassingen:**
- Klik op shift om handmatig toe te wijzen
- Selecteer beschikbare medewerker

#### 📢 Planning Publiceren

Na het genereren van een planning is deze **nog niet zichtbaar** voor medewerkers. Dit geeft u de mogelijkheid om eerst handmatige aanpassingen te maken voordat de planning wordt gedeeld.

**Concept Fase (Niet Gepubliceerd):**
- Na het genereren ziet u een gele banner: "Planning nog niet gepubliceerd"
- Medewerkers kunnen de planning nog niet zien op hun dashboard
- U kunt in rust de planning controleren en aanpassen
- Er worden nog geen push notificaties verzonden

**Planning Publiceren:**
1. Controleer alle shifts en maak eventuele aanpassingen
2. Klik op de **"Planning Publiceren"** knop (oranje)
3. De planning wordt direct zichtbaar voor alle medewerkers
4. Alle medewerkers met push notificaties ontvangen een melding
5. De banner wordt groen: "Planning gepubliceerd"

**Publicatie Intrekken:**
- Klik op "Intrekken" om de planning weer te verbergen
- Handig als u grote wijzigingen moet maken
- Medewerkers zien de shifts niet meer totdat u opnieuw publiceert

**Belangrijk:**
- Bestaande planningen (voor deze update) worden automatisch als gepubliceerd behandeld
- U kunt een gepubliceerde planning nog steeds bewerken - wijzigingen zijn direct zichtbaar
- Alleen bij grotere aanpassingen is het verstandig om eerst in te trekken

#### ↩️ Undo Historie (Wijzigingen Terugdraaien)

Als admin of supervisor kunt u recente handmatige wijzigingen aan de planning ongedaan maken. Dit is handig wanneer u per ongeluk de verkeerde persoon hebt toegewezen of een wijziging wilt terugdraaien.

**Toegang tot Undo Historie:**

1. Ga naar de **Planning** pagina
2. Scroll naar beneden tot het **Undo Historie** paneel
3. Klik op de titel om het paneel uit te klappen

**Wat kunt u terugdraaien:**

| Type Wijziging | Beschrijving |
|----------------|--------------|
| **Toewijzing** | Een shift toewijzen aan een medewerker |
| **Shift** | Wijzigingen aan shift details (tijd, type) |
| **Verwijderd** | Verwijderde shifts herstellen |

**Hoe een wijziging ongedaan maken:**

1. Open het **Undo Historie** paneel
2. Bekijk de recente wijzigingen (gesorteerd op datum/tijd)
3. Bij elke wijziging ziet u:
   - **Type**: Toewijzing, Shift, of Verwijderd
   - **Beschrijving**: Wat er is gewijzigd
   - **Tijdstip**: Wanneer de wijziging is gemaakt
   - **Door wie**: Naam van de admin die de wijziging maakte
4. Klik op het **↩️ undo icoon** naast de wijziging
5. Bevestig in de popup
6. De shift wordt teruggezet naar de vorige staat

**Belangrijke opmerkingen:**

- ⏰ **Beperkte historie**: Alleen de laatste 50 wijzigingen worden getoond
- 📅 **Per maand gefilterd**: U ziet alleen wijzigingen voor de geselecteerde maand
- 🔒 **Eenmalig**: Elke wijziging kan maar één keer ongedaan gemaakt worden
- ⚠️ **Planning generatie**: Het ongedaan maken van een volledige planning generatie is niet mogelijk via dit paneel - gebruik hiervoor de systeem Rollback functie

**Voorbeeld Scenario:**

U hebt per ongeluk Jan toegewezen aan een nachtshift op 15 december, maar het moest eigenlijk Piet zijn:

1. Open Undo Historie paneel
2. Zoek "Shift toegewezen: Jan Jansen - 15 dec nacht"
3. Klik op het undo icoon
4. Bevestig → De shift wordt weer "Niet ingevuld"
5. Wijs nu Piet toe aan de shift

#### ↩️ Undo Historie (Gebruikersbeheer)

Naast shift planning wijzigingen kunt u ook gebruikersbeheer acties ongedaan maken. Dit is handig wanneer u per ongeluk een gebruiker hebt verwijderd of verkeerde gegevens hebt ingevuld.

**Toegang tot Gebruiker Undo Historie:**

1. Ga naar de **Gebruikersbeheer** pagina
2. Scroll naar beneden tot het **Undo Historie (Gebruikersbeheer)** paneel
3. Klik op de titel om het paneel uit te klappen

**Wat kunt u terugdraaien:**

| Type Wijziging | Badge Kleur | Beschrijving |
|----------------|-------------|--------------|
| **Aangemaakt** | Groen | Een nieuwe gebruiker aanmaken |
| **Bijgewerkt** | Grijs | Wijzigingen aan gebruikersgegevens |
| **Verwijderd** | Rood | Verwijderde gebruikers herstellen |
| **Station +** | Blauw | Cross-team station toewijzing toegevoegd |
| **Station -** | Oranje | Cross-team station toewijzing verwijderd |

**Hoe een wijziging ongedaan maken:**

1. Open het **Undo Historie (Gebruikersbeheer)** paneel
2. Bekijk de recente wijzigingen (gesorteerd op datum/tijd)
3. Bij elke wijziging ziet u:
   - **Type badge**: Soort wijziging (zie tabel hierboven)
   - **Beschrijving**: Wat er is gewijzigd (bijv. "Gebruiker Jan Jansen aangemaakt")
   - **Tijdstip**: Wanneer de wijziging is gemaakt
   - **Door wie**: Naam van de admin die de wijziging maakte
4. Klik op het **↩️ undo icoon** naast de wijziging
5. Bevestig in de popup
6. De gebruiker wordt teruggezet naar de vorige staat

**Belangrijke opmerkingen:**

- ⏰ **Beperkte historie**: Alleen de laatste 50 wijzigingen worden getoond
- 🔒 **Eenmalig**: Elke wijziging kan maar één keer ongedaan gemaakt worden
- ⚠️ **Verwijderde gebruikers**: Bij het herstellen van een verwijderde gebruiker worden alleen de basisgegevens hersteld (naam, email, rol, station, uren). Gerelateerde shifts, voorkeuren en biedingen blijven verwijderd vanwege cascade delete
- 🏥 **Station beperking**: Admins zien alleen wijzigingen voor hun eigen station. Supervisors zien alle stations

**Voorbeeld Scenario:**

U hebt per ongeluk gebruiker Maria verwijderd:

1. Open Undo Historie (Gebruikersbeheer) paneel
2. Zoek "Gebruiker Maria Janssen verwijderd" (rode badge)
3. Klik op het undo icoon
4. Bevestig → Maria's account wordt hersteld met basisgegevens
5. Maria kan nu weer inloggen (let op: shifts en voorkeuren moeten opnieuw worden ingevoerd)

#### 👥 Beschikbaarheid Bekijken per Datum 

Als admin kunt u op elke datum in de planning klikken om te zien wie beschikbaar is voor die specifieke shift. Dit helpt u om:
- Snel te zien wie nog kan worden ingepland
- Beschikbare uren te controleren voordat u toewijst
- Weloverwogen planning beslissingen te nemen

**Hoe Gebruiken:**

1. **Klik op een datum** in de planning kalender
2. **Zie het beschikbaarheidsscherm** met de volgende kolommen:
   - **Naam**: Naam van de ambulancier
   - **Status**: Zie status badges hieronder
   - **Uren**: Hoeveel uur deze persoon wil werken deze maand
   - **Ingepland**: Hoeveel uur deze persoon al is ingepland

**Status Badges:**

| Badge | Kleur | Betekenis |
|-------|-------|-----------|
| **Toegewezen** | Blauw | Reeds ingepland voor deze shift |
| **Ingepland elders** | Paars | Cross-team gebruiker is ingepland bij een ander station op dit moment |
| **Beschikbaar** | Groen | Heeft voorkeur opgegeven en kan worden ingepland |
| **Geen voorkeur** | Oranje | Geen voorkeur ingediend voor deze specifieke shift (dag OF nacht) |
| **Werkt geen uren** | Grijs | Medewerker heeft 0 uur als maximum ingesteld |
| **Niet beschikbaar** | Rood | Heeft aangegeven niet beschikbaar te zijn |

⚠️ **Let op Cross-team Gebruikers:** Wanneer een medewerker die bij meerdere stations werkt al is ingepland op een ander station, ziet u "Ingepland elders" (paars). Dit voorkomt dat u dezelfde persoon dubbel inplant!

**De "Ingepland" Kolom:**

Deze nieuwe kolom toont in één oogopslag hoeveel van de beschikbare uren al gebruikt zijn:

```
24 / 48 (50%)
│   │    └─ Percentage van beschikbare uren al ingepland
│   └────── Totaal beschikbare uren (opgegeven door gebruiker)
└────────── Al ingepland deze maand
```

**Voorbeelden:**

| Naam | Status | Uren | Ingepland | Interpretatie |
|------|--------|------|-----------|---------------|
| Emiel Thys | Beschikbaar | 48 | **24 / 48 (50%)** | Heeft nog 24 uur vrij |
| Filip Mangelschots | Beschikbaar | 24 | **24 / 24 (100%)** | Volledig ingepland |
| Gilles Heylen | Beschikbaar | 36 | **0 / 36 (0%)** | Nog niet ingepland |
| Guanny Elaily | Toegewezen | 36 | **12 / 36 (33%)** | Al toegewezen aan huidige shift |

**💡 Planning Tips:**

- ✅ **Prioriteer personen met 0%** - Nog helemaal niet ingepland
- ⚠️ **Let op bij 80%+** - Bijna vol, nog weinig ruimte
- 🚫 **Vermijd bij 100%** - Volledig ingepland (tenzij ze meer uren willen)
- 📊 **Gebruik percentages** om eerlijke verdeling te bewaken

**Voorbeeld Scenario:**

U moet iemand toewijzen aan een 12-uur nachtshift op 15 november:

1. Klik op **15 november** → Beschikbaarheidsscherm opent
2. Zie wie beschikbaar is:
   - Jan: 36 / 48 (75%) - Nog 12 uur vrij ✅
   - Piet: 48 / 48 (100%) - Volledig ingepland ❌
   - Anna: 0 / 36 (0%) - Nog helemaal niet ingepland ✅✅
3. **Kies Anna** - Zij heeft prioriteit omdat ze nog 0% heeft

Dit helpt u om eerlijke planning te garanderen en te voorkomen dat sommige mensen te veel shifts krijgen terwijl anderen te weinig hebben!

#### Voorkeuren Verwijderen

⚠️ **Let Op: Dit is een destructieve actie die niet ongedaan gemaakt kan worden!**

**Wat doet deze functie?**

De "Verwijder Voorkeuren" knop verwijdert ALLE opgegeven shift voorkeuren van alle gebruikers voor een specifieke maand. Dit is handig wanneer:

- Er een fout is gemaakt bij het genereren van test voorkeuren
- Alle voorkeuren opnieuw moeten worden opgegeven voor een maand
- Je alle voorkeuren wilt resetten voordat gebruikers ze opnieuw opgeven

**Hoe gebruik je het?**

**Stap 1: Navigeer naar Planning Pagina**
- Klik "Planning" op dashboard
- Selecteer de juiste maand en jaar waarvan je de voorkeuren wilt verwijderen

**Stap 2: Klik op "Verwijder Voorkeuren"**
- Oranje knop in de sectie "Voorkeuren Verwijderen"
- Let op: Deze sectie staat tussen "Test Voorkeuren Genereren" en "Planning Verwijderen"

**Stap 3: Bevestig de Actie**
- Je ziet een waarschuwingsvenster
- Lees de waarschuwing zorgvuldig
- Voer het admin wachtwoord in
- Klik "Verwijder Voorkeuren" om te bevestigen

**Wat gebeurt er?**

- Alle opgegeven voorkeuren voor de geselecteerde maand worden verwijderd
- Alleen voorkeuren van jouw station worden verwijderd (niet van andere stations)
- De planning blijft behouden (alleen voorkeuren worden verwijderd)
- Gebruikers moeten opnieuw hun voorkeuren opgeven

**Belangrijk:**

- ✅ Deze actie is beperkt tot jouw station
- ✅ De planning (shifts) wordt niet verwijderd
- ⚠️ Alle gebruikers moeten opnieuw hun voorkeuren opgeven
- ⚠️ Deze actie kan niet ongedaan worden gemaakt
- 🔒 Wachtwoord vereist voor beveiliging

### 🙋 Biedingen Beheren (Admins)

Als admin kunt u biedingen op open shifts bekijken en toewijzen. Dit geeft u controle over wie welke open shifts krijgt.

#### Biedingen Bekijken

Wanneer ambulanciers bieden op een open shift, ziet u in de planning:
- Een blauwe badge met **"X biedingen"** naast open shifts
- Klik op deze badge om alle biedingen te bekijken

#### Biedingen Toewijzen of Afwijzen

**In het biedingen dialoogvenster ziet u:**
- Naam van de bieder
- Datum en tijd van de bieding
- **Rood X icoon** om een bieding af te wijzen
- **"Toewijzen"** knop om de shift toe te wijzen

**Shift Toewijzen:**
1. Klik op de blauwe **"X biedingen"** badge naast een open shift
2. Bekijk alle biedingen en kies de meest geschikte kandidaat
3. Klik **"Toewijzen"** naast de gewenste bieder
4. De shift wordt automatisch aan deze persoon toegewezen
5. Andere bieders ontvangen automatisch een afwijzingsmelding

**Bieding Afwijzen:**
1. Klik op de blauwe **"X biedingen"** badge naast een open shift
2. Klik op het **rode X icoon** naast de bieding die u wilt afwijzen
3. De bieder ontvangt een push notificatie over de afwijzing
4. De shift blijft open voor andere biedingen of handmatige toewijzing

#### Push Notificaties

Bij het verwerken van biedingen:
- **Nieuwe bieding**: U ontvangt een melding wanneer iemand biedt
- **Na toewijzing**: De gekozen bieder ontvangt een bevestiging
- **Afgewezen bieders**: Ontvangen automatisch een afwijzingsmelding

### 🧠 Gedetailleerde Uitleg Planning Algoritme

#### 📋 Overzicht Planning Process

Het systeem gebruikt een geavanceerd multi-fase algoritme dat prioriteit geeft aan eerlijke verdeling, veiligheid en efficiëntie. Hier is de volledige uitleg van hoe uw planning tot stand komt:

#### 🔄 Hoofdfasen van Planning

**Fase 1: Voorbereiding**

- Verwijder eventuele oude shifts voor de geselecteerde maand
- Identificeer alle actieve medewerkers (die uren willen werken)
- Laad alle voorkeuren voor de maand
- Initialiseer uren tracking per medewerker

**Fase 2: Weekend Planning (EERST)**

- Plan alle weekend shifts vóór weekdag shifts
- Gebruikt historische weekend data voor eerlijke verdeling
- Prioriteert medewerkers met minder weekend geschiedenis

**Fase 3: Weekdag Planning (DAARNA)**

- Plan alle weekdag shifts na weekend shifts
- Gebruikt workload balancing voor eerlijke verdeling
- Prioriteert medewerkers met minder toegewezen uren

#### 🔢 Volgorde van Inplannen

**1⃣ Weekend Shifts Eerst (Zaterdag & Zondag)**

*Waarom weekends eerst?*

- Weekends zijn moeilijker te vullen
- Historische eerlijke verdeling is belangrijk
- Meer flexibiliteit in planning

*Weekend Prioriteit Systeem:*

```
│ 1. Minste weekend shifts in geschiedenis    
│ 2. Minste uren toegewezen deze maand       
│ 3. Beschikbaar voor volledige shift        
│ 4. Beschikbaar voor halve shift           
```

*Voorbeeld Weekend Toewijzing:*

- Jan heeft 2 weekend shifts dit jaar → Prioriteit 1
- Piet heeft 4 weekend shifts dit jaar → Prioriteit 2
- Anna heeft 6 weekend shifts dit jaar → Prioriteit 3

**2⃣ Weekdag Shifts Daarna (Maandag-Vrijdag)**

*Weekdag Prioriteit Systeem:*

```
┌─────────────────────────────────────────────┐
│ URGENTE GROEP (<33% van uren gewerkt)      │
│ - Willekeurige volgorde binnen groep       │
├─────────────────────────────────────────────┤
│ NORMALE GROEP (33-66% van uren gewerkt)    │
│ - Willekeurige volgorde binnen groep       │
├─────────────────────────────────────────────┤
│ LAGE PRIORITEIT (>66% van uren gewerkt)    │
│ - Willekeurige volgorde binnen groep       │
└─────────────────────────────────────────────┘
```

### ⚙️ Shift Toewijzing per Dag

**Voor Elke Dag (Weekend of Weekdag):**

**Stap 1: Verzamel Beschikbaarheid**

- Zoek alle medewerkers met voorkeuren voor deze dag
- Categoriseer per shift type en tijd:
  - Volledige dag shifts (7:00-19:00)
  - Eerste helft dag (7:00-13:00)
  - Tweede helft dag (13:00-19:00)
  - Volledige nacht shifts (19:00-7:00)

**Stap 2: Sorteer Kandidaten**

- Weekend dagen: Gebruik weekend prioriteit systeem
- Weekdagen: Gebruik workload prioriteit systeem
- Filter medewerkers die nog uren beschikbaar hebben

**Stap 3: Wijs Shifts Toe**

*A) Dag Shifts (Weekends):*

1. Probeer 2 volledige dag shifts toe te wijzen
2. Als niet mogelijk → Probeer halve shifts:
   - Eerste helft (7:00-13:00)
   - Tweede helft (13:00-19:00)
3. Maak open shifts voor niet-gevulde slots

*B) Nacht Shifts (Alle dagen):*

1. Wijs nacht shifts toe
2. Prioriteer altijd volledige nacht shifts (19:00-7:00)
3. Maak open shifts voor niet-gevulde slots

### ⚖️ Eerlijke Verdeling Systemen

#### 🏖️ Weekend Eerlijkheid

**Jaarlijkse Weekend Geschiedenis:**

- Systeem houdt bij hoeveel weekend shifts elke medewerker heeft gehad
- Telt zowel zaterdagen, zondagen ALS feestdagen
- Medewerkers met minder weekend shifts krijgen voorrang

*Voorbeeld:*

| Gebruiker | Weekend Shifts 2025 | Prioriteit |
|-----------|-------------------|------------|
| Rob       | 3 shifts          | 🟢 Hoog    |
| Jan       | 5 shifts          | 🟡 Gemiddeld |
| Piet      | 8 shifts          | 🔴 Laag    |

#### ⚖️ Workload Balancing (Weekdagen)

**Uren Percentage Systeem:**

- **Urgente groep**: <33% van opgegeven uren gewerkt
- **Normale groep**: 33-66% van opgegeven uren gewerkt
- **Lage prioriteit**: >66% van opgegeven uren gewerkt

*Voorbeeld (24 uur/maand opgegeven):*

| Gebruiker | Gewerkte Uren | Percentage | Groep      |
|-----------|--------------|-----------|-----------|
| Anna      | 6 uur        | 25%       | 🟢 Urgent |
| Bob       | 12 uur       | 50%       | 🟡 Normaal |
| Chris     | 20 uur       | 83%       | 🔴 Laag   |

### 🛡️ Veiligheids Controles

#### ⏰ Rust Periode Controle

**12-Uur Regel:**

- Minimum 12 uur rust tussen shifts
- Geldt ook voor shifts op andere stations (cross-team)
- Voorkomt gevaarlijke opeenvolgende diensten

*Voorbeeld Blokkering:*

❌ **GEWEIGERD:**
```
Maandag 19:00-7:00 (Nacht)
Dinsdag 7:00-19:00 (Dag)
→ Slechts 0 uur rust!
```

✅ **TOEGESTAAN:**
```
Maandag 19:00-7:00 (Nacht)
Woensdag 7:00-19:00 (Dag)
→ 48 uur rust
```

#### 👔 Professional Beperking (beroeps)

**Beroepspersoneel Regels:**

- Maximum 1 shift per week
- Systeem houdt automatisch rekening met deze beperking

#### 🚗 Rijbewijs C Validatie

**Veiligheidsregel:**

- Elk shift-team moet **minimaal 1 ambulancier met rijbewijs C** bevatten
- Systeem blokkeert automatisch combinaties waar beide teamleden geen rijbewijs C hebben

**Hoe het werkt:**

Bij het toewijzen van shifts controleert het systeem:

1. Is dit het laatste teamlid dat wordt toegewezen voor deze shift?
2. Hebben alle reeds toegewezen teamleden geen rijbewijs C?
3. → Dan wordt deze kandidaat geblokkeerd als hij/zij ook geen rijbewijs C heeft

*Voorbeeld Blokkering:*

❌ **GEWEIGERD:**
```
Zaterdag Dagshift:
- Anna (geen rijbewijs C) → al toegewezen
- Bob (geen rijbewijs C) → wordt geblokkeerd!
→ Team zou geen bestuurder hebben
```

✅ **TOEGESTAAN:**
```
Zaterdag Dagshift:
- Anna (geen rijbewijs C) → al toegewezen
- Chris (heeft rijbewijs C) → wordt toegewezen ✓
→ Team heeft minimaal 1 bestuurder
```

**Handmatige Planning:**

- Admins kunnen bewust afwijken van deze regel bij noodgevallen
- Systeem toont wel een waarschuwing bij handmatige toewijzing

**In Gebruikerslijst:**

- Ambulanciers zonder rijbewijs C worden visueel gemarkeerd
- Checkbox "Heeft rijbewijs C" is zichtbaar en bewerkbaar door admins

### 🔄 Multi-Pass Optimalisatie

**Pass 1: Basis Toewijzing**

- Wijs shifts toe op basis van voorkeuren en prioriteiten
- Maak open shifts waar geen kandidaten zijn

**Pass 2: Intelligente Swapping**

- Zoek betere combinaties door shifts te ruilen en zo open shifts in te plannen
- Verbeter overall tevredenheid en verdeling

**Pass 3: Gap Filling**

- Laatste poging om kritieke open slots te vullen door verder shifts te wisselen tussen gebruikers

### 🎯 Speciale Overwegingen

#### 🎄 Feestdagen = Weekend Behandeling

**Belangrijke Regel:**

- Alle feestdagen gebruiken zondag configuratie
- Feestdagen tellen mee voor weekend shift geschiedenis
- Voorbeelden: Wapenstilstand (11 nov), Kerstmis, etc.
- Feestdagen moeten enkel ingesteld worden als er op deze dagen geen bezetting aanwezig is en er vrijwillig personeel/beroepspersoneel in opt-out gezocht moet worden

#### 🔄 Cross-Team Functionaliteit

**Voor Medewerkers op Meerdere Stations:**

- Controle op dubbele bookings
- Respect voor uur limieten per station
- Veiligheidscontroles over alle stations heen

#### ➗ Split Shift Logica

**Wanneer Toegepast:**

- Alleen als volledige shifts niet mogelijk zijn
- Respecteert configuratie per station
- Cross-team gebruikers krijgen geen split shifts (eenvoud)

**Voorrang Volgorde:**

1. Volledige shifts (12 uur)
2. Halve dag shifts (6 uur)

**Intelligente Toewijzing bij Resterende Halve Shifts:**

Het systeem werkt in twee fasen en filtert toegewezen gebruikers automatisch uit:

**Fase 1 - Volledige Shifts (prioriteit):**
- Mensen met hele dag beschikbaarheid krijgen eerst voorrang voor volledige 12-uur shifts
- Mensen met expliciete halve dag voorkeur (alleen ochtend OF alleen middag) worden overgeslagen

**Fase 2 - Resterende Halve Shifts:**
- Als er nog halve shifts nodig zijn, gaat het systeem verder met fase 2
- **Mensen die al in fase 1 zijn toegewezen, worden automatisch overgeslagen**
- **BUGFIX:** Hele-dag gebruikers die NIET in fase 1 zijn toegewezen, kunnen nu voor ochtend- of middagslots worden ingezet
- Mensen met specifieke halve dag voorkeur kunnen alleen voor hun specifieke tijdslot worden ingezet

**Praktisch Voorbeeld:**

*Situatie: 3 personen nodig op dag 15 december*

**Beschikbaarheid:**
- Gebruiker A: hele dag (7-19u)
- Gebruiker B: hele dag (7-19u)  
- Gebruiker C: hele dag (7-19u), maar heeft slechts 6 uur beschikbaar (maximum bereikt)
- Gebruiker D: alleen middag (13-19u)

**Fase 1 (Volledige shifts):**
- A → Volledige shift (7-19u) ✅
- B → Volledige shift (7-19u) ✅
- C wordt overgeslagen (heeft slechts 6 uur over in uur-limiet, niet genoeg voor volledige 12-uur shift)
- Resultaat: 2 van 3 personen ingepland, stillNeedDayShifts = 1

**Fase 2 (Halve shifts):**
We hebben nog 1 persoon nodig. Dit betekent: 3x voormiddag EN 3x middag coverage.
Huidige coverage: 2 voormiddagen (van A+B), 2 middagen (van A+B). Nog nodig: 1 voormiddag + 1 middag.

*Oude situatie (vóór bugfix):*
- Voormiddag: Geen match ❌ (C heeft geen expliciete "alleen ochtend" voorkeur, dus niet in lijst)
- Middag: D wordt toegewezen ✅  
- **Probleem: Voormiddag blijft leeg!**

*Nieuwe situatie (ná bugfix):*
- Voormiddag: C wordt toegewezen ✅ (hele dag beschikbaar + nog niet toegewezen in fase 1 + heeft 6 uur over)
- Middag: D wordt toegewezen ✅
- **Alle slots gevuld! 🎉**

**Kernverbetering:**
Hele-dag gebruikers die in fase 1 niet zijn toegewezen, kunnen nu flexibel worden ingezet voor resterende halve shifts. Dit voorkomt lege slots en maximaliseert de inzet van beschikbaar personeel!

### 📊 Planning Resultaat Interpretatie

#### ✅ Succesvolle Planning

- **Groene shifts**: Succesvol toegewezen aan beschikbare medewerker
- **Eerlijke verdeling**: Weekend shifts gelijkmatig verdeeld
- **Veilig**: Alle rust periodes gerespecteerd

#### ⚠️ Gedeeltelijk Succesvol

- **Oranje shifts**: Mogelijk suboptimaal maar veilig
- **Enkele open slots**: Onvoldoende beschikbaarheid op specifieke dagen
- **Handmatige aanpassing mogelijk**: Admin kan shifts herorganiseren

#### ❌ Problematische Planning

- **Veel rode shifts**: Grote tekorten in beschikbaarheid
- **Ongelijke verdeling**: Sommige medewerkers veel meer shifts
- **Actie vereist**: Meer voorkeuren nodig of planning aanpassen

### 💡 Tips voor Betere Planning

**Voor Admins:**

- **Motiveer ruime voorkeur opgave** - Meer beschikbaarheid = betere planning
- **Monitor weekend verdeling** - Check statistieken regelmatig → Als er personen zijn die geen weekends opgeven zullen ze ook niet ingepland worden in het weekend
- **Gebruik handmatige aanpassingen** - Voor fine-tuning na automatische planning
- **Check open slots vroeg** - Vroeg ingrijpen voorkomt problemen

**Voor Medewerkers:**

- **Geef royale voorkeuren op** - Vergroot uw kans op gewenste shifts
- **Weekend beschikbaarheid** - Weekend shifts worden eerlijk verdeeld
- **Respect deadlines** - Na de deadline kunnen geen voorkeuren meer opgegeven worden
- **Communiceer wijzigingen** - Informeer admin bij onverwachte wijzigingen

---

#### 📋 Planning Algoritme Samenvatting

Het systeem gebruikt geavanceerde algoritmes:

- **Weekend-First Planning**: Weekends worden eerst gepland voor eerlijke verdeling
- **Historische Eerlijkheid**: Weekend shifts gebaseerd op jaarlijkse geschiedenis
- **Workload Balancing**: Weekdag shifts gebaseerd op huidige werkbelasting
- **Veiligheidsregels**: Minimum 12 uur rust tussen shifts (ook cross-team)
- **Professional Limits**: Beroepspersoneel max 1 shift per week
- **Multi-Pass Optimalisatie**: Meerdere fasen voor optimale resultaten
- **Gap Filling**: Intelligent algoritme probeert alle slots te vullen

### 🎄 Feestdagen Beheren

#### Nationale Feestdagen

**Feestdagen Pagina**
- Klik "Feestdagen" op dashboard
- Bekijk lijst van alle feestdagen
- Feestdagen moeten enkel ingesteld worden als je op deze feestdagen geen beroepspersoneel hebt. Het programma gaat dan voor de feestdagen die op weekdagen vallen ook personeel zoeken

**Standaard Belgische Feestdagen:**
- Nieuwjaar (1 januari)
- Paasmaandag (variabel)
- Dag van de Arbeid (1 mei)
- Hemelvaart (variabel)
- Pinkstermaandag (variabel)
- Nationale Feestdag (21 juli)
- Wapenstilstand (11 november)
- Kerstmis (25 december)

#### Lokale Feestdagen Toevoegen

**Nieuwe Feestdag:**
- Klik "Nieuwe Feestdag"
- Vul naam en datum in
- Selecteer of het actief is

**Lokale Evenementen:**
- Kermis dagen
- Lokale festiviteiten
- Station specifieke vrije dagen

#### Feestdagen Effect

**Belangrijke regel: Feestdagen = Weekend configuratie!**

- Feestdagen gebruiken automatisch zondag instellingen
- Geen extra personeel ingepland
- Telt mee voor weekend shift geschiedenis
- Eerlijke verdeling wordt hiermee rekening gehouden

### 📊 Statistieken Bekijken

#### Statistieken Dashboard

**Statistieken Openen**
- Klik "Statistieken" op dashboard
- Kies periode (maand/kwartaal/jaar)

**Periode Selecteren:**
- **Maand**: Specifieke maand bekijken
- **Kwartaal**: 3 maanden overzicht
- **Jaar**: Volledig jaar overzicht

#### Shift Categorieën

- **Dag Week**: Dagshifts weekdagen (7:00-19:00)
- **Nacht Week**: Nachtshifts weekdagen (19:00-7:00)
- **Dag Weekend**: Dagshifts weekend (7:00-19:00)
- **Nacht Weekend**: Nachtshifts weekend (19:00-7:00)
- **Feestdagen** is gelijk aan weekends

#### Statistiek Kolommen

- **Voorkeuren**: Wat medewerkers hebben opgegeven
- **Werkelijke Shifts**: Wat daadwerkelijk is ingepland
- **Percentage**: Verhouding voorkeuren vs. max uren

**Gebruikelijke Percentages:**

- **200%+**: Zeer hoge beschikbaarheid (groen) → persoon is in orde met beschikbaarheden
- **<200%**: Niet voldoende shifts doorgegeven → Persoon heeft niet voldoende shifts opgegeven
- **>100%**: Veel te weinig shifts doorgegeven → Persoon geeft minder shifts door dan hij shifts wil doen

#### 🔄 Sorteren van Statistieken

**Klikbare Kolom Headers:**

De statistieken tabel ondersteunt sorteren op elke kolom om snel inzicht te krijgen:

- **Klik op een kolom header** om te sorteren op die kolom
- **Klik opnieuw** om de sorteerrichting om te draaien (oplopend ↔ aflopend)
- **Visuele indicator** (▲ ▼) toont welke kolom actief is gesorteerd

**Sorteerbare Kolommen:**

**Medewerker:**
- Alfabetisch sorteren op achternaam en voornaam
- Handig om snel een specifieke medewerker te vinden

**Voorkeuren (alle kolommen sorteerbaar):**
- Dag Week (u), Nacht Week (u), Dag Weekend (u), Nacht Weekend (u)
- Totaal (u) - zie direct wie de meeste/minste voorkeuren heeft opgegeven
- Percentage - identificeer wie te weinig voorkeuren heeft doorgegeven

**Werkelijke Shifts (alle kolommen sorteerbaar):**
- Dag Week (u), Nacht Week (u), Dag Weekend (u), Nacht Weekend (u)
- Zie direct wie de meeste/minste shifts heeft gewerkt

**Praktische Voorbeelden:**

1. **Wie heeft de meeste voorkeuren opgegeven?**
   - Klik op "Totaal (u)" onder Voorkeuren
   - Klik nogmaals voor aflopend (hoogste eerst)

2. **Wie heeft te weinig voorkeuren doorgegeven?**
   - Klik op "Percentage" kolom
   - Medewerkers met laagste percentage staan bovenaan

3. **Weekend shifts verdeling controleren:**
   - Klik op "Dag Weekend (u)" onder Werkelijke Shifts
   - Zie direct wie veel/weinig weekend shifts heeft gedaan

4. **Alfabetisch sorteren:**
   - Klik op "Medewerker" kolom
   - Default sortering: alfabetisch op achternaam

### ⚙️ Weekdag Instellingen

#### Configuratie Openen

**Weekdag Instellingen**
- Klik "Weekdag Instellingen" op dashboard
- Configureer per dag van de week

#### Belangrijke Instellingen

**Per Weekdag Configureren:**

- **Dag Shifts**: Aan/uit en aantal medewerkers
- **Nacht Shifts**: Aan/uit en aantal medewerkers

**Deadline configuratie:**

Hier stel je in hoeveel dagen voor de eerste dag van de maand de deadline is afgelopen

Instelbaar tussen 1 en 60 dagen

**Beschikbaarheids opties:**

- **Eenvoudig systeem**: → PIT diensten/ZW diensten die hier voor kiezen → Enkel volledige dag en nacht shiften
- **Uitgebreid systeem**: → Enkel voor ZW diensten: volledige dagshiften/halve dagshiften + nachtshiften

**Shift Ruilen Inschakelen:**

In de Weekdag Instellingen kunt u de shift ruil functionaliteit inschakelen:

1. Open **Weekdag Instellingen**
2. Zoek de sectie **"Shift Ruilen"**
3. Schakel de toggle in om shift ruilen toe te staan
4. Ambulanciers kunnen nu ruilverzoeken indienen

**Verzoeken Beheren:**

Als admin/supervisor vindt u een nieuwe **"Ruilverzoeken"** knop in het dashboard menu. Hier kunt u:

- Alle openstaande verzoeken bekijken (overname én ruil)
- Het type verzoek zien via badges:
  - **Paars "Ruilen"**: Gebruiker wil shifts uitwisselen
  - **Blauw "Overnemen"**: Collega neemt shift over
- Bij ruilverzoeken: beide shifts zichtbaar in het overzicht
- Verzoeken goedkeuren (shifts worden automatisch gewisseld)
- Verzoeken afwijzen met een optionele reden
- Gefilterd bekijken op status (in behandeling / alle)

**Multi-Station Admins en Supervisors:**

Wanneer u toegang heeft tot meerdere stations, ziet u rechtsboven een **station-selector dropdown**:

1. **Selecteer het station** waarvoor u ruilverzoeken wilt beheren
2. Alleen verzoeken van het geselecteerde station worden getoond
3. Uw selectie wordt **onthouden** zodat u niet steeds opnieuw hoeft te kiezen
4. Bij elk verzoek ziet u ook een **stationbadge** zodat u direct ziet bij welk station het hoort

**Cross-Team Verzoeken:**

Bij ruilverzoeken van medewerkers die bij meerdere stations werken:
- De **stationbadge** toont bij welk station de shift hoort
- Shifts kunnen **alleen geruild worden binnen hetzelfde station**
- U ziet zowel het primaire station als cross-team stations van de betrokken medewerkers

**Bij Goedkeuring van Overname:**
- De shift wordt automatisch overgedragen naar de overnemer
- Beide gebruikers ontvangen een push notificatie (indien ingeschakeld)
- De wijziging is direct zichtbaar in de planning

**Bij Goedkeuring van Ruil:**
- Beide shifts worden automatisch uitgewisseld
- De aanvrager krijgt de shift van de collega, en vice versa
- Beide gebruikers ontvangen een push notificatie (indien ingeschakeld)
- De ruil is direct zichtbaar in de planning

### 📢 Push Meldingen Versturen

**Gerichte communicatie met uw team**

Als admin of supervisor kunt u aangepaste push notificaties versturen naar alle medewerkers van een station. Dit is ideaal voor dringende mededelingen, belangrijke updates of andere berichten die direct aandacht vereisen.

#### Toegang tot Push Meldingen

**Wie kan push meldingen versturen?**
- ✅ **Admins**: Kunnen meldingen versturen naar hun eigen station
- ✅ **Multi-Station Admins**: Kunnen kiezen naar welk station zij de melding versturen
- ✅ **Supervisors**: Kunnen meldingen versturen naar elk station

**Push Meldingen Pagina Openen:**
1. Klik op **"Push Meldingen"** in het dashboard menu (Desktop: hoofdmenu | Mobiel: hamburger menu)
2. U ziet het notificatie verstuurformulier en de verzendgeschiedenis

#### Melding Versturen

**Stap-voor-stap:**

1. **Selecteer Station** (alleen voor multi-station admins/supervisors)
   - Kies het station naar welke u de melding wilt versturen
   - Alle gebruikers van dit station met push notificaties ingeschakeld ontvangen het bericht

2. **Vul de Titel in**
   - Korte, duidelijke titel (max 100 karakters)
   - Dit wordt als koptekst van de notificatie getoond
   - Voorbeeld: "Dringende Planning Wijziging"

3. **Vul het Bericht in**
   - Het volledige bericht dat gebruikers zien
   - Voorbeeld: "Er is een wijziging in de planning van morgen. Controleer uw shifts."

4. **Klik op "Verstuur Notificatie"**
   - De melding wordt direct verstuurd naar alle station-medewerkers
   - U ziet een overzicht van wie de melding heeft ontvangen

#### Verzendgeschiedenis

Na het versturen van een melding verschijnt deze in de **Verzendgeschiedenis** sectie:

| Kolom | Uitleg |
|-------|--------|
| **Datum** | Wanneer de melding is verstuurd |
| **Station** | Naar welk station de melding is verstuurd |
| **Titel** | De titel van de melding |
| **Verzonden door** | Wie de melding heeft verstuurd |
| **Ontvangen** | Aantal gebruikers die de melding succesvol hebben ontvangen |
| **Niet ontvangen** | Aantal gebruikers zonder push notificatie abonnement |

**Details bekijken:**
- Klik op **"Details"** bij een melding om per ontvanger te zien:
  - ✅ **Verzonden**: Melding succesvol afgeleverd
  - ❌ **Geen abonnement**: Gebruiker heeft geen push notificaties ingeschakeld

#### Vereisten voor Ontvangst

Gebruikers ontvangen uw melding alleen als:

1. ✅ Zij push notificaties hebben ingeschakeld in hun Profiel
2. ✅ Zij lid zijn van het geselecteerde station
3. ✅ Zij toestemming hebben gegeven in hun browser/apparaat

**Tip:** Moedig medewerkers aan om push notificaties in te schakelen via Profiel → Push Notificaties sectie.

#### Voorbeelden van Gebruik

| Situatie | Titel | Bericht |
|----------|-------|---------|
| **Spoedmelding** | "Dringende Planning Update" | "De shift van morgen 08:00 is gewijzigd. Controleer uw planning." |
| **Vergadering** | "Teamvergadering" | "Reminder: Morgen om 10:00 teambespreking in de kantine." |
| **Systeem Update** | "Nieuw Systeem Feature" | "Er is nu shift ruilen mogelijk! Bekijk de handleiding voor meer info." |
| **Feestdag** | "Prettige Feestdagen" | "Het team wenst iedereen een fijne kerst!" |

#### Veelgestelde Vragen Push Meldingen Versturen

**V: Kan ik zien wie de melding niet heeft ontvangen?**
A: Ja, in de details ziet u per gebruiker of ze een actief push abonnement hebben.

**V: Worden meldingen bewaard?**
A: Ja, de volledige verzendgeschiedenis is beschikbaar voor audit doeleinden.

**V: Kan ik een melding intrekken?**
A: Nee, eenmaal verstuurd kan een push notificatie niet worden ingetrokken.

**V: Waarom hebben sommige gebruikers "Geen abonnement"?**
A: Deze gebruikers hebben push notificaties niet ingeschakeld in hun Profiel.

### 🔌 Integraties Beheer

**Centraal Overzicht**

Het Ambulance Planning Systeem biedt nu een centraal overzicht van alle externe koppelingen via de **Integraties** pagina. Integraties verbinden het systeem met externe diensten zoals alarmeringssoftware, HR-systemen, en andere tools. Deze koppelingen automatiseren workflows en zorgen ervoor dat data up-to-date blijft tussen verschillende systemen.

#### Toegang tot Integraties

**Wie kan integraties beheren?**
- ✅ **Admins**: Toegang tot integraties voor hun station
- ✅ **Supervisors**: Volledige toegang tot alle integraties van alle stations

**Integraties Pagina Openen:**
1. Klik op "Integraties" in het hoofdmenu van het dashboard
2. U ziet een overzicht van alle beschikbare externe koppelingen

#### Beschikbare Integraties Overzicht

> **Let op:** Sommige integraties zijn alleen zichtbaar voor supervisors. Admins zien alleen de integraties die zij mogen beheren.

| Integratie | Beschrijving | Vereisten | Zichtbaar voor |
|------------|--------------|-----------|----------------|
| 📱 **Verdi Alarm Software** | Synchroniseert shifts naar Verdi alarmeringscentrale | Verdi URL, API credentials, ShiftSheet GUID | Admins & Supervisors |
| 📧 **Reportage Personeelsdienst** | Maandelijkse shift rapportages via e-mail | SMTP server instellingen (host, poort, gebruiker, wachtwoord) | Admins & Supervisors |
| 🔐 **Wachtwoord Reset** | Self-service wachtwoord reset via e-mail | Werkende SMTP configuratie (eerst Reportage instellen) | Alleen Supervisors |
| 🛡️ **Microsoft Entra ID** | Single Sign-On via Azure AD / Microsoft 365 | Azure AD Tenant ID, Client ID, Client Secret | Alleen Supervisors |
| 📋 **Activiteitenlog** | Audit trail van alle systeemgebeurtenissen | Geen | Alleen Supervisors |

#### Status Indicatoren

Elke integratie toont een status badge die aangeeft of de koppeling actief en correct geconfigureerd is:

| Badge | Betekenis |
|-------|-----------|
| 🟢 **Actief / Geconfigureerd** (groen) | De integratie werkt correct |
| 🟠 **Configuratie Nodig** (oranje) | Instellingen moeten nog worden ingevuld |
| ⚪ **Uitgeschakeld** (grijs) | De functie is handmatig uitgeschakeld |
| 🔵 **Binnenkort** (blauw/grijs) | Toekomstige integratie, nog niet beschikbaar |

#### Setup Volgorde

**Belangrijk:** Sommige integraties zijn afhankelijk van andere. Volg deze volgorde voor correcte configuratie:

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  1. SMTP Instellen  │ ──► │  2. Reportage       │ ──► │  3. Wachtwoord      │
│  (via Reportage)    │     │     Configureren    │     │     Reset           │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

**Verdi** is onafhankelijk en kan op elk moment worden geconfigureerd.

#### Voordelen van Integraties

| Voordeel | Uitleg |
|----------|--------|
| ✅ **Automatisering** | Geen handmatig overtypen van data meer tussen systemen |
| ✅ **Up-to-date Informatie** | Data blijft gesynchroniseerd tussen alle gekoppelde systemen |
| ✅ **Tijdsbesparing** | Minder administratief werk voor supervisors en admins |
| ✅ **Foutreductie** | Minder kans op tikfouten bij handmatige invoer |

#### Veelvoorkomende Problemen (Troubleshooting)

**E-mail wordt niet verzonden:**
- ❌ Controleer SMTP instellingen in Reportage (host, poort, gebruiker)
- ❌ Voor Outlook/Microsoft 365: gebruik een **App-wachtwoord** i.p.v. normaal wachtwoord
- ❌ Controleer of poort 587 (TLS) of 465 (SSL) correct is ingesteld
- ❌ Controleer of "Minder veilige apps" is ingeschakeld (indien van toepassing)

**Verdi synchronisatie mislukt:**
- ❌ Controleer of alle gebruiker-mappings correct zijn ingesteld
- ❌ Controleer of de ShiftSheet GUID overeenkomt met Verdi
- ❌ Verifieer de API credentials bij uw Verdi beheerder
- ❌ Controleer of positie-mappings correct zijn geconfigureerd

**Wachtwoord reset toggle is uitgeschakeld:**
- ❌ SMTP moet eerst geconfigureerd zijn via Reportage
- ❌ Alleen supervisors kunnen deze functie beheren

#### Gedetailleerde Integratie Beschrijvingen

📱 **Verdi Alarm Software** (Actief)
- Automatische shift synchronisatie naar Verdi alarmeringscentrale
- Configureer URL, credentials en gebruikersmappings
- Ondersteunt split shifts (dag/nacht)
- Status: Volledig operationeel

📧 **Reportage Personeelsdienst** (Actief)
- Automatische maandelijkse shift rapportages via email
- Excel bestand met overzicht van alle shifts per station
- SMTP configuratie via UI (self-service)
- Export Excel functie als backup
- Configureerbare ontvangers per station
- Status: Volledig operationeel

🔐 **Wachtwoord Reset via E-mail** (Nieuw - v2025.15)
- Gebruikers kunnen zelf hun wachtwoord resetten via e-mail
- Schakelbaar per organisatie door supervisors
- Vereist werkende SMTP configuratie (zie Reportage)
- Reset links zijn 1 uur geldig en eenmalig te gebruiken
- Status: Beschikbaar wanneer ingeschakeld

📧 **E-mail (SMTP) Instellingen** (Nieuw - v2025.20)
- Centrale email server configuratie voor alle email functies
- Aparte pagina onder Integraties voor overzichtelijk beheer
- Test email en verbinding testen functionaliteit
- Ondersteunt Microsoft 365, Gmail, Outlook en andere SMTP servers
- Status: Vereist voor alle email functies (Welkomstmail, Wachtwoord Reset, Reportage)

📧 **Welkomstmail Nieuwe Gebruikers** (v2025.19)
- Automatische e-mail met inloggegevens bij aanmaken nieuwe gebruiker
- Aanpasbare template met placeholders ({voornaam}, {gebruikersnaam}, {wachtwoord}, {loginUrl})
- In-/uitschakelbaar door admins en supervisors
- Testmail functie om template te controleren
- Vereist werkende SMTP configuratie (zie E-mail Instellingen)
- Status: Beschikbaar wanneer ingeschakeld

📋 **Activiteitenlog** (Alleen Supervisors)
- Bekijk alle gebruikersactiviteiten en systeemgebeurtenissen
- Filter op categorie (AUTH, PLANNING, SETTINGS, etc.)
- Handig voor audit en troubleshooting
- Toont IP-adres en browser informatie

🛡️ **Microsoft Entra ID (Azure AD)** (Nieuw - v2025.26)
- Single Sign-On via Microsoft 365 / Azure Active Directory
- Gebruikers kunnen inloggen met hun bedrijfs-Microsoft-account
- Koppelt bestaande gebruikers op basis van e-mailadres (geen automatische accountaanmaak)
- Viewers en gebruikers zonder Microsoft account kunnen nog steeds met gebruikersnaam/wachtwoord inloggen
- Alleen configureerbaar door supervisors
- Status: Beschikbaar wanneer geconfigureerd en ingeschakeld

🔜 **Toekomstige Integraties**
- Ruimte voor HR-systemen
- Andere alarmsoftware
- En meer externe diensten

### 🔐 Wachtwoord Reset via E-mail

**Self-Service Wachtwoord Reset**

Gebruikers kunnen nu zelf hun wachtwoord resetten wanneer ze dit vergeten zijn. Dit vermindert de werkdruk op admins en biedt een snelle oplossing voor gebruikers.

#### Hoe Werkt Het?

**Voor Gebruikers:**

1. Op de inlogpagina staat een "Wachtwoord vergeten?" link (alleen zichtbaar als feature ingeschakeld)
2. Klik op de link en voer uw e-mailadres in
3. U ontvangt een e-mail met een reset link (geldig voor 1 uur)
4. Klik op de link en stel een nieuw wachtwoord in (minimaal 6 karakters)
5. U kunt nu inloggen met uw nieuwe wachtwoord

**Belangrijk:**
- ⏱️ De reset link is **1 uur geldig** na aanvraag
- 📧 Gebruik het e-mailadres dat gekoppeld is aan uw account
- 🔒 Elke link kan maar **één keer** gebruikt worden
- 📁 Controleer ook uw **spam/ongewenste mail** folder

#### Inschakelen/Uitschakelen (Alleen Supervisors)

Deze functie is standaard uitgeschakeld en kan alleen door supervisors worden ingeschakeld.

**Vereisten:**
- ✅ SMTP e-mail moet geconfigureerd zijn (via Reportage > SMTP Instellingen)
- ✅ Alleen supervisors kunnen deze functie beheren

**Inschakelen:**

1. Ga naar **Integraties** in het hoofdmenu
2. Zoek de kaart "Wachtwoord Reset" (indigo/paars gekleurd)
3. Gebruik de **schakelaar** om de functie in of uit te schakelen
4. Bij inschakelen verschijnt de "Wachtwoord vergeten?" link op de inlogpagina

**Let Op:**
- Als SMTP niet geconfigureerd is, is de schakelaar uitgeschakeld
- U ziet dan een waarschuwing: "SMTP moet eerst worden geconfigureerd in Reportage"
- Configureer eerst SMTP voordat u deze functie kunt gebruiken

---

### 📧 Welkomstmail Nieuwe Gebruikers

**Automatische Welkomstmail met Inloggegevens**

Wanneer een admin of supervisor een nieuwe gebruiker aanmaakt, kan het systeem automatisch een welkomstmail versturen met de inloggegevens. Dit bespaart tijd en zorgt ervoor dat nieuwe gebruikers direct aan de slag kunnen.

#### Hoe Werkt Het?

**Automatisch Versturen:**

Wanneer de welkomstmail functie is ingeschakeld:
1. Admin/supervisor maakt een nieuwe gebruiker aan met e-mailadres
2. Het systeem verstuurt automatisch een welkomstmail naar dit adres
3. De mail bevat gebruikersnaam, wachtwoord en inlog-URL
4. De nieuwe gebruiker kan direct inloggen

**Belangrijk:**
- 📧 Alleen gebruikers met e-mailadres ontvangen de welkomstmail
- 🔒 Het initiële wachtwoord staat in de mail - adviseer direct wijzigen
- ⚙️ De mail wordt alleen verzonden als de functie is ingeschakeld

#### Configureren (Admins en Supervisors)

**Toegang:**

1. Ga naar **Integraties** in het hoofdmenu
2. Zoek de kaart "Welkomstmail" (teal/groen gekleurd)

**In-/Uitschakelen:**

1. Gebruik de **schakelaar** om de functie in of uit te schakelen
2. Bij inschakelen worden automatisch welkomstmails verzonden bij nieuwe gebruikers
3. Bij uitschakelen worden geen mails verzonden (handmatig communiceren)

**Template Aanpassen:**

1. Klik op de **"Template"** knop
2. Pas het onderwerp en de berichttekst aan
3. Gebruik **placeholders** voor dynamische gegevens:
   - `{voornaam}` - Voornaam van de nieuwe gebruiker
   - `{gebruikersnaam}` - De gebruikersnaam voor inloggen
   - `{wachtwoord}` - Het initiële wachtwoord
   - `{loginUrl}` - De URL om in te loggen
4. Klik op **"Preview"** om te zien hoe de mail eruitziet
5. Klik op **"Opslaan"** om de wijzigingen op te slaan

**Testmail Versturen:**

1. Klik op de **"Test"** knop
2. Voer een e-mailadres in (bijv. uw eigen adres)
3. Klik op **"Verstuur Testmail"**
4. U ontvangt een testmail met voorbeeldgegevens (Jan, jan.peeters, Welkom123!)
5. Controleer of de mail correct is en pas indien nodig de template aan

**Vereisten:**
- ✅ SMTP e-mail moet geconfigureerd zijn (via Reportage > SMTP Instellingen)
- ✅ Nieuwe gebruiker moet een e-mailadres hebben

**Voorbeeld Template:**

```
Onderwerp: Welkom bij Planning BWZK - Uw account gegevens

Beste {voornaam},

Er is een account voor u aangemaakt in het Planning systeem van Brandweerzone Kempen.

Uw inloggegevens:
Gebruikersnaam: {gebruikersnaam}
Wachtwoord: {wachtwoord}

⚠️ BELANGRIJK: Wijzig uw wachtwoord direct na de eerste keer inloggen!

U kunt inloggen via: {loginUrl}

Met vriendelijke groeten,
Planning BWZK
```

#### Beveiliging

- 🔒 **Token Expiratie**: Reset links verlopen na 1 uur
- 🔐 **Eenmalig Gebruik**: Elke token kan maar één keer gebruikt worden
- 📋 **Activity Logging**: Alle reset aanvragen en succesvolle resets worden gelogd
- 🔍 **Privacy**: Het systeem geeft geen informatie vrij over welke e-mailadressen bestaan

---

### 🛡️ Microsoft Entra ID (Azure AD)

**Single Sign-On via Microsoft 365**

Gebruikers kunnen nu inloggen met hun bedrijfs-Microsoft-account. Dit maakt inloggen eenvoudiger en veiliger - gebruikers hoeven geen apart wachtwoord te onthouden voor het planningsysteem.

#### Hoe Werkt Het?

**Voor Gebruikers:**

1. Op de inlogpagina verschijnt een "Inloggen met Microsoft" knop (alleen zichtbaar als feature ingeschakeld)
2. Klik op de knop en log in met uw Microsoft account (bijv. naam@bwzk.be)
3. Na succesvolle Microsoft login wordt u automatisch ingelogd in het planningssysteem
4. U kunt direct aan de slag!

**Belangrijk:**
- 📧 Uw Microsoft e-mailadres moet overeenkomen met uw e-mailadres in het planningsysteem
- 👤 U moet **eerst** een account hebben in het planningsysteem - er worden geen nieuwe accounts aangemaakt
- 🔐 Viewers en gebruikers zonder Microsoft account kunnen nog steeds met gebruikersnaam/wachtwoord inloggen

#### Configureren (Alleen Supervisors)

**Vereisten voor IT-beheerders:**

Om Azure AD te configureren heeft u het volgende nodig van uw Azure Portal:
- ✅ Directory (tenant) ID
- ✅ Application (client) ID
- ✅ Client Secret

**Stappen in Azure Portal:**

1. Ga naar **Azure Portal** > **Microsoft Entra ID** > **App registrations**
2. Klik **New registration**
3. Geef de app een naam (bijv. "Ambulance Planning BWZK")
4. Kies "Single tenant" of "Multitenant" (afhankelijk van uw organisatie)
5. Voeg een **Redirect URI** toe: `https://[uw-domein]/api/azure-ad/callback`
6. Na aanmaken: kopieer de **Application (client) ID** en **Directory (tenant) ID**
7. Ga naar **Certificates & secrets** > **New client secret**
8. Kopieer de secret value (deze wordt maar één keer getoond!)

**Configureren in Planningsysteem:**

1. Ga naar **Integraties** in het hoofdmenu
2. Klik op de "Microsoft Entra ID" kaart
3. Klik op **"Configureren"**
4. Vul de Directory (tenant) ID, Application (client) ID en Client Secret in
5. Schakel **"Microsoft Login Inschakelen"** aan
6. Klik op **"Configuratie Opslaan"**

#### Beveiliging

- 🔐 **OAuth 2.0**: Industriestandaard beveiligingsprotocol
- 🔒 **Encrypted Storage**: Client secrets worden versleuteld opgeslagen
- 📋 **Activity Logging**: Alle Azure AD logins worden gelogd
- 👤 **Geen Auto-Create**: Alleen bestaande gebruikers kunnen inloggen

#### Veelgestelde Vragen

**V: Kan ik nog steeds met gebruikersnaam/wachtwoord inloggen?**
A: Ja, de normale login blijft altijd beschikbaar. Microsoft login is een extra optie.

**V: Wat als mijn Microsoft e-mail niet overeenkomt met mijn account?**
A: U ziet een foutmelding. Vraag uw beheerder om uw e-mailadres aan te passen in het systeem.

**V: Werkt dit ook voor viewer accounts?**
A: Viewer accounts zijn bedoeld voor kiosk/display schermen en loggen meestal in met gebruikersnaam/wachtwoord.

**V: Kan ik gebruikers automatisch laten aanmaken?**
A: Nee, voor veiligheidsredenen moeten gebruikers eerst handmatig worden aangemaakt. Dit voorkomt onbedoelde toegang.

---

#### Over Integraties

Integraties verbinden het Ambulance Planning Systeem met externe diensten zoals alarmeringssoftware, HR-systemen, en andere tools. Deze koppelingen automatiseren workflows en zorgen ervoor dat data up-to-date blijft tussen verschillende systemen.

**Beschikbare Koppelingen:**

📱 **Verdi**: Synchroniseert ingeplande shifts automatisch naar de Verdi alarmeringscentrale, zodat de juiste medewerkers bereikbaar zijn tijdens noodsituaties.

📧 **Reportage**: Automatische maandelijkse shift rapportages via email met Excel overzichten voor de personeelsdienst.

**Voordelen van Integraties:**

- ✅ **Automatisering**: Geen handmatig overtypen van data
- ✅ **Up-to-date informatie**: Data blijft gesynchroniseerd tussen systemen
- ✅ **Tijdsbesparing**: Minder administratief werk
- ✅ **Foutreductie**: Minder kans op tikfouten bij handmatige invoer

**Toekomstige Uitbreidingen:**
- Ruimte voor extra koppelingen met HR-systemen, andere alarmsoftware, en meer

### 🔗 Verdi Integratie

**Volledig Operationeel**

Het Ambulance Planning Systeem kan nu automatisch shifts synchroniseren met Verdi alarmsoftware. Hierdoor hoeft u shifts niet meer handmatig over te typen - één druk op de knop synchroniseert alles!

#### 📋 Wat is Verdi Integratie?

**Verdi** is een gespecialiseerde alarmsoftware voor hulpdiensten. Deze integratie zorgt ervoor dat:

- **Automatische Synchronisatie**: Shifts worden direct vanuit planning naar Verdi gestuurd
- **On-Demand**: U beslist wanneer u synchroniseert (geen automatische sync)
- **Per Station**: Elke post heeft eigen Verdi configuratie en credentials
- **Veilig**: Alle communicatie verloopt beveiligd via geauthenticeerde API

**Test Omgeving:**
- 🧪 **Staging URL**: `https://kempen-staging.verdi.cloud` (gratis voor testen)
- 💰 **Productie**: Implementatie kost €1.380 excl. BTW (eenmalig)

**Status:**
- ✅ Backend systeem volledig werkend
- ✅ Admin interface beschikbaar voor configuratie
- ✅ Veilige opslag van credentials in database

#### 🔧 Verdi Configuratie

**Toegang:**
- ✅ **Admins**: Kunnen hun eigen station configureren
- ✅ **Supervisors**: Kunnen alle stations configureren

**Configuratiepagina Openen:**
1. Klik op "Integraties" in het hoofdmenu
2. Klik op de "Verdi Alarm Software" kaart
3. U ziet drie tabbladen: Configuratie, Gebruiker Mappings, Positie Mappings

**Tab 1: Station Configuratie**

Vul de volgende velden in voor uw station:

1. **Verdi URL**: Het webadres van uw Verdi server
   - Voorbeeld staging: `https://kempen-staging.verdi.cloud`
   - Voorbeeld productie: `https://verdi.brandweerzonekempen.be`

2. **Verdi API Auth ID**: Gebruikersnaam voor API authenticatie
   - Verkrijgbaar via uw Verdi beheerder
   - Voorbeeld formaat: `HVZ_Kempen-integration-planning-tool-[guid]-communications`

3. **Verdi API Auth Secret**: Wachtwoord voor API authenticatie
   - Wordt beveiligd opgeslagen in database (niet zichtbaar na opslaan)
   - Verkrijgbaar via uw Verdi beheerder

4. **ShiftSheet GUID**: Unieke identificatie voor uw planning spreadsheet
   - Elke post heeft eigen GUID
   - Verkrijgbaar via Verdi export

5. **Verdi synchronisatie ingeschakeld**: Schakelaar om sync aan/uit te zetten

6. **Nood PersonGUID 1 (Chauffeur)**: PersonGUID voor noodinplanning positie 1
   - Wordt gebruikt wanneer een medewerker van een ander station via noodinplanning wordt ingepland
   - Omdat die persoon niet in Verdi van dit station is geregistreerd, wordt een "nood" persoon gebruikt
   - Optioneel - alleen nodig als u noodinplanning gebruikt

7. **Nood PersonGUID 2 (Ambulancier)**: PersonGUID voor noodinplanning positie 2
   - Zelfde als Nood PersonGUID 1, maar voor de tweede positie (ambulancier)
   - Optioneel - alleen nodig als u noodinplanning met 2 personen van andere stations gebruikt

**💾 Opslaan:**
- Klik op "Configuratie Opslaan" onderaan
- Credentials worden veilig opgeslagen per station

#### 👤 Tab 2: Gebruiker Mappings (Person GUID Koppeling)

**Waarom Nodig?**

Verdi identificeert personen via een uniek "Person GUID". Voor automatische synchronisatie moet elk teamlid worden gekoppeld:

```
Planning Gebruiker ←→ Verdi Person GUID
```

**Toegang:**
- ✅ **Admins**: Zien alleen hun station users (inclusief cross-station users)
- ✅ **Supervisors**: Zien alle 119 users van alle stations

**Cross-Station Gebruikers:**
- Person GUID is **globaal** (geldt voor alle stations)
- Werkt u bij meerdere stations? U heeft **1 Person GUID** voor alle posts
- Eénmaal ingevoerd, automatisch beschikbaar voor alle stations

**Hoe Gebruiken:**

1. **Ga naar tab "Gebruiker Mappings"**
2. **🔍 Zoekfunctie gebruiken** (optioneel):
   - Bovenaan de tabel ziet u een zoekbalk
   - Type een naam of gebruikersnaam om de lijst te filteren
   - Zoekt op: gebruikersnaam, voornaam, achternaam en volledige naam
   - Handig bij grote teams om snel een specifieke gebruiker te vinden
3. **Zie lijst van teamleden** met kolommen:
   - Gebruikersnaam
   - Naam
   - Person GUID (invoerveld)
4. **Vul Person GUID in** voor elke gebruiker
   - Verkrijgbaar via Verdi export
   - Formaat: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
5. **Klik "Opslaan"** naast elke gebruiker

**📥 Excel Import Functie **

Voor snelle bulk import van Person GUIDs:

1. **Exporteer vanuit Verdi**:
   - Ga in Verdi naar ShiftPlanning → Person overzicht
   - Exporteer naar Excel (bevat kolommen: FirstName, Naam, PersonGuid, Post)
   
2. **Klik "Import uit Excel"** knop (rechtsboven in Gebruiker Mappings tab)

3. **Selecteer uw Verdi export bestand**
   - Systeem matcht automatisch op voor- en achternaam
   - **Accent-insensitive**: José = Jose, Müller = Muller
   - **Case-insensitive**: JANSEN = Jansen = jansen

4. **Preview scherm controle**:
   - ✅ **Geslaagde matches**: Groen, automatisch geselecteerd voor import
   - ⚠️ **Bestaande mappings**: Oranje achtergrond met "Was: [oude GUID]" waarschuwing
   - ❌ **Niet gevonden in systeem**: Personen uit Excel die geen account hebben
   - ℹ️ **Geen match**: Gebruikers zonder Excel entry (worden niet gewijzigd)

5. **Selecteer welke te importeren**:
   - Vink aan/uit om specifieke mappings te (de)selecteren
   - Bij overwrites ziet u de oude GUID → nieuwe GUID wijziging

6. **Klik "Importeer X mappings"** om te bevestigen

**💡 Tips:**
- Gebruik Excel import voor snelle bulk configuratie (alle GUIDs in 1 keer)
- Bij kleine wijzigingen: gebruik de zoekbalk + handmatige invoer
- Overwrites worden duidelijk getoond - controleer altijd het preview scherm

#### 🚁 Tab 3: Positie Mappings (Position GUID Koppeling)

**Waarom Nodig?**

Elke positie in de ambulance (chauffeur, verzorger) moet gekoppeld worden aan een Verdi Position GUID:

| Planning Positie | Verdi Functie | Typisch Gebruik |
|-----------------|---------------|-----------------|
| Positie 1       | Chauffeur     | Altijd gebruikt bij 1+ personen |
| Positie 2       | Ambulancier   | Gebruikt bij 2 personen |

**Toegang:**
- ✅ **Admins**: Kunnen hun eigen station configureren
- ✅ **Supervisors**: Kunnen alle stations configureren

**Station-Specifiek:**
- Position GUIDs zijn **per station** verschillend
- Elke post heeft eigen positie mappings
- Configureer voor uw station

**Hoe Gebruiken:**

1. **Ga naar tab "Positie Mappings"**
2. **Configureer minimaal de volgende posities**:
   - **Positie 1 (Chauffeur)**: Verplicht - wordt gebruikt voor alle shifts met 1 of 2 personen
   - **Positie 2 (Ambulancier)**: Optioneel - alleen nodig als u shifts met 2 personen heeft
3. **Vul Position GUID in** voor elke positie
   - Verkrijgbaar via Verdi ShiftSheet export
   - Formaat: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
4. **Stel "Rijbewijs C vereist" in** voor posities die een C-rijbewijs nodig hebben
5. **Klik "Opslaan"**

**💡 Intelligente Positie Toewijzing:**

Het systeem werkt flexibel met variabel aantal personen per shift:

- **Shifts met 1 persoon**: Gebruikt alleen Positie 1 (Chauffeur)
- **Shifts met 2 personen**: Gebruikt Positie 1 (Chauffeur) + Positie 2 (Ambulancier)
- **Shifts met 0 personen**: Worden automatisch overgeslagen (niet naar Verdi gestuurd)

**Voorbeeld:**
- PIT stations (altijd 1 persoon): Configureer alleen Positie 1
- Ambulance stations (1 of 2 personen): Configureer Positie 1 én Positie 2

#### 📤 Shifts Synchroniseren

**Let Op:** Configureer eerst alle drie de tabs (Configuratie, Gebruiker Mappings, Positie Mappings) voordat u shifts synchroniseert!

**Synchronisatie Proces:**

**Stap 1: Planning Voltooien**
- Genereer automatische planning of wijs shifts handmatig toe
- Controleer of alle shifts correct zijn ingevuld

**Stap 2: Verdi Sync Starten**
- Open "Planning Genereren" pagina
- Selecteer de juiste maand en station
- Klik op "Sync naar Verdi" knop (alleen zichtbaar voor admins en supervisors)

**💡 Visuele Status Indicator **

De "Sync naar Verdi" knop toont automatisch de synchronisatiestatus met kleurcodering:

- **🔴 RODE knop**: Er zijn wijzigingen die nog niet gesynchroniseerd zijn
  - Toont aantal nieuwe + gewijzigde shifts: "Sync naar Verdi (5)"
  - Tooltip: "3 nieuwe en 2 gewijzigde shifts - klik om te syncen"
  - **Actie vereist**: Klik om te synchroniseren

- **🟢 GROENE knop**: Alles is gesynchroniseerd
  - Tooltip: "Alles gesynchroniseerd - geen wijzigingen"
  - **Geen actie nodig**: Planning is up-to-date in Verdi

De status wordt automatisch elke 30 seconden ververst, zodat u altijd de meest actuele status ziet!

**Stap 3: Sync Opties Kiezen**

U ziet een bevestigingsvenster met twee opties:

1. **"Alle shifts"**: 
   - Synchroniseert alle shifts van de geselecteerde maand
   - Gebruik dit voor een eerste sync of bij grote wijzigingen

2. **"Alleen wijzigingen"**:
   - Synchroniseert alleen nieuwe of aangepaste shifts
   - Sneller voor kleine updates

**Info in bevestigingsvenster:**
- Aantal shifts dat gesynchroniseerd wordt
- Laatste sync tijdstempel (indien beschikbaar)

**Stap 4: Status Monitoring**

Na synchronisatie ziet u naast elke shift een status badge:

- 🟢 **Groen (Verdi sync OK)**: Succesvol gesynchroniseerd
- 🟡 **Geel (Verdi sync pending)**: Synchronisatie wordt uitgevoerd
- 🔴 **Rood (Verdi sync fout)**: Synchronisatie mislukt (hover voor foutmelding)

**Verdi Feedback:**

Na synchronisatie ontvangt u feedback:
- ✅ **Success**: Aantal succesvol gesynchroniseerde shifts
- ⚠️ **Warnings**: Waarschuwingen van Verdi (bijv. dubbele entries)
- ❌ **Errors**: Fouten met gedetailleerde beschrijving

**Laatste Sync Tijdstempel:**
- Zichtbaar in het sync dialoog
- Toont datum en tijd van laatste succesvolle sync

#### 🔒 Veiligheid & Toegang

**Wie Heeft Toegang?**
- ✅ **Admins**: Volledige toegang tot alle Verdi functionaliteit
- ✅ **Supervisors**: Volledige toegang tot alle Verdi functionaliteit
- ❌ **Ambulanciers**: Geen toegang tot Verdi functionaliteit

**Beveiliging:**
- Alle Verdi communicatie verloopt via geauthenticeerde API
- Auth credentials worden veilig opgeslagen in systeem
- Alleen geautoriseerde gebruikers kunnen synchroniseren

#### 📊 Sync Logging & Geschiedenis

**Volledige Traceerbaarheid:**

Het systeem houdt bij:
- Wanneer elke shift werd gesynchroniseerd
- Wie de synchronisatie startte
- Welke shifts succesvol/gefaald zijn
- Eventuele foutmeldingen van Verdi

**Gebruik Cases:**

1. **Controle**: Welke shifts zijn al gestuurd?
2. **Troubleshooting**: Waarom faalde een sync?
3. **Audit Trail**: Volledige geschiedenis van wijzigingen

#### ❓ Veelgestelde Vragen Verdi

**Q: Moet ik nog handmatig shifts invoeren in Verdi?**
A: Nee! Na configuratie synchroniseert het systeem automatisch. U drukt alleen op de sync knop.

**Q: Wat gebeurt er als ik een shift aanpas na synchronisatie?**
A: Gebruik "Alleen Wijzigingen" sync optie - het systeem detecteert automatisch of een shift moet worden aangemaakt (CREATE) of bijgewerkt (UPDATE) in Verdi. Gewijzigde shifts krijgen status "pending" en worden bij de volgende sync automatisch bijgewerkt.

**Q: Hoe werkt de automatische UPDATE detectie?**
A: Het systeem is intelligent:
- **Eerste keer**: Shift wordt aangemaakt in Verdi (CREATE operatie)
- **Wijziging**: Als u een shift aanpast, wordt de status "pending"
- **Volgende sync**: Systeem detecteert bestaande Verdi GUID en stuurt UPDATE i.p.v. CREATE
- **Voordeel**: Geen dubbele shifts of conflicten in Verdi!

**Q: Wat betekent de "pending" status?**
A: Een shift met status "pending" (geel) betekent:
- De shift is gewijzigd sinds laatste sync
- Bij volgende sync wordt dit een UPDATE operatie
- De Verdi GUID blijft behouden (geen nieuwe shift)
- Na succesvolle sync wordt status weer "success" (groen)

**Q: Kan ik zien welke shifts al in Verdi staan?**
A: Ja, de sync status indicator toont dit per shift (groen = gesynchroniseerd).

**Q: Werkt dit voor alle stations tegelijk?**
A: Nee, u synchroniseert per station. Elk station heeft eigen Verdi configuratie.

**Q: Wat als een sync faalt?**
A: Het systeem toont de foutmelding. U kunt de sync opnieuw proberen of contact opnemen met uw Verdi beheerder.

**Q: Worden shifts automatisch gesynchroniseerd?**
A: Nee, synchronisatie gebeurt alleen on-demand via de sync knop. U behoudt volledige controle.

**Q: Kan ik een sync ongedaan maken?**
A: Synchronisatie is eenrichtingsverkeer (planning → Verdi). Voor verwijdering moet u Verdi zelf gebruiken.

**Q: Wat gebeurt er als ik een shift verwijder die al naar Verdi is gestuurd?**
A: Volgens de Verdi API specificaties kunnen shifts NIET volledig worden verwijderd uit Verdi. In plaats daarvan:
- Wanneer u een shift verwijdert in het planningssysteem, worden **alle personen uit de shift verwijderd** in Verdi (alle posities krijgen `person: null`)
- De shift zelf blijft **leeg** in Verdi staan (als placeholder zonder toegewezen personen)
- Dit is officieel Verdi gedrag - de DELETE API wordt niet ondersteund
- **Voordeel**: Geen data verlies in Verdi, volledige audit trail behouden
- **Let op**: Lege shifts blijven zichtbaar in Verdi en moeten handmatig worden opgeschoond indien gewenst

**Q: Hoe werk ik shifts bij die al in Verdi staan?**
A: Wijzig gewoon de shift in het planningssysteem en klik op "Sync naar Verdi" → "Alleen wijzigingen". Het systeem detecteert automatisch dat de shift al bestaat en stuurt een UPDATE in plaats van een nieuwe shift aan te maken.

#### 🚀 Aan de Slag Met Verdi

**Checklist Voor Eerste Gebruik:**

1. ✅ Verdi Auth Secret ontvangen van leverancier
2. ✅ ShiftSheet GUID per station vastleggen
3. ✅ Verdi URL configureren per station
4. ✅ Person GUIDs importeren (CSV of handmatig)
5. ✅ Position GUIDs koppelen per station
6. ✅ Test synchronisatie met kleine maand
7. ✅ Controleer resultaat in Verdi
8. ✅ Bij succes: gebruik voor alle maanden

**Hulp Nodig?**
- Contact Verdi beheerder voor GUIDs en credentials
- Contact systeembeheerder voor technische problemen
- Check sync logs voor foutmeldingen

---

### 📧 Reportage Personeelsdienst

**Volledig Operationeel**

Het Ambulance Planning Systeem kan automatisch maandelijkse shift rapportages versturen via email. Dit bespaart tijd en zorgt dat de personeelsdienst altijd actuele gegevens ontvangt.

#### 📋 Wat is Reportage Personeelsdienst?

**Reportage Personeelsdienst** is een geautomatiseerd rapportagesysteem dat:

- **Automatische Verzending**: Maandelijkse rapporten worden automatisch verstuurd na afloop van de maand
- **Excel Bijlage**: Volledig overzicht van alle shifts per station in Excel formaat
- **Meerdere Ontvangers**: Configureer meerdere email adressen voor verschillende afdelingen
- **Handmatige Verzending**: Verstuur rapporten op elk moment voor elke maand
- **Export Backup**: Download Excel direct als backup wanneer email niet werkt

#### 🔧 Reportage Configuratie

**Toegang:**
- ✅ **Admins**: Kunnen rapportage beheren voor hun station
- ✅ **Supervisors**: Volledige toegang tot alle rapportage instellingen

**Reportage Pagina Openen:**
1. Klik op "Integraties" in het hoofdmenu
2. Klik op de "Reportage Personeelsdienst" kaart
3. U ziet vier tabbladen: SMTP Instellingen, Rapportage, Ontvangers, Verzendlog

#### ⚙️ Tab 1: SMTP Instellingen

**Self-Service Configuratie**

U kunt nu zelf de email server configureren via de webinterface, zonder hulp van IT.

**SMTP Configuratie:**

1. **SMTP Server**: Het adres van uw mailserver
   - Office 365: `smtp.office365.com`
   - Gmail: `smtp.gmail.com`
   - Eigen server: vraag uw IT afdeling

2. **SMTP Poort**: De poort voor de verbinding
   - Standaard TLS: `587` (aanbevolen)
   - SSL: `465`
   - Onbeveiligd: `25` (niet aanbevolen)

3. **Gebruikersnaam**: Meestal uw volledige email adres

4. **Wachtwoord**: Het wachtwoord voor de email account
   - Wordt versleuteld opgeslagen in de database
   - Na opslaan niet meer zichtbaar (toont "(opgeslagen)")

5. **Afzender Email**: Het email adres dat als afzender wordt getoond
   - Moet vaak overeenkomen met de gebruikersnaam

6. **Afzender Naam**: De naam die bij de afzender wordt getoond
   - Bijvoorbeeld: "Planning BWZK"

7. **Beveiligde Verbinding (TLS)**: Schakel in voor versleutelde verbinding
   - Aanbevolen voor Office 365 en Gmail

**Verbinding Testen:**
- Klik "Test Verbinding" om te controleren of de instellingen correct zijn
- Bij succes: groene melding "Verbinding succesvol"
- Bij fout: rode melding met uitleg wat er mis is

**Test Email Versturen:**
- Vul een email adres in
- Klik "Verstuur Test Email"
- Controleer of de test email aankomt

#### 📊 Tab 2: Rapportage

**Instellingen:**

1. **Rapportage inschakelen**: Schakelaar om automatische verzending aan/uit te zetten

2. **Verzenddag**: Hoeveel dagen na het einde van de maand wordt de rapportage verstuurd
   - Standaard: Dag 5 van de volgende maand
   - Instelbaar van 1 tot 28 dagen

3. **Email Onderwerp**: Pas het onderwerp van de email aan
   - Gebruik `{maand}` en `{jaar}` als placeholders
   - Voorbeeld: "Shift Rapportage - {maand} {jaar}"

4. **Email Inhoud**: Pas de tekst van de email aan
   - Gebruik dezelfde placeholders

**Handmatig Versturen en Export:**

1. Selecteer maand en jaar
2. Klik "Verstuur Rapportage" om direct te verzenden via email
3. Klik "Export Excel" om het bestand direct te downloaden (backup optie)

**Export Excel - Backup Functie:**

Als backup wanneer email niet beschikbaar is, kunt u het Excel rapport direct downloaden:
- Selecteer de gewenste maand en jaar
- Klik op "Export Excel"
- Het bestand wordt automatisch gedownload
- Bestandsnaam: `Shift_Rapportage_[Maand]_[Jaar].xlsx`

**Excel Inhoud:**
- **Samenvatting Tab**: Overzicht van alle stations met totalen
- **Per Station Tab**: Gedetailleerde lijst van alle shifts (datum, medewerker, type, tijden, status)

#### 👥 Tab 3: Ontvangers

**Ontvangers Beheren:**

1. **Toevoegen**: Klik "Ontvanger Toevoegen"
   - Vul email adres in
   - Optioneel: voeg naam toe
   - Klik "Toevoegen"

2. **Actief/Inactief**: Gebruik de schakelaar om ontvangers tijdelijk uit te schakelen zonder te verwijderen

3. **Verwijderen**: Klik op het prullenbak icoon om een ontvanger permanent te verwijderen

#### 📜 Tab 4: Verzendlog

**Logs Bekijken:**
- Overzicht van alle verstuurde rapportages
- Datum en tijd van verzending
- Status: Succesvol of Mislukt
- Aantal ontvangers
- Eventuele foutmeldingen

#### ❓ Veelgestelde Vragen Reportage

**Q: De email wordt niet verstuurd, wat nu?**
A: Controleer de SMTP instellingen en test de verbinding. Gebruik "Export Excel" als tijdelijke oplossing.

**Q: Kan ik rapporten voor oudere maanden versturen?**
A: Ja, selecteer de gewenste maand en jaar bij "Handmatig Versturen" en klik "Verstuur Rapportage".

**Q: Wie ontvangt de automatische rapportages?**
A: Alle ontvangers die als "Actief" staan in het Ontvangers tabblad.

**Q: Hoe vaak worden automatische rapportages verstuurd?**
A: Eenmaal per maand, op de ingestelde dag na het einde van de maand.

**Q: Kan ik het Excel formaat aanpassen?**
A: Nee, het formaat is standaard. Het bevat alle relevante shift informatie per station.

---

### 📋 Activiteitenlog

De Activiteitenlog biedt een uitgebreid overzicht van alle belangrijke acties in het systeem. Dit is essentieel voor security monitoring en het traceren van wijzigingen.

#### 📋 Wat wordt gelogd?

**Categorieën:**
| Categorie | Beschrijving | Badge Kleur |
|-----------|--------------|-------------|
| **LOGIN** | Succesvolle en mislukte inlogpogingen | Groen |
| **LOGOUT** | Wanneer gebruikers uitloggen | Grijs |
| **PREFERENCE** | Wijzigingen in beschikbaarheidsvoorkeuren | Blauw |
| **SCHEDULE** | Planning generatie en wijzigingen | Oranje |
| **USER_MANAGEMENT** | Aanmaken, wijzigen en verwijderen van gebruikers | Paars |
| **OVERTIME** | Registratie van overuren | Geel |
| **SHIFT_SWAP** | Shift ruil- en overnameverzoeken (aanvragen, goedkeuringen, afwijzingen, annuleringen) | Paars |
| **SHIFT_MANUAL** | Handmatige shift wijzigingen (aanmaken, wijzigen, verwijderen, splitsen, samenvoegen) | Blauw |
| **SHIFT_BID** | Shift biedingen (ingediend, geaccepteerd, afgewezen, ingetrokken) | Oranje |
| **SETTINGS** | Systeeminstellingen wijzigingen (station instellingen, voorkeuren wissen, integratie configuratie) | Grijs |
| **PUSH_NOTIFICATIONS** | Push notificatie voorkeuren en abonnementen | Turquoise |
| **EXPORT** | Excel exports (planning, reportage, logs, beschikbaarheden) | Blauw |
| **CALENDAR** | Kalender synchronisatie (token vernieuwing) | Teal |
| **REPORTAGE** | Rapportage gerelateerde acties | Oranje |

**Integratie Logging (Nieuw in 2025.17):**

Alle wijzigingen aan integratie-instellingen worden nu gelogd in de SETTINGS categorie:

| Integratie | Wat wordt gelogd |
|------------|------------------|
| **Verdi** | Configuratie wijzigingen (URL, credentials, in-/uitschakelen), gebruikers-mapping wijzigingen |
| **Reportage** | SMTP configuratie, reportage instellingen, ontvangers (toevoegen, wijzigen, verwijderen) |

Dit zorgt voor volledige traceerbaarheid van alle integratie-aanpassingen.

**SHIFT_MANUAL Details (uitgebreide audit trail):**
Elke handmatige shift wijziging wordt gelogd met volledige details:

| Actie | Beschrijving | Details in Log |
|-------|--------------|----------------|
| **CREATED** | Shift aangemaakt | Shift type, datum, gebruiker, station |
| **UPDATED** | Shift gewijzigd | Oude vs nieuwe waarden (toewijzing, datum, station, shift type) |
| **DELETED** | Shift verwijderd | Welke shift werd verwijderd |
| **MONTH_DELETED** | Maand shifts verwijderd | Aantal verwijderde shifts per station |
| **SPLIT** | Shift gesplitst | Originele shift naar twee delen gesplitst |
| **MERGED** | Shifts samengevoegd | Gesplitste shifts terug naar volledige shift |
| **FORCE_OVERRIDE** | Force optie gebruikt | Wanneer admin/supervisor validatieregels omzeilt |

**Details per Log Entry:**
- Datum en tijdstip
- Gebruiker die de actie uitvoerde
- Type actie (bijv. "Succesvol ingelogd", "Shift toegewezen")
- Beschrijving met details (inclusief oude vs nieuwe waarden bij wijzigingen)
- IP-adres van de gebruiker
- User-agent (browser informatie)
- Station van de gebruiker
- Betrokken gebruiker (bij acties op anderen)

#### 🔧 Activiteitenlog Gebruiken

**Toegang:**
- Navigeer naar Dashboard → Menu → Activiteitenlog
- Of direct via `/activity-logs` in de URL

**Filters:**
1. **Datumbereik** - Van/tot datum selecteren
2. **Categorie** - Filter op type actie (alle, LOGIN, PREFERENCE, etc.)
3. **Gebruiker** - Zoek naar specifieke gebruiker
4. **Station** - Filter op station (alleen supervisors)

**Excel Export:**
- Klik "Export naar Excel" om gefilterde logs te downloaden
- Bestandsnaam: `activiteitenlog_[van-datum]_[tot-datum].xlsx`

#### 👥 Toegangsrechten

**⚠️ Let op:** De Activiteitenlog is **alleen beschikbaar voor supervisors**.

**Supervisors:**
- Zien activiteiten van alle stations
- Kunnen filteren op station, gebruiker, categorie en datumbereik
- Volledige export mogelijkheden naar Excel

#### ❓ Veelgestelde Vragen Activiteitenlog

**Q: Hoe lang worden logs bewaard?**
A: Logs worden permanent opgeslagen voor volledige audittrail.

**Q: Kan ik zien wie mijn wachtwoord heeft gewijzigd?**
A: Ja, zoek op USER_MANAGEMENT categorie en filter op uw gebruikersnaam.

**Q: Worden mislukte inlogpogingen ook gelogd?**
A: De rate limiter houdt mislukte pogingen bij. Succesvolle logins worden gelogd in de activiteitenlog.

**Q: Kan ik logs verwijderen?**
A: Nee, logs kunnen niet worden verwijderd om de integriteit van de audittrail te waarborgen.

---

## 👑 Handleiding voor Supervisors

**Supervisors hebben alle Admin rechten PLUS cross-station functionaliteit**

### 👤 Supervisor Gebruikersbeheer

#### Supervisors Bewerken

Supervisors hebben nu volledige toegang om **andere supervisors** te bewerken:

**Wat is gewijzigd:**
- Supervisors kunnen nu gebruikers op het **Supervisor Station (station 8)** bewerken
- Dit maakt het mogelijk om uren, rollen en andere gegevens van mede-supervisors aan te passen
- Reguliere admins hebben nog steeds alleen toegang tot hun eigen station

**Praktisch voorbeeld:**
- Joris Boeckx (supervisor) heeft 0 uur nodig in het systeem voor statistieken
- Een andere supervisor kan nu zijn uren aanpassen zonder 403 foutmelding

### 🏢 Multi-Station Overzicht

#### Station Wisselen

**Station Selector**
- Rechtsboven in interface
- Dropdown met alle stations
- Wijzigt complete context

**Dashboard per Station:**
- Elk station heeft eigen planning
- Eigen gebruikers en instellingen
- Onafhankelijke statistieken

### 🔄 Cross-Team Beheer

#### Cross-Team Tab

**Gebruikersbeheer Openen**
- Ga naar Gebruikersbeheer
- Selecteer "Cross-team Beheer" tab

**Functionaliteit:**
- Medewerkers aan meerdere stations koppelen
- Uur limieten instellen per station (inclusief 0 uur voor statistieken)
- Flexibele inzet over posten heen
- **Automatische UI updates**: Wijzigingen worden direct zichtbaar zonder pagina vernieuwen

#### Gebruiker Koppelen aan Station

**Gebruiker Selecteren:**
- Zoek medewerker in alle stations
- Klik op gewenste persoon

**Station Toewijzing:**
- Selecteer extra station
- Stel uur limiet in (bijv. 24 uur/maand, of 0 uur voor supervisors die geen shifts werken)
- Klik "Koppelen"

**Nul Uren Toewijzing:**
- Het is nu mogelijk om **0 uur** in te stellen voor een station toewijzing
- Dit is handig voor supervisors die wel systeemtoegang nodig hebben maar geen shifts draaien
- Zorgt voor nauwkeurigere statistieken

**Beheer Toewijzingen:**
- Bekijk alle station toewijzingen van een gebruiker
- Wijzig uur limieten door het getal aan te passen
- Verwijder cross-team toewijzingen met de **X knop** (zie hieronder)

#### Cross-Team Toewijzing Verwijderen

**Stap-voor-stap:**

1. **Open Gebruikersbeheer**
   - Ga naar "Gebruikersbeheer"
   - Selecteer tab "Cross-team Beheer"

2. **Selecteer Gebruiker**
   - Zoek en klik op de medewerker
   - Bekijk "Huidige Toewijzingen"

3. **Verwijder Toewijzing**
   - Naast elke cross-team toewijzing staat een **X knop**
   - Klik op de X naast het station dat je wilt verwijderen
   - Bevestig de verwijdering in het dialoogvenster

**Belangrijk:**
- ❌ Het **primaire station** van een gebruiker kan NIET verwijderd worden (geen X knop)
- ✅ Alleen **cross-team** toewijzingen kunnen verwijderd worden
- 🔒 Alleen supervisors kunnen toewijzingen verwijderen

**Voorbeeld:**
- Jan Cools heeft primair station "ZW Geel" en cross-team "PIT Geel"
- Je ziet een X knop naast "PIT Geel" (cross-team) maar NIET naast "ZW Geel" (primair)
- Klik X → Bevestig → PIT Geel toewijzing is verwijderd

#### Cross-Team Planning

**Voordelen:**

- Flexibele personeelsinzet
- Betere dekking bij personeelstekort
- Efficiëntere resource benutting

**Beperkingen:**

- Medewerker moet expliciet beschikbaar zijn
- Uur limieten worden gerespecteerd
- Veiligheidsregels blijven van toepassing (geen aaneensluitende shiften)

### 🚨 Noodinplanning

Noodinplanning is een functie waarmee supervisors in noodgevallen medewerkers van **andere stations** kunnen toewijzen aan shifts. Dit is bedoeld voor situaties waar geen reguliere bezetting beschikbaar is.

#### Wanneer Gebruiken?

- ❌ **Niet** voor reguliere planning - gebruik altijd eerst de normale planningsfuncties
- ✅ **Wel** voor noodgevallen: ziekte, onvoorziene afwezigheid, geen beschikbaarheid
- ✅ **Wel** wanneer er geen medewerker van het eigen station beschikbaar is

#### Hoe Noodinplanning Gebruiken?

1. **Open Planning Genereren pagina**
   - Navigeer naar de maand en station waar u een shift wilt invullen

2. **Klik op een bestaande shift**
   - Open het shift bewerkingsvenster door op een shift te klikken

3. **Klik op "Noodinplanning" knop**
   - De oranje knop "Noodinplanning" is alleen zichtbaar voor supervisors
   - Klik hierop om het noodinplanning venster te openen

4. **Selecteer een medewerker**
   - Filter op station (optioneel)
   - Zoek op naam
   - Selecteer de gewenste ambulancier uit de lijst
   - U ziet het station en rijbewijs C status van elke medewerker

5. **Vul een reden in (verplicht)**
   - Minimaal 5 tekens
   - Beschrijf waarom noodinplanning nodig is
   - Bijvoorbeeld: "Ziekte Jan, geen andere beschikbaarheid"

6. **Bevestig de noodinplanning**
   - Klik op "Noodinplanning Bevestigen"
   - De shift wordt toegewezen aan de geselecteerde medewerker

#### Visuele Indicatie

Shifts met noodinplanning zijn herkenbaar aan:
- 🟠 **Oranje "Nood" badge** naast de medewerkernaam in de planning
- Tooltip met de opgegeven reden wanneer u over de badge beweegt

#### Logging en Audit Trail

Elke noodinplanning wordt volledig gelogd:
- Wie de noodinplanning heeft uitgevoerd
- Welke medewerker is toegewezen
- De opgegeven reden
- Tijdstip van de wijziging

Dit is terug te vinden in de Activiteitslog.

#### Verdi Integratie

Bij noodinplanning wordt automatisch de **Nood PersonGUID** gebruikt voor Verdi synchronisatie:
- Omdat de medewerker niet geregistreerd is in Verdi van dit station
- Wordt een generieke "nood" persoon gebruikt in Verdi
- Configureer de Nood PersonGUIDs in Verdi Instellingen → Station Configuratie

**Belangrijk:** Configureer de Nood PersonGUIDs voordat u noodinplanning gebruikt, anders zal Verdi synchronisatie mislukken voor deze shifts.

#### Push Notificaties

De toegewezen medewerker ontvangt automatisch een push notificatie:
- Met vermelding dat het om een noodinplanning gaat
- Met de datum, tijden en station van de shift

### 📊 Supervisor Statistieken

#### Alle Stations Overzicht

**Station Selectie**
- Kies station uit dropdown
- Bekijk station-specifieke statistieken
- Vergelijk tussen verschillende posten

**Cross-Station Analyse:**
- Vergelijk prestaties tussen stations
- Identificeer knelpunten
- Optimaliseer resource verdeling

---

## 🖥️ IT Beheerders

Voor de volledige technische handleiding voor IT beheerders, zie **[Deel II: IT Beheerders Handleiding](#-deel-ii-it-beheerders-handleiding)** aan het einde van dit document.

Deel II bevat:
- Windows Server installatie en configuratie
- Database setup (PostgreSQL)
- Push notificaties configuratie
- SSL certificaat installatie
- PM2 process management
- Nginx/IIS reverse proxy setup
- Troubleshooting en onderhoud

---

## ❓ Veelgestelde Vragen

### Algemene Vragen

**Q: Kan ik mijn voorkeuren wijzigen na de deadline?**
A: Nee, na de deadline zijn voorkeuren vergrendeld. Neem contact op met uw admin voor noodgevallen.

**Q: Waarom kan ik geen dag shifts opgeven op weekdagen?**
A: Als er beroepsbezetting is zal er geen extra bezetting gezocht worden.

**Q: Hoe werken split shifts?**
A: Split shifts delen een volledige shift in twee delen. Voor dag: 7-13u en 13-19u. Er word voorrang gegeven bij het inplannen aan personen die volledige shifts opgeven.

**Q: Wat gebeurt er met feestdagen?**
A: Feestdagen worden behandeld als zondag. Ze gebruiken weekend configuratie en geen extra personeel.

### Ambulancier Vragen

**Q: Ik zie mijn shift niet in de planning, wat nu?**
A: Controleer of u de juiste maand bekijkt. Neem contact op met uw admin als shifts ontbreken.

**Q: Kan ik zien wie er met mij werkt?**
A: Ja, klik op een datum in uw planning om alle medewerkers voor die dag te zien.

**Q: Hoe weet ik of mijn voorkeuren zijn opgeslagen?**
A: U krijgt een bevestiging en ziet de kleuren in de kalender veranderen.

### Admin Vragen

**Q: Waarom kan het systeem geen planning genereren?**
A: Dit kan komen door onvoldoende beschikbare medewerkers. Controleer of genoeg mensen voorkeuren hebben opgegeven.

**Q: Hoe voeg ik een lokale feestdag toe?**
A: Ga naar Feestdagen → Nieuwe Feestdag → Vul details in → Sla op.

**Q: Kan ik shifts handmatig toewijzen?**
A: Ja, na automatische planning kunt u shifts handmatig aanpassen in de Planning pagina.

### Supervisor Vragen

**Q: Hoe koppel ik een medewerker aan meerdere stations?**
A: Ga naar Gebruikersbeheer → Cross-team Beheer → Selecteer gebruiker → Voeg station toe.

**Q: Kunnen cross-team medewerkers automatisch worden ingepland?**
A: Ja, als ze beschikbaar zijn en binnen hun uur limiet blijven.

---

## 🔧 Problemen Oplossen

### Inlog Problemen

**Probleem: Kan niet inloggen**

Oplossingen:
- Controleer gebruikersnaam (let op hoofdletters)
- Controleer wachtwoord
- Probeer ander station
- Neem contact op met admin
- Check of account nog actief is

**Probleem: Station lijst is leeg**

Oplossingen:
- Ververs de pagina
- Check internetverbinding
- Neem contact op met systeembeheerder

**Probleem: "Invalid stored password format" foutmelding na systeem update**

Dit gebeurt wanneer het systeem is bijgewerkt met nieuwe beveiligingsfuncties, maar de wachtwoorden in de database nog niet zijn gemigreerd.

Oplossing voor IT Beheerders:
1. Run de wachtwoord migration op de server:
   ```bash
   npm run migrate:passwords
   ```
2. Herstart de applicatie
3. Alle gebruikers kunnen nu inloggen met hun bestaande wachtwoorden

Zie `MIGRATION.md` voor gedetailleerde instructies.

**Belangrijk:** Deze migration verandert NIET de wachtwoorden zelf - alleen hoe ze veilig worden opgeslagen. Gebruikers typen nog steeds hetzelfde wachtwoord.

### Voorkeuren Problemen

**Probleem: Kan geen voorkeuren opgeven**

Oplossingen:
- Check of u binnen de deadline bent
- Controleer of de juiste maand is geselecteerd
- Ververs de pagina
- Check of uw account actief is

**Probleem: Kalender toont verkeerde kleuren**

Oplossingen:
- Ververs de pagina
- Wacht even (data wordt geladen)
- Check of voorkeuren correct zijn opgeslagen

### Planning Problemen

**Probleem: Planning generatie faalt**

Oplossingen:
- Controleer of alle medewerkers voorkeuren hebben opgegeven
- Check of er voldoende beschikbare medewerkers zijn
- Bekijk of weekdag configuraties correct zijn
- Probeer opnieuw na een paar minuten

**Probleem: Te veel open slots**

Oplossingen:
- Motiveer medewerkers meer voorkeuren op te geven
- Overweeg tijdelijke cross-team inzet
- Pas shift vereisten aan indien mogelijk

### Technische Problemen

**Probleem: Pagina laadt niet**

Oplossingen:
- Ververs de pagina (F5)
- Check internetverbinding
- Probeer andere browser
- Wis browser cache
- Neem contact op met beheerder applicatie

**Probleem: Langzame prestaties**

Oplossingen:
- Sluit andere browser tabs
- Check internetsnelheid
- Probeer op ander tijdstip
- Gebruik moderne browser

---

### 📞 Contact voor Ondersteuning

- **Planning algoritme**: Supervisor of systeembeheerder
- **Technische problemen**: IT ondersteuning

---

## 🔄 Systeem Updates

Het systeem wordt regelmatig bijgewerkt met nieuwe functies en verbeteringen.

### 🔄 Na een Update: Browser Verversen

**Belangrijk: Na een systeem update moet u uw browser verversen!**

Wanneer het systeem wordt bijgewerkt (bijvoorbeeld na een `git pull` en `npm run build` op de server), moet u uw browser **hard refresh** doen om de nieuwste versie te zien.

**Hoe doe je een hard refresh?**

**Windows / Linux:**
- Druk op **Ctrl + F5**
- Of: **Ctrl + Shift + R**

**Mac:**
- Druk op **Cmd + Shift + R**

**Waarom is dit nodig?**

Browsers bewaren oude versies van de website code in hun cache om snelheid te verhogen. Na een update kan uw browser daarom nog steeds de oude code gebruiken, waardoor:
- Nieuwe functies niet zichtbaar zijn
- Knoppen niet correct werken
- Instellingen niet correct worden opgeslagen

Een hard refresh forceert de browser om de nieuwste versie te downloaden.

**Wanneer moet je dit doen?**

- Direct na een melding van de beheerder dat het systeem is bijgewerkt
- Als nieuwe functies niet zichtbaar zijn
- Als bestaande functies opeens niet meer werken
- Bij twijfel - een hard refresh kan geen kwaad!

---

### Versiegeschiedenis (Samenvatting)

Het systeem wordt continu verbeterd. Hieronder vindt u een overzicht van de belangrijkste functies per versie:

| Versie | Datum | Belangrijkste Verbeteringen |
|--------|-------|----------------------------|
| **2025.20** | Dec 2025 | Station kiosk links beheer: admins/supervisors kunnen nu per station display links genereren, kopiëren en intrekken via Integraties pagina |
| **2025.19** | Dec 2025 | Uitgebreide logging: push notificaties, Excel exports, kalender tokens en beschikbaarheden export worden nu gelogd voor volledige audit trail |
| **2025.18** | Dec 2025 | Viewer rol met kiosk/display modus voor Lumaps, BASE_URL configuratie, verbeterde fullscreen titel met stationnaam |
| **2025.17** | Dec 2025 | Integratie logging: alle wijzigingen aan Verdi en Reportage instellingen worden nu gelogd in activiteitenlogboek |
| **2025.16** | Dec 2025 | Multi-station admin verbeteringen: station-selector op ruilverzoeken pagina, cross-team visibility met station badges, verbeterde cross-station dubbele inplanning preventie |
| **2025.15** | Dec 2025 | Wachtwoord reset via e-mail (self-service), undo historie voor gebruikersbeheer |
| **2025.14** | Dec 2025 | Uitgebreide audit logging voor handmatige shift wijzigingen (aanmaken, wijzigen, verwijderen, splitsen, samenvoegen), shift biedingen, station instellingen |
| **2025.13** | Dec 2025 | Biedingssysteem voor open shifts |
| **2025.12** | Dec 2025 | Handleiding herstructurering, verbeterde documentatie |
| **2025.11** | Dec 2025 | Shift Ruilen/Overnemen systeem, Activiteitenlog uitbreiding |
| **2025.10** | Nov 2025 | Activiteitenlog met audit trail, IP-tracking |
| **2025.9** | Nov 2025 | Brute-force bescherming, Excel export beschikbaarheden |
| **2025.6** | Nov 2025 | Integraties pagina, Verdi split shift support |
| **2025.5** | Nov 2025 | Wachtwoord beveiliging (scrypt), 70% snellere laadtijd |
| **2025.4** | Nov 2025 | Verdi synchronisatie, sorteerbare statistieken |
| **2025.3** | Okt 2025 | Cache optimalisatie, Windows Server support |
| **2025.2** | Okt 2025 | Kalender synchronisatie (iCal) |
| **2025.1** | Okt 2025 | Planning algoritme, cross-team functionaliteit |

**Huidige functies:**
- Kiosk/display modus voor Lumaps digitale schermen (via Viewer accounts)
- Multi-station admin ondersteuning met station-selector op alle beheerpagina's
- Cross-team visibility met station badges bij ruilverzoeken
- Wachtwoord reset via e-mail (self-service, supervisor-gecontroleerd)
- Undo historie voor gebruikersbeheer en shift planning
- Biedingssysteem voor open shifts (ambulanciers kunnen zich aanmelden)
- Push notificaties voor shifts en wijzigingen
- Shift ruilen en overnemen tussen collega's
- Kalender synchronisatie met externe apps
- Verdi alarmsoftware integratie
- Automatische maandelijkse rapportage via email
- Volledige audit trail en activiteitenlogging
- Progressive Web App (installeerbaar op telefoon/tablet)

---

# 🖥️ DEEL II: IT BEHEERDERS HANDLEIDING

**Voor IT professionals die het systeem installeren en beheren op Windows Server**

---

## Inhoudsopgave

1. [Overzicht](#overzicht)
2. [Systeemvereisten](#systeemvereisten)
3. [Benodigde Software](#benodigde-software)
4. [Database Setup](#database-setup)
5. [Applicatie Installatie](#applicatie-installatie)
6. [Push Notifications Setup](#push-notifications-setup)
7. [Deployment Configuratie](#deployment-configuratie)
8. [SSL Certificaat Installatie](#ssl-certificaat-installatie)
9. [Onderhoud & Beheer](#onderhoud--beheer)
10. [Troubleshooting](#troubleshooting)

---

## Overzicht

Het Ambulance Planning Systeem is een web-gebaseerde applicatie voor shift scheduling en operationeel beheer van 8 ambulancestations met 119 gebruikers. Deze handleiding beschrijft de volledige installatie en configuratie op Windows Server.

**Applicatie Architectuur:**
- **Frontend**: React 18 + TypeScript (Single Page Application)
- **Backend**: Node.js + Express (REST API)
- **Database**: PostgreSQL 12+
- **Runtime**: Node.js 18 LTS of hoger
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx (aanbevolen) of IIS

---

## Systeemvereisten

### Windows Server

**Minimale Vereisten:**
- **OS**: Windows Server 2016 of hoger (2019/2022 aanbevolen)
- **CPU**: 2 cores (4 cores aanbevolen voor 119+ gebruikers)
- **RAM**: 4 GB (8 GB aanbevolen)
- **Opslag**: 20 GB vrije schijfruimte (SSD aanbevolen)
- **Netwerk**: Statisch IP-adres of DHCP reservering

**Poorten (Windows Firewall):**
- **5000**: Applicatie (intern, alleen via reverse proxy)
- **80**: HTTP (redirect naar HTTPS)
- **443**: HTTPS (publiek toegankelijk)
- **5432**: PostgreSQL (alleen localhost, NIET publiek)

### Ondersteunde Browsers (Gebruikers)

- **Chrome**: 90+
- **Firefox**: 88+
- **Edge**: 90+
- **Safari**: 14+ (iOS 14.5+)

---

## Benodigde Software

### 1. Node.js 18 LTS

**Download & Installatie:**

1. Ga naar https://nodejs.org/
2. Download **Node.js 18.x LTS** (Windows Installer `.msi`)
3. Voer installer uit:
   - Accepteer licentie
   - Installatie pad: `C:\Program Files\nodejs\`
   - **Belangrijk**: Selecteer "Automatically install necessary tools" (Python, Visual Studio Build Tools)
4. Herstart server na installatie

**Verificatie:**
```cmd
node --version
npm --version
```
Output moet zijn: `v18.x.x` en `npm 9.x.x` of hoger.

---

### 2. PostgreSQL Database Server

**Download & Installatie:**

1. Ga naar https://www.postgresql.org/download/windows/
2. Download **PostgreSQL 12** of hoger (installer via EnterpriseDB)
3. Voer installer uit:
   - **Installation Directory**: `C:\Program Files\PostgreSQL\{versie}\`
   - **Data Directory**: `C:\Program Files\PostgreSQL\{versie}\data\`
   - **Wachtwoord**: Kies een sterk wachtwoord voor de `postgres` superuser (bewaar dit veilig!)
   - **Port**: `5432` (standaard)
   - **Locale**: `Dutch, Netherlands` of `English, United States`
4. Installeer pgAdmin 4 (meegeleverd met installer) voor GUI management

**Verificatie:**
```cmd
psql --version
```

**Firewall Configuratie:**
PostgreSQL moet ALLEEN toegankelijk zijn vanaf localhost. Blokkeer poort 5432 voor externe verbindingen:
```cmd
netsh advfirewall firewall add rule name="PostgreSQL Block External" dir=in action=block protocol=TCP localport=5432 remoteip=any
```

---

### 3. Git voor Windows

**Download & Installatie:**

1. Ga naar https://git-scm.com/download/win
2. Download en installeer Git
3. Tijdens installatie:
   - Selecteer "Git from the command line and also from 3rd-party software"
   - Selecteer "Use Windows' default console window"

**Verificatie:**
```cmd
git --version
```

---

### 4. PM2 Process Manager

PM2 zorgt ervoor dat de applicatie automatisch herstart na crashes en server reboots.

**Installatie (na Node.js installatie):**

⚠️ **Belangrijk**: Open PowerShell **als Administrator** voor deze stappen!

```cmd
npm install -g pm2
npm install -g pm2-windows-startup
```

**Windows Startup configuratie:**
```cmd
pm2-startup install
```

Dit maakt een Windows Task aan die PM2 automatisch start bij server reboot.

**Verificatie:**
```cmd
pm2 --version
```

---

### 5. Nginx Web Server (Aanbevolen)

Nginx fungeert als reverse proxy voor SSL terminatie en load balancing.

**Download & Installatie:**

1. Ga naar http://nginx.org/en/download.html
2. Download **nginx/Windows** (bijv. `nginx-1.24.0.zip`)
3. Unzip naar `C:\nginx`

**Verificatie:**
```cmd
cd C:\nginx
nginx -v
```

**Windows Service configuratie:**

Download **NSSM** (Non-Sucking Service Manager): https://nssm.cc/download

```cmd
nssm install nginx "C:\nginx\nginx.exe"
nssm set nginx AppDirectory "C:\nginx"
nssm start nginx
```

---

### 6. IIS Web Server (Alternatief voor Nginx)

Als je organisatie IIS (Internet Information Services) verplicht stelt, kan IIS gebruikt worden als reverse proxy.

**Vereisten:**
- Windows Server met IIS geïnstalleerd
- Application Request Routing (ARR) module
- URL Rewrite module

#### Stap 1: IIS Modules Installeren

**Download en installeer:**

1. **URL Rewrite Module**: https://www.iis.net/downloads/microsoft/url-rewrite
2. **Application Request Routing**: https://www.iis.net/downloads/microsoft/application-request-routing

Installeer beide MSI bestanden.

#### Stap 2: ARR Proxy Enablen

Open IIS Manager:

1. Selecteer server node (root level)
2. Dubbelklik **Application Request Routing Cache**
3. Klik rechts op **Server Proxy Settings**
4. Vink **Enable proxy** aan
5. Klik **Apply**

#### Stap 3: Website Aanmaken

1. Open IIS Manager
2. Rechtermuisklik op **Sites** → **Add Website**
3. Configuratie:
   - **Site name**: Ambulance Planning
   - **Physical path**: `C:\inetpub\wwwroot\ambulance-planning` (lege folder, alleen voor bindings)
   - **Binding Type**: https
   - **Port**: 443
   - **Host name**: jouw-domein.nl
   - **SSL Certificate**: Selecteer geïnstalleerd certificaat (zie SSL sectie)

#### Stap 4: URL Rewrite Rules

Selecteer de website in IIS Manager en dubbelklik **URL Rewrite**.

**Regel 1: HTTP naar HTTPS Redirect**

1. Klik **Add Rule(s)** → **Blank rule**
2. Configuratie:
   - **Name**: HTTP to HTTPS Redirect
   - **Match URL**:
     - Requested URL: `Matches the Pattern`
     - Using: `Regular Expressions`
     - Pattern: `(.*)`
   - **Conditions**:
     - Klik **Add** → **{HTTPS}** → **Matches the Pattern** → **^OFF$**
   - **Action**:
     - Action type: `Redirect`
     - Redirect URL: `https://{HTTP_HOST}/{R:1}`
     - Redirect type: `Permanent (301)`

**Regel 2: Reverse Proxy naar Node.js**

1. Klik **Add Rule(s)** → **Blank rule**
2. Configuratie:
   - **Name**: Reverse Proxy to Node.js
   - **Match URL**:
     - Requested URL: `Matches the Pattern`
     - Using: `Regular Expressions`
     - Pattern: `(.*)`
   - **Conditions**: (geen)
   - **Server Variables**:
     - Klik **Manage Server Variables** → **Add**:
       - `HTTP_X_FORWARDED_PROTO` → Value: `https`
   - **Action**:
     - Action type: `Rewrite`
     - Rewrite URL: `http://localhost:5000/{R:1}`
     - Append query string: Aanvinken
     - Stop processing: Aanvinken

#### Stap 5: WebSocket Support Enablen

Voor push notifications is WebSocket support vereist:

1. Selecteer server node in IIS Manager
2. Dubbelklik **Configuration Editor**
3. Section: `system.webServer/webSocket`
4. Stel in:
   - **enabled**: `True`
5. Klik **Apply**

#### Stap 6: Application Pool Configuratie

1. Ga naar **Application Pools**
2. Selecteer de pool voor Ambulance Planning website
3. **Basic Settings**:
   - .NET CLR Version: `No Managed Code` (Node.js heeft geen .NET nodig)
   - Managed Pipeline Mode: `Integrated`

#### Stap 7: Firewall & Permissions

Zelfde als Nginx configuratie:

```cmd
netsh advfirewall firewall add rule name="HTTP Port 80" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="HTTPS Port 443" dir=in action=allow protocol=TCP localport=443
netsh advfirewall firewall add rule name="Block Node.js Direct Access" dir=in action=block protocol=TCP localport=5000 remoteip=any
```

**Testen:**

1. Start PM2 applicatie (zie Deployment sectie)
2. Ga naar https://jouw-domein.nl in browser
3. Je moet de applicatie zien (via IIS → Node.js proxy)

---

### 7. Windows Defender Exclusions (Belangrijk!)

Windows Defender kan Node.js performance significant vertragen. Voeg exclusions toe:

1. Open **Windows Security** → **Virus & threat protection**
2. **Manage settings** → **Exclusions** → **Add or remove exclusions**
3. Voeg toe:
   - **Folder**: `C:\inetpub\ambulance-planning`
   - **Folder**: `C:\Users\Administrator\.pm2`
   - **Folder**: `C:\Program Files\nodejs`
   - **Folder**: `C:\nginx` (indien Nginx gebruikt)
   - **Process**: `node.exe`
   - **Process**: `nginx.exe` (indien Nginx gebruikt)

⚠️ **Let op**: Doe dit ALLEEN op een dedicated applicatie server achter een firewall!

---

## Database Setup

### 1. Database en User Aanmaken

Open **pgAdmin 4** of gebruik **psql** via command line:

```cmd
psql -U postgres
```

Voer volgende SQL commando's uit:

```sql
-- Maak database aan
CREATE DATABASE ambulance_planning
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'Dutch_Netherlands.1252'
    LC_CTYPE = 'Dutch_Netherlands.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Maak dedicated user aan (veiliger dan postgres superuser)
CREATE USER ambulance_app WITH PASSWORD 'jouw_sterke_wachtwoord_hier';

-- Geef rechten aan user
GRANT ALL PRIVILEGES ON DATABASE ambulance_planning TO ambulance_app;

-- Connecteer met database
\c ambulance_planning

-- Geef schema rechten
GRANT ALL ON SCHEMA public TO ambulance_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ambulance_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ambulance_app;

-- Zorg dat toekomstige tabellen ook rechten krijgen
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ambulance_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ambulance_app;
```

**Exit psql:**
```sql
\q
```

### 2. Connection String Samenstellen

De database connection string heeft dit formaat:
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=disable
```

**Voorbeeld:**
```
postgresql://ambulance_app:jouw_sterke_wachtwoord_hier@localhost:5432/ambulance_planning?sslmode=disable
```

**Let op**: Gebruik `sslmode=disable` voor localhost connecties. Voor remote database connecties gebruik `sslmode=require`.

### 3. Database Connectie Testen

Test de connectie voordat je verder gaat:

```cmd
psql -U ambulance_app -d ambulance_planning -h localhost -p 5432
```

Als de connectie lukt, zie je de PostgreSQL prompt.

---

## Applicatie Installatie

### 1. Source Code Ophalen

**Optie A: Via Git (aanbevolen voor updates)**
```cmd
cd C:\inetpub
git clone <repository-url> ambulance-planning
cd ambulance-planning
```

**Optie B: Via ZIP bestand**
1. Download source code ZIP
2. Unzip naar `C:\inetpub\ambulance-planning`

### 2. Dependencies Installeren

```cmd
cd C:\inetpub\ambulance-planning
npm install
```

Dit installeert alle benodigde Node.js packages (kan 5-10 minuten duren).

### 3. Environment Variabelen Configureren

Maak een `.env` bestand in de root van de applicatie:

```cmd
notepad .env
```

Voeg volgende configuratie toe (pas waarden aan voor jouw omgeving):

```env
# Database Configuratie
DATABASE_URL=postgresql://ambulance_app:jouw_wachtwoord@localhost:5432/ambulance_planning?sslmode=disable

# PostgreSQL Direct Connection (gebruikt door Drizzle ORM)
PGHOST=localhost
PGPORT=5432
PGUSER=ambulance_app
PGPASSWORD=jouw_wachtwoord
PGDATABASE=ambulance_planning

# Applicatie Configuratie
NODE_ENV=production
PORT=5000

# Public URL (gebruikt voor iCal feeds en externe links)
PUBLIC_URL=https://jouw-domein.nl

# Base URL voor kiosk/display links (optioneel)
# Gebruik dit als interne IP en publiek domein verschillen
BASE_URL=https://dgh.brandweerzonekempen.be

# Session Secret (genereer een random string van 32+ karakters)
SESSION_SECRET=genereer_hier_een_random_string_van_minimaal_32_karakters

# VAPID Keys voor Push Notifications (zie volgende sectie)
VAPID_PUBLIC_KEY=<wordt later gegenereerd>
VAPID_PRIVATE_KEY=<wordt later gegenereerd>
VAPID_CONTACT_EMAIL=admin@jouw-domein.nl
```

**SESSION_SECRET genereren:**

Open Node.js REPL:
```cmd
node
```

Voer uit:
```javascript
require('crypto').randomBytes(32).toString('hex')
```

Kopieer de output naar `SESSION_SECRET` in `.env` bestand.

**BASE_URL configureren (voor kiosk/display links):**

De `BASE_URL` variabele is optioneel en wordt gebruikt om het domein in display/kiosk links te bepalen. Dit is nodig wanneer:
- Gebruikers intern inloggen via een IP-adres (bijv. `http://10.10.120.30:5000`)
- Maar de display links een publiek domein moeten gebruiken (bijv. `https://dgh.brandweerzonekempen.be`)

**Wanneer nodig:**
- Als Lumaps displays via het publieke domein moeten verbinden
- Als de server bereikbaar is via zowel intern IP als extern domein

**Hoe het werkt:**
- Als `BASE_URL` is ingesteld → alle kiosk links gebruiken dit domein
- Als `BASE_URL` niet is ingesteld → de server bepaalt het domein automatisch op basis van de inkomende request headers

**Na wijziging:**
1. Herstart de applicatie (PM2 of IIS)
2. Viewers moeten opnieuw naar hun profiel gaan om de bijgewerkte link te kopiëren

### 4. Applicatie Builden

Build de frontend en backend:

```cmd
npm run build
```

Dit commando:
- Compileert TypeScript naar JavaScript
- Bundelt React frontend met Vite
- Genereert service worker voor PWA
- Plaatst output in `dist/` folder

**Output:**
- `dist/index.js` - Backend server
- `dist/public/` - Frontend static assets

### 5. Database Schema Migratie

De database schema moet worden geïnitialiseerd met alle tabellen:

```cmd
npm run db:push
```

Als er een waarschuwing komt over data verlies, gebruik dan:
```cmd
npm run db:push -- --force
```

**Verificatie:**

Controleer of tabellen zijn aangemaakt:
```cmd
psql -U ambulance_app -d ambulance_planning -c "\dt"
```

Je moet minimaal deze tabellen zien:
- `users`
- `stations`
- `shifts`
- `schedules`
- `user_preferences`
- `push_subscriptions`
- `verdi_station_config`
- En nog ~15 andere tabellen

---

## Push Notifications Setup

Push notificaties vereisen VAPID (Voluntary Application Server Identification) keys voor veilige communicatie met browsers.

### 1. VAPID Keys Genereren

De applicatie bevat een helper script:

```cmd
node -e "const webpush = require('web-push'); const vapidKeys = webpush.generateVAPIDKeys(); console.log('Public Key:', vapidKeys.publicKey); console.log('Private Key:', vapidKeys.privateKey);"
```

**Output voorbeeld:**
```
Public Key: [JOUW_GEGENEREERDE_PUBLIC_KEY]
Private Key: [JOUW_GEGENEREERDE_PRIVATE_KEY]
```

### 2. Environment Variabelen Updaten

Open `.env` bestand en voeg de gegenereerde keys toe:

```env
VAPID_PUBLIC_KEY=[JOUW_GEGENEREERDE_PUBLIC_KEY]
VAPID_PRIVATE_KEY=[JOUW_GEGENEREERDE_PRIVATE_KEY]
VAPID_CONTACT_EMAIL=admin@jouw-domein.nl
```

**Belangrijk:**
- **Bewaar de private key veilig!** Verlies hiervan betekent dat alle bestaande push subscriptions ongeldig worden.
- Gebruik een geldig email adres voor `VAPID_CONTACT_EMAIL` (vereist door Web Push specificatie)

### 3. Push Notifications Testen

Start de applicatie (zie Deployment Configuratie) en:

1. Login als gebruiker
2. Ga naar **Profiel** pagina
3. Klik op **"Sta Push Notificaties Toe"**
4. Geef browser toestemming
5. Klik op **"Stuur Test Notificatie"**

Je moet een notificatie ontvangen met tekst "Test Notificatie".

---

## Deployment Configuratie

### 1. PM2 Applicatie Setup

PM2 zorgt ervoor dat de applicatie continu draait en automatisch herstart bij crashes.

**Start applicatie met PM2:**

```cmd
cd C:\inetpub\ambulance-planning
pm2 start dist/index.js --name ambulance-planning --node-args="--max-old-space-size=2048"
```

**PM2 Configuratie opslaan (voor auto-start):**

```cmd
pm2 save
```

**PM2 Status bekijken:**

```cmd
pm2 status
pm2 logs ambulance-planning
pm2 monit
```

**PM2 Logs:**
- Standaard locatie: `C:\Users\Administrator\.pm2\logs\`
- `ambulance-planning-out.log` - Applicatie output
- `ambulance-planning-error.log` - Errors

**Handige PM2 Commando's:**

```cmd
pm2 restart ambulance-planning   # Herstart applicatie
pm2 stop ambulance-planning      # Stop applicatie
pm2 delete ambulance-planning    # Verwijder uit PM2
pm2 reload ambulance-planning    # Zero-downtime reload
```

### 2. Nginx Reverse Proxy Configuratie

Nginx fungeert als reverse proxy voor:
- SSL terminatie (HTTPS)
- HTTP naar HTTPS redirect
- Compressie (gzip)
- Caching van static assets

**Nginx configuratie:**

Open `C:\nginx\conf\nginx.conf` en vervang de inhoud met:

```nginx
worker_processes 2;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    # Gzip Compressie
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name jouw-domein.nl www.jouw-domein.nl;
        
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name jouw-domein.nl www.jouw-domein.nl;

        # SSL Certificaten (zie volgende sectie)
        ssl_certificate      C:/nginx/ssl/certificate.crt;
        ssl_certificate_key  C:/nginx/ssl/private.key;

        # SSL Security
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Client Max Body Size (voor file uploads)
        client_max_body_size 50M;

        # Proxy naar Node.js applicatie
        location / {
            proxy_pass http://localhost:5000;
            proxy_http_version 1.1;
            
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300;
            proxy_connect_timeout 300;
        }

        # Cache static assets (PWA)
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://localhost:5000;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Service Worker (mag NIET gecached worden)
        location = /sw.js {
            proxy_pass http://localhost:5000;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
}
```

**Configuratie testen:**

```cmd
cd C:\nginx
nginx -t
```

Output moet zijn: `syntax is ok` en `test is successful`.

**Nginx herstarten:**

```cmd
nssm restart nginx
```

**Of zonder NSSM:**
```cmd
cd C:\nginx
nginx -s reload
```

### 3. Windows Firewall Configuratie

Open poorten voor HTTP en HTTPS:

```cmd
netsh advfirewall firewall add rule name="HTTP Port 80" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="HTTPS Port 443" dir=in action=allow protocol=TCP localport=443
```

**Blokkeer directe toegang tot Node.js (poort 5000):**

```cmd
netsh advfirewall firewall add rule name="Block Node.js Direct Access" dir=in action=block protocol=TCP localport=5000 remoteip=any
```

Dit zorgt ervoor dat gebruikers ALLEEN via Nginx (HTTPS) kunnen verbinden, niet direct naar Node.js.

---

## SSL Certificaat Installatie

Voor productie gebruik is een geldig SSL certificaat vereist voor HTTPS.

### Optie A: Let's Encrypt (Gratis, Aanbevolen)

**Windows + Let's Encrypt:**

1. Download **win-acme** (Let's Encrypt client voor Windows): https://www.win-acme.com/
2. Unzip naar `C:\win-acme`
3. Voer uit als Administrator:

```cmd
cd C:\win-acme
wacs.exe
```

4. Volg wizard:
   - Kies **"Create certificate (full options)"**
   - Target: **"Manual input"**
   - Domain: `jouw-domein.nl,www.jouw-domein.nl`
   - Validation: **"HTTP validation"** (zorg dat poort 80 bereikbaar is)
   - **Voor Nginx**:
     - Store: **"PEM encoded files"**
     - Path: `C:\nginx\ssl\`
   - **Voor IIS**:
     - Store: **"Certificate Store"**
     - Store location: **"Web Hosting"**

5. **Nginx**: Certificaten worden opgeslagen in:
   - `C:\nginx\ssl\certificate.crt`
   - `C:\nginx\ssl\private.key`

6. **IIS**: Certificaat wordt automatisch geïmporteerd in Windows Certificate Store:
   - Open IIS Manager
   - Selecteer server node
   - Dubbelklik **Server Certificates**
   - Certificaat is zichtbaar en klaar voor gebruik in site bindings

7. Automatische renewal: win-acme maakt een Windows Scheduled Task aan voor automatische vernieuwing (elke 60 dagen).

### Optie B: Commercieel Certificaat

Als je een certificaat koopt (bijv. van Sectigo, DigiCert):

1. Genereer CSR (Certificate Signing Request):
```cmd
openssl req -new -newkey rsa:2048 -nodes -keyout C:\nginx\ssl\private.key -out C:\nginx\ssl\certificate.csr
```

2. Upload CSR naar certificaat provider en download certificaat (`.crt` of `.cer` bestand)

3. Plaats certificaat bestanden in `C:\nginx\ssl\`:
   - `certificate.crt` - Uw certificaat + intermediate chain
   - `private.key` - Private key

### Certificaat Verificatie

Test SSL configuratie:

```cmd
cd C:\nginx
nginx -t
nssm restart nginx
```

Ga naar https://www.ssllabs.com/ssltest/ en voer uw domein in voor een security scan (moet minimaal A rating krijgen).

---

## Onderhoud & Beheer

### 1. Database Backups

**Automatische Backup Script (PowerShell):**

Maak `C:\Scripts\backup-database.ps1`:

```powershell
# Database Backup Script
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "C:\Backups\AmbulancePlanning"
$backupFile = "$backupDir\ambulance_planning_$timestamp.sql"

# Maak backup directory indien niet bestaat
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

# Detecteer PostgreSQL installatie directory (ondersteunt versie 12+)
$pgPath = $null
$possibleVersions = @("16", "15", "14", "13", "12")
foreach ($version in $possibleVersions) {
    $testPath = "C:\Program Files\PostgreSQL\$version\bin\pg_dump.exe"
    if (Test-Path $testPath) {
        $pgPath = $testPath
        break
    }
}

if (-not $pgPath) {
    Write-Error "PostgreSQL pg_dump.exe not found. Pas het pad aan in het script."
    exit 1
}

# Voer pg_dump uit
$env:PGPASSWORD = "jouw_database_wachtwoord"
& $pgPath -U ambulance_app -h localhost -d ambulance_planning -F c -f $backupFile

# Verwijder backups ouder dan 30 dagen
Get-ChildItem -Path $backupDir -Filter "*.sql" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item

Write-Host "Backup completed: $backupFile"
```

**Windows Scheduled Task aanmaken:**

1. Open **Task Scheduler**
2. Create Task:
   - **Name**: Ambulance Planning Database Backup
   - **Trigger**: Daily, 02:00 AM
   - **Action**: 
     - Program: `powershell.exe`
     - Arguments: `-ExecutionPolicy Bypass -File "C:\Scripts\backup-database.ps1"`
   - **Run with highest privileges**: Aanvinken

**Database Restore:**

⚠️ **Let op**: Pas het PostgreSQL versie nummer aan naar jouw geïnstalleerde versie (12, 13, 14, 15, of 16).

```cmd
set PGPASSWORD=jouw_database_wachtwoord
"C:\Program Files\PostgreSQL\14\bin\pg_restore.exe" -U ambulance_app -h localhost -d ambulance_planning -c "C:\Backups\AmbulancePlanning\ambulance_planning_2025-11-23_02-00-00.sql"
```

**Best Practice**: Test regelmatig (bijv. maandelijks) een restore op een test database om te verifiëren dat backups correct werken:

```cmd
# Maak test database
psql -U postgres -c "CREATE DATABASE ambulance_planning_test;"

# Restore backup naar test database
set PGPASSWORD=jouw_database_wachtwoord
"C:\Program Files\PostgreSQL\14\bin\pg_restore.exe" -U ambulance_app -h localhost -d ambulance_planning_test -c "C:\Backups\AmbulancePlanning\ambulance_planning_2025-11-23_02-00-00.sql"

# Verifieer data
psql -U ambulance_app -d ambulance_planning_test -c "SELECT COUNT(*) FROM users;"

# Verwijder test database
psql -U postgres -c "DROP DATABASE ambulance_planning_test;"
```

### 2. Applicatie Updates

**Update Process:**

```cmd
cd C:\inetpub\ambulance-planning

# Stop applicatie
pm2 stop ambulance-planning

# Backup huidige versie
xcopy /E /I /Y . ..\ambulance-planning-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%

# Pull nieuwe code (als je Git gebruikt)
git pull origin main

# Of: unzip nieuwe versie over bestaande bestanden

# Installeer eventuele nieuwe dependencies
npm install

# Build nieuwe versie
npm run build

# Database migraties (indien aanwezig)
npm run db:push

# Herstart applicatie
pm2 restart ambulance-planning

# Controleer logs
pm2 logs ambulance-planning --lines 100
```

**Rollback bij problemen:**

```cmd
pm2 stop ambulance-planning
rd /S /Q C:\inetpub\ambulance-planning
move C:\inetpub\ambulance-planning-backup-20251123 C:\inetpub\ambulance-planning
pm2 restart ambulance-planning
```

### 3. Log Monitoring

**PM2 Logs:**

```cmd
# Real-time logs
pm2 logs ambulance-planning

# Laatste 200 regels
pm2 logs ambulance-planning --lines 200

# Alleen errors
pm2 logs ambulance-planning --err
```

**Nginx Access Logs:**
- Locatie: `C:\nginx\logs\access.log`
- Rotatie: Configureer log rotation voor grote bestanden

**Database Logs:**
- Locatie: `C:\Program Files\PostgreSQL\14\data\log\`
- Configuratie: `postgresql.conf`

### 4. Performance Monitoring

**PM2 Monitoring:**

```cmd
pm2 monit
```

Toont real-time:
- CPU gebruik
- Memory gebruik
- Active requests

**Database Performance:**

Langzame queries identificeren:

```sql
-- Enable slow query logging in postgresql.conf:
-- log_min_duration_statement = 1000  # Log queries > 1 seconde

-- Bekijk actieve queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

**Disk Space Monitoring:**

Zorg dat minimaal 20% vrije ruimte beschikbaar blijft.

```cmd
wmic logicaldisk get caption,freespace,size
```

---

## Troubleshooting

### 1. Applicatie Start Niet

**Symptomen:** PM2 toont status `errored` of `stopped`

**Diagnose:**

```cmd
pm2 logs ambulance-planning --err --lines 50
```

**Veelvoorkomende Oorzaken:**

**A. Database Connectie Fout**

Error: `error: password authentication failed` of `ECONNREFUSED`

**Oplossing:**
- Controleer `DATABASE_URL` in `.env` bestand
- Verificeer PostgreSQL service draait:
  ```cmd
  sc query postgresql-x64-14
  ```
- Test database connectie:
  ```cmd
  psql -U ambulance_app -d ambulance_planning -h localhost
  ```

**B. Poort 5000 Al In Gebruik**

Error: `EADDRINUSE: address already in use :::5000`

**Oplossing:**
```cmd
# Vind proces op poort 5000
netstat -ano | findstr :5000

# Kill proces (gebruik PID uit netstat output)
taskkill /PID <PID> /F

# Of wijzig poort in .env bestand
```

**C. Missing Environment Variabelen**

Error: `SESSION_SECRET is not defined`

**Oplossing:**
- Controleer of `.env` bestand aanwezig is in applicatie root
- Verifieer alle vereiste variabelen:
  ```cmd
  type .env
  ```

### 2. Push Notifications Werken Niet

**Symptomen:** Gebruikers kunnen niet subscriben of ontvangen geen notificaties

**Diagnose:**

**A. VAPID Keys Ontbreken**

Check `.env` bestand voor:
```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_CONTACT_EMAIL=...
```

**B. HTTPS Vereist**

Push notifications werken ALLEEN over HTTPS (behalve `localhost`). Controleer:
- Geldig SSL certificaat geïnstalleerd
- Nginx HTTPS configuratie correct
- Browser toont groene slotje in adresbalk

**C. Browser Blokkering**

Sommige browsers blokkeren notificaties standaard:
- Gebruiker moet expliciet toestemming geven
- Check browser instellingen: `chrome://settings/content/notifications`
- Controleer of domein niet geblokkeerd is

**D. Service Worker Registratie**

Open browser Developer Tools (F12) → Console:
- Check voor errors bij service worker registratie
- Ga naar Application tab → Service Workers
- Moet `sw.js` actief tonen

**Logs checken:**
```cmd
pm2 logs ambulance-planning | findstr "push"
```

### 3. Database Performance Problemen

**Symptomen:** Trage queries, timeouts, hoog CPU gebruik

**Diagnose:**

**A. Vacuuming & Analyze**

PostgreSQL heeft regelmatig onderhoud nodig:

```sql
-- Manual vacuum (kan lang duren)
VACUUM ANALYZE;

-- Autovacuum status checken
SELECT schemaname, tablename, last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY last_autovacuum;
```

**B. Index Optimalisatie**

Vind missing indexes:

```sql
-- Toon tabellen zonder indexes
SELECT tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
ORDER BY n_distinct DESC;
```

**C. Connection Pool Size**

Verhoog max connections in `postgresql.conf`:
```
max_connections = 100  # Default is vaak 100
```

Herstart PostgreSQL service na wijziging.

### 4. Nginx / SSL Issues

**Symptomen:** 502 Bad Gateway, SSL errors, connection refused

**A. 502 Bad Gateway**

Nginx kan Node.js applicatie niet bereiken.

**Oplossing:**
- Controleer of PM2 applicatie draait:
  ```cmd
  pm2 status
  ```
- Test directe connectie naar Node.js:
  ```cmd
  curl http://localhost:5000
  ```
- Check Nginx error logs:
  ```cmd
  type C:\nginx\logs\error.log
  ```

**B. SSL Certificate Expired**

Let's Encrypt certificaten verlopen na 90 dagen.

**Oplossing:**
- Check expiry datum:
  ```cmd
  openssl x509 -in C:\nginx\ssl\certificate.crt -noout -dates
  ```
- Vernieuw met win-acme:
  ```cmd
  cd C:\win-acme
  wacs.exe --renew
  ```

**C. Mixed Content Warnings**

Browser console toont: `Mixed Content: The page was loaded over HTTPS, but requested an insecure resource`

**Oplossing:**
- Zorg dat `PUBLIC_URL` in `.env` begint met `https://`
- Check dat alle interne links relatief zijn of HTTPS gebruiken

### 5. Session / Login Problemen

**Symptomen:** Gebruikers worden automatisch uitgelogd, sessies verdwijnen

**A. Session Store Database**

Applicatie gebruikt PostgreSQL voor session opslag. Check:

```sql
SELECT * FROM session LIMIT 10;
```

Als tabel niet bestaat, voer uit:
```cmd
npm run db:push
```

**B. SESSION_SECRET Gewijzigd**

Als `SESSION_SECRET` wijzigt, worden alle bestaande sessies ongeldig.

**Oplossing:**
- Gebruik altijd dezelfde `SESSION_SECRET`
- Backup `.env` bestand bij updates

### 6. File Upload Problemen

**Symptomen:** Excel import / profielfoto upload faalt

**A. File Size Limit**

Check Nginx configuratie:
```nginx
client_max_body_size 50M;
```

**B. Disk Permissions**

Applicatie moet schrijfrechten hebben op upload directory:

```cmd
icacls "C:\inetpub\ambulance-planning\uploads" /grant "Users:(OI)(CI)F"
```

### 7. Windows Server Specifieke Issues

**A. Node.js Performance op Windows**

Windows heeft vaak lagere I/O performance dan Linux. Optimalisaties:

```cmd
# Verhoog Node.js memory limit
pm2 start dist/index.js --name ambulance-planning --node-args="--max-old-space-size=4096"

# Disable Windows Defender real-time scanning voor Node.js folders
# (Voeg exclusions toe via Windows Security instellingen)
```

**B. Path Length Limitations**

Windows heeft een 260 karakter path limiet. Bij `npm install` errors:

```cmd
# Enable long path support (Windows 10 1607+, Windows Server 2016+)
reg add HKLM\SYSTEM\CurrentControlSet\Control\FileSystem /v LongPathsEnabled /t REG_DWORD /d 1 /f
```

Herstart server na deze wijziging.

---

## Contact & Support

**Applicatie Issues:**
- Check eerst deze troubleshooting guide
- Verzamel relevante logs (PM2, Nginx, PostgreSQL)
- Documenteer reproductiestappen

**Database Backup Strategie:**
- **Daily**: Automatische backup (zie Onderhoud sectie)
- **Voor updates**: Manual backup
- **Bewaarperiode**: Minimum 30 dagen

**Aanbevolen Update Schedule:**
- **Security patches**: Binnen 7 dagen
- **Feature updates**: Maandelijks (na testing)
- **PostgreSQL/Node.js updates**: Elk kwartaal

---

## Appendix: Configuratie Checklist

Gebruik deze checklist bij nieuwe installatie:

### Pre-installatie
- [ ] Windows Server 2016+ geïnstalleerd
- [ ] Statisch IP-adres of DHCP reservering
- [ ] DNS records geconfigureerd (A record voor domein)
- [ ] Remote Desktop toegang geconfigureerd

### Software Installatie
- [ ] Node.js 18 LTS geïnstalleerd en geverifieerd (`node --version`)
- [ ] PostgreSQL 12+ geïnstalleerd en service draait
- [ ] Git voor Windows geïnstalleerd (`git --version`)
- [ ] PM2 globally geïnstalleerd **als Administrator** (`pm2 --version`)
- [ ] PM2 startup geïnstalleerd (`pm2-startup install`)
- [ ] **Keuze gemaakt**: Nginx OF IIS als reverse proxy
- [ ] **Indien Nginx**: Nginx gedownload en geconfigureerd als service (NSSM)
- [ ] **Indien IIS**: URL Rewrite & ARR modules geïnstalleerd
- [ ] Windows Defender exclusions toegevoegd voor performance
- [ ] (Optioneel) win-acme voor Let's Encrypt

### Database Setup
- [ ] Database `ambulance_planning` aangemaakt
- [ ] Database user `ambulance_app` aangemaakt met rechten
- [ ] Connection string getest met psql
- [ ] PostgreSQL poort 5432 geblokkeerd voor externe toegang

### Applicatie Setup
- [ ] Source code geplaatst in `C:\inetpub\ambulance-planning`
- [ ] `.env` bestand aangemaakt met alle variabelen
- [ ] `npm install` succesvol uitgevoerd
- [ ] `npm run build` succesvol uitgevoerd
- [ ] `npm run db:push` succesvol uitgevoerd (schema migratie)
- [ ] VAPID keys gegenereerd en toegevoegd aan `.env`

### Deployment
- [ ] PM2 applicatie gestart met `pm2 start dist/index.js`
- [ ] PM2 configuratie opgeslagen met `pm2 save`
- [ ] PM2 logs gecontroleerd op errors (`pm2 logs ambulance-planning`)
- [ ] **Indien Nginx**: Configuratie aangepast voor domein en getest (`nginx -t`)
- [ ] **Indien IIS**: Website en URL Rewrite rules geconfigureerd
- [ ] **Indien IIS**: WebSocket support enabled in Configuration Editor
- [ ] SSL certificaat geïnstalleerd (win-acme of commercieel)
- [ ] **Indien Nginx**: Nginx service herstart (`nssm restart nginx`)
- [ ] **Indien IIS**: IIS website gestart in IIS Manager
- [ ] Windows Firewall regels toegevoegd (poort 80, 443 open)
- [ ] Node.js poort 5000 geblokkeerd voor externe toegang

### Verificatie
- [ ] HTTP automatisch redirect naar HTTPS
- [ ] Applicatie bereikbaar via HTTPS (https://jouw-domein.nl)
- [ ] Browser toont geldig SSL certificaat (groen slotje)
- [ ] Login werkt met test gebruiker account
- [ ] Dashboard laadt zonder JavaScript errors (check browser console F12)
- [ ] Service Worker geregistreerd (F12 → Application → Service Workers)
- [ ] Push notifications test succesvol vanuit Profiel pagina
- [ ] iCal feed werkt (kopieer personal token URL uit Profiel)
- [ ] Database backup script handmatig getest
- [ ] Scheduled task voor backups aangemaakt (Task Scheduler)
- [ ] SSL Labs scan toont minimaal A rating (https://www.ssllabs.com/ssltest/)
- [ ] PM2 herstart automatisch na server reboot (test met `shutdown /r /t 0`)

### Productie Gereed
- [ ] Alle test gebruikers verwijderd
- [ ] Administrator wachtwoorden gewijzigd
- [ ] Database wachtwoorden veilig opgeslagen
- [ ] `.env` bestand beveiligd (read-only voor admin only)
- [ ] Monitoring ingesteld (PM2, disk space)
- [ ] Update procedure gedocumenteerd
- [ ] Rollback procedure getest

---

**Einde IT Beheerders Handleiding v2025.6**
