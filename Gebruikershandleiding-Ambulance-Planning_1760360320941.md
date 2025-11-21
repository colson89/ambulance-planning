# GEBRUIKERSHANDLEIDING

## Ambulance Planning Systeem

**Versie 2025.5 - November 2025**

---

# 📖 Gebruikershandleiding Ambulance Planning Systeem

## 📋 Inhoudsopgave

- [Inleiding](#inleiding)
- [Inloggen en Navigatie](#inloggen-en-navigatie)
- [Handleiding voor Ambulanciers](#handleiding-voor-ambulanciers)
  - [Voorkeuren Opgeven](#-voorkeuren-opgeven)
  - [Planning Bekijken](#-uw-planning-bekijken)
  - [Profiel Beheren](#-profiel-beheren)
  - [Kalender Synchronisatie](#-kalender-synchronisatie) ⭐ NIEUW
- [Handleiding voor Admins](#handleiding-voor-admins)
  - [Verdi Integratie](#-verdi-integratie) ⭐ NIEUW
- [Handleiding voor Supervisors](#handleiding-voor-supervisors)
- [Handleiding voor IT Beheerders](#handleiding-voor-it-beheerders)
- [Veelgestelde Vragen](#veelgestelde-vragen)
- [Problemen Oplossen](#problemen-oplossen)
- [Systeem Updates](#-systeem-updates)

---

## 🚑 Inleiding

Het Ambulance Planning Systeem is een webapplicatie voor het beheren van shift planningen bij ambulance posten. Het systeem ondersteunt verschillende gebruikersrollen met elk hun eigen rechten en mogelijkheden.

**Gebruikersrollen:**

- **Ambulanciers**: Kunnen voorkeuren opgeven en hun planning bekijken
- **Admins**: Hebben volledige controle over hun station + alle ambulancier mogelijkheden
- **Supervisors**: Kunnen meerdere stations beheren/bekijken en cross-team functionaliteit instellen

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

⭐ **NIEUW: Cross-team Gebruikers en Halve Dagshiften**

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

### 📅 Kalender Synchronisatie

**Nieuw! Synchroniseer uw shifts automatisch met uw persoonlijke kalender**

#### Wat is Kalender Synchronisatie?

Met de kalender synchronisatie functie kunt u uw ingeplande shifts automatisch laten verschijnen in uw favoriete kalender app (Google Calendar, Outlook, Apple Agenda). Zodra u bent ingepland, verschijnt de shift in uw persoonlijke agenda.

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
- **Email**: Voor notificaties (in de toekomst is momenteel nog niet werkende) → Geef hier het volledige e-mail adres in bv. Jeroen.vanhoof@brandweerzonekempen.be
- **Rol**: Ambulancier of Admin
- **Werkuren**: Max aantal uren per maand dat je automatisch word ingepland (bijv. 24). Steeds met meervouden van 12h instellen
- **Beroepspersoneel**: Aanvinken voor beroeps personeel (max 1 shift/week). Dit zorgt ervoor dat mensen met opt-out max 1 keer per week worden ingepland
- **Heeft rijbewijs C** ⭐ NIEUW: Aanvinken als de ambulancier rijbewijs C heeft. Standaard staat dit **AAN**. Vink **UIT** voor ambulanciers zonder rijbewijs C.

**Opslaan en Testen:**
- Klik "Aanmaken"
- Test login met nieuwe gebruiker
- Deel inloggegevens veilig

#### Bestaande Gebruiker Bewerken

**Gebruiker Vinden**
- Gebruik zoekbalk voor naam/gebruikersnaam
- Klik bewerkknop (potlood icoon)

**Mogelijke Wijzigingen:**
- Namen en contactgegevens
- Aantal werkuren aanpassen
- Rol wijzigen (ambulancier ↔ admin)
- Professional status wijzigen
- Rijbewijs C status wijzigen ⭐ NIEUW

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

#### 👥 Beschikbaarheid Bekijken per Datum (NIEUW)

Als admin kunt u op elke datum in de planning klikken om te zien wie beschikbaar is voor die specifieke shift. Dit helpt u om:
- Snel te zien wie nog kan worden ingepland
- Beschikbare uren te controleren voordat u toewijst
- Weloverwogen planning beslissingen te nemen

**Hoe Gebruiken:**

1. **Klik op een datum** in de planning kalender
2. **Zie het beschikbaarheidsscherm** met drie belangrijke kolommen:
   - **Naam**: Naam van de ambulancier
   - **Status**: Beschikbaar (groen), Toegewezen (blauw), of Niet beschikbaar (grijs)
   - **Uren**: Hoeveel uur deze persoon wil werken deze maand
   - **Ingepland**: ⭐ NIEUW - Hoeveel uur deze persoon al is ingepland

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

#### 🚗 Rijbewijs C Validatie ⭐ NIEUW

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

### 🔗 Verdi Integratie

⭐ **NIEUW - Volledig Operationeel**

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
1. Klik op "Verdi Integratie" in het hoofdmenu
2. U ziet drie tabbladen: Configuratie, Gebruiker Mappings, Positie Mappings

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

**📥 Excel Import Functie (NIEUW)**

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

**💡 Visuele Status Indicator (NIEUW)**

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

**Q: Hoe werkt de automatische UPDATE detectie?** ⭐ NIEUW
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

**Q: Wat gebeurt er als ik een shift verwijder die al naar Verdi is gestuurd?** ⭐ NIEUW
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

## 👑 Handleiding voor Supervisors

**Supervisors hebben alle Admin rechten PLUS cross-station functionaliteit**

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
- Uur limieten instellen per station
- Flexibele inzet over posten heen

#### Gebruiker Koppelen aan Station

**Gebruiker Selecteren:**
- Zoek medewerker in alle stations
- Klik op gewenste persoon

**Station Toewijzing:**
- Selecteer extra station
- Stel uur limiet in (bijv. 24 uur/maand)
- Klik "Koppelen"

**Beheer Toewijzingen:**
- Bekijk alle station toewijzingen van een gebruiker
- Wijzig uur limieten door het getal aan te passen
- Verwijder cross-team toewijzingen met de **X knop** (zie hieronder)

#### Cross-Team Toewijzing Verwijderen ⭐ NIEUW

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

## 🖥️ Handleiding voor IT Beheerders

Deze sectie is bedoeld voor IT beheerders die verantwoordelijk zijn voor de technische infrastructuur en deployment van het Ambulance Planning Systeem.

### Windows Server Deployment

#### Auto-Start Configuratie

Voor automatische opstart na server herstart:

**Stap 1: PM2 Configuratie Kopiëren**
- Kopieer de `.pm2` map van de administrator naar `C:\etc\.pm2`
- Dit zorgt ervoor dat PM2 de applicatie na herstart kan herstellen

**Stap 2: Windows Task Scheduler Configureren**

Maak een nieuwe taak in Task Scheduler met de volgende instellingen:
- **Trigger**: Bij opstarten van systeem
- **Actie**: Start batch script (zie hieronder)
- **Log bestand**: `C:\ambulance-planning\logs\batch.log` (append mode)

**Start Script (`C:\ambulance-planning\start.bat`):**
```batch
@echo off
echo %date% %time% - Starting Ambulance Planning >> C:\ambulance-planning\logs\batch.log
cd C:\ambulance-planning
set NODE_ENV=production
pm2 resurrect
pm2 status
```

**Script Uitleg:**
- `echo %date% %time%`: Timestamp prefix voor elke startup
- `set NODE_ENV=production`: Productie modus activeren
- `pm2 resurrect`: PM2 processen herstellen
- `pm2 status`: Verificatie en logging

#### Update Procedure

**Benodigde Bestanden:**

Voor een volledige update, upload de volgende bestanden naar de server:

**Core Backend Bestanden:**
- `server/index.ts` - Hoofdserver bestand (cache control, routing)
- `shared/schema.ts` - Database schema definities
- `server/routes.ts` - API routes
- `server/storage.ts` - Database storage laag

**Frontend Bestanden** (indien gewijzigd):
- `client/src/pages/*.tsx` - Specifieke pagina's die zijn aangepast
- `client/src/lib/queryClient.ts` - React Query configuratie

**Update Commando's:**

Open een terminal op de server en voer de volgende commando's uit:

```batch
# 1. Navigeer naar applicatie directory
cd C:\ambulance-planning

# 2. Database schema synchroniseren (indien schema.ts gewijzigd)
npm run db:push
# Bij waarschuwing over data verlies, gebruik: npm run db:push --force

# 3. Applicatie opnieuw builden
npm run build

# 4. PM2 herstarten
pm2 restart all

# 5. Status verificatie
pm2 status
pm2 logs
```

**Verificatie Checklist:**
- [ ] PM2 status toont "online"
- [ ] Logs tonen geen errors
- [ ] Applicatie is bereikbaar via browser
- [ ] Login functionaliteit werkt
- [ ] Database connectie is actief

#### GitHub Synchronisatie Workflow

Deze sectie beschrijft hoe updates tussen de Replit development omgeving en de Windows Server productie omgeving worden gesynchroniseerd via GitHub.

**📋 Overzicht Workflow:**

```
Replit (Development) ←→ GitHub ←→ Windows Server (Production)
```

##### Van Replit naar Windows Server (Nieuwe Features/Fixes Deployen)

**Stap 1: Wijzigingen Pushen naar GitHub (op Replit)**

Controleer en commit wijzigingen voordat je pusht:

```bash
# Controleer status
git status

# Voeg wijzigingen toe (indien nodig)
git add .

# Commit wijzigingen (indien nodig)
git commit -m "Beschrijving van wijziging"

# Push naar GitHub
git push origin main
```

**Note**: Replit maakt soms automatisch commits, maar controleer altijd met `git status` of alles gecommit is voordat je pusht.

**Stap 2: Updates Ophalen op Windows Server**

Open Command Prompt op de Windows Server en voer de volgende stappen uit:

```batch
# 1. Backup je .env file (BELANGRIJK!)
cd C:\ambulance-planning
copy .env .env.backup

# 2. Haal updates op van GitHub
git pull origin main

# 3. Herstel je .env file (Replit versie is anders!)
copy .env.backup .env

# 4. Controleer .env settings
notepad .env
# Verifieer: NODE_ENV=production

# 5. Installeer eventuele nieuwe dependencies
npm install

# 6. Database schema updaten (indien nodig)
npm run db:push
# BELANGRIJK: Bij waarschuwing over data verlies:
# - Maak EERST een database backup via pgAdmin4
# - Controleer of data verlies acceptabel is
# - Dan pas: npm run db:push --force

# 7. Rebuild applicatie
npm run build

# 8. Herstart PM2
pm2 restart all

# 9. Verificatie
pm2 status
pm2 logs --lines 50
```

**⚠️ Belangrijke Punten:**

- **Altijd .env backuppen**: Replit gebruikt `NODE_ENV=development`, Windows Server heeft `NODE_ENV=production` nodig
- **Database URL**: Windows Server heeft lokale PostgreSQL, Replit gebruikt Neon Database
- **Bij schema wijzigingen**: Altijd `npm run db:push` uitvoeren

##### Van Windows Server naar Replit (Testing/Debugging)

Als je wijzigingen op Windows Server hebt gemaakt en deze wilt testen op Replit:

```batch
# Op Windows Server - push naar GitHub
git add .
git commit -m "Beschrijving van wijziging"
git push origin main
```

```bash
# Op Replit - haal updates op
git pull origin main

# Backup .env
cp .env .env.backup

# Na pull - herstel Replit .env
cp .env.backup .env
# Of verwijder .env en laat Replit het opnieuw aanmaken
```

##### Database Schema Updates

**Situatie: "column does not exist" error**

Dit betekent dat de database schema niet up-to-date is met de code.

**Oplossing:**

```batch
# Op Windows Server
cd C:\ambulance-planning
npm run db:push
```

**Als je een waarschuwing krijgt over data verlies:**

⚠️ **STOP EN CONTROLEER EERST:**

1. Maak een database backup via pgAdmin4:
   - Rechtermuisknop op database → Backup
   - Bewaar backup bestand op veilige locatie

2. Lees de waarschuwing zorgvuldig:
   - Welke kolommen worden verwijderd/gewijzigd?
   - Gaat er productiedata verloren?

3. Alleen als je zeker bent:
```batch
npm run db:push --force
```

4. Herstart applicatie:
```batch
pm2 restart all
```

**Wat doet `npm run db:push`?**
- Vergelijkt database schema met `shared/schema.ts`
- Voegt ontbrekende kolommen toe
- Update bestaande kolommen indien nodig
- Maakt nieuwe tabellen aan

**⚠️ Belangrijke Veiligheidsregels:**
- Maak ALTIJD een backup voordat je `--force` gebruikt
- Gebruik `--force` alleen na zorgvuldige controle
- Bij twijfel: neem contact op met ontwikkelaar
- Nooit handmatig SQL schrijven - gebruik altijd `npm run db:push`

##### Git Configuratie

**GitHub Credentials (eenmalig instellen):**

```batch
# Git gebruiker instellen
git config --global user.name "Jouw Naam"
git config --global user.email "jouw@email.com"

# GitHub token instellen (indien nodig)
# Gebruik Personal Access Token bij: 
# Settings → Developer settings → Personal access tokens
```

##### Troubleshooting GitHub Sync

**Probleem: Git push faalt met "Permission denied"**

Oplossingen:
1. Verifieer GitHub credentials
2. Controleer of je toegang hebt tot de repository
3. Gebruik Personal Access Token als wachtwoord

**Probleem: Merge conflicts na git pull**

Oplossingen:
1. Check welke bestanden conflicteren: `git status`
2. Voor .env conflicts: gebruik altijd de lokale versie (`git checkout --ours .env`)
3. Voor code conflicts: los handmatig op of reset: `git reset --hard origin/main`

**Probleem: .env file wordt overschreven na pull**

Oplossing:
```batch
# Herstel uit backup
copy .env.backup .env

# Of voeg .env toe aan .gitignore (eenmalig)
echo .env >> .gitignore
git add .gitignore
git commit -m "Ignore .env file"
git push
```

#### Bestandslocaties

**Configuratie:**
- PM2 configuratie: `C:\etc\.pm2`
- Environment variabelen: In PM2 ecosystem bestand of Windows environment

**Applicatie:**
- Hoofddirectory: `C:\ambulance-planning`
- Node modules: `C:\ambulance-planning\node_modules`
- Build output: `C:\ambulance-planning\dist`

**Logging:**
- Applicatie logs: `C:\ambulance-planning\logs\`
- Startup logs: `C:\ambulance-planning\logs\batch.log`
- PM2 logs: Via `pm2 logs` commando

**Database:**
- Connectie configuratie via DATABASE_URL environment variabele
- Database draait lokaal op de Windows server (PostgreSQL)
- Beheer via pgAdmin4 op de server

#### Troubleshooting

**Probleem: Applicatie start niet automatisch na herstart**

Oplossingen:
1. Controleer of PM2 configuratie in `C:\etc\.pm2` staat
2. Verifieer Task Scheduler taak configuratie
3. Check startup logs in `C:\ambulance-planning\logs\batch.log`
4. Test het start script handmatig

**Probleem: PM2 resurrect faalt**

Oplossingen:
1. Sla de huidige PM2 processen op: `pm2 save`
2. Controleer of `.pm2` folder correct permissions heeft
3. Herstart PM2 daemon: `pm2 kill` en dan `pm2 resurrect`

**Probleem: Database connectie errors na update**

Oplossingen:
1. Verifieer DATABASE_URL environment variabele
2. Test database connectie: `npm run db:push`
3. Controleer of PostgreSQL service draait op Windows
4. Check database toegang via pgAdmin4
5. Verifieer database credentials en poort (standaard 5432)

**Probleem: Build errors tijdens npm run build**

Oplossingen:
1. Verwijder node_modules: `rmdir /s /q node_modules`
2. Herinstalleer dependencies: `npm install`
3. Check TypeScript errors: `npm run type-check` (indien beschikbaar)
4. Verifieer Node.js versie: `node --version` (minimaal v18)

#### Onderhoud en Monitoring

**Dagelijkse Controles:**
- PM2 status: `pm2 status`
- Geheugengebruik: `pm2 monit`
- Error logs: `pm2 logs --err`

**Wekelijkse Taken:**
- Log rotatie controleren
- Disk space monitoring
- Backup verificatie

**Maandelijkse Taken:**
- Security updates Node.js/dependencies
- Database performance analyse
- Capaciteitsplanning review

#### Contact en Escalatie

**Bij Technische Problemen:**
1. Check eerst deze handleiding en troubleshooting sectie
2. Raadpleeg applicatie logs via `pm2 logs`
3. Controleer system event logs in Windows
4. Neem contact op met systeembeheerder indien probleem persisteert

**Kritieke Issues:**
- Database uitval: Immediate escalatie
- Applicatie volledig onbereikbaar: Hoge prioriteit
- Langzame performance: Normale prioriteit
- Minor bugs: Lage prioriteit

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

### ⭐ Versie 2025.5 - November 2025

**Beveiliging & Performance:**
- 🔒 **Enhanced Password Security** - Wachtwoorden worden nu veilig opgeslagen met scrypt hashing
  - Automatische migration van oude plaintext wachtwoorden naar scrypt hashes
  - Gebruikers kunnen gewoon inloggen met hun bestaande wachtwoorden
  - Bescherming tegen timing attacks en rainbow table aanvallen
  - Voldoet aan moderne security best practices (OWASP standaarden)
  - IT beheerders: zie `MIGRATION.md` voor upgrade instructies

- ⚡ **Bundle Size Optimalisatie** - Applicatie laadt nu ~70% sneller
  - Route-based code splitting: pagina's laden alleen wanneer je ernaar navigeert
  - Vendor chunk splitting voor betere browser caching
  - React.memo optimalisaties voor ScheduleGenerator en Statistics
  - Tree-shakeable imports voor kleinere bundle sizes
  - Productie bundle geanalyseerd en geoptimaliseerd
  - CSS purging verwijdert ongebruikte styles

- 🔐 **Session Security Hardening**
  - HttpOnly cookies voorkomt XSS aanvallen
  - Secure flag in productie (HTTPS only)
  - SameSite=lax bescherming tegen CSRF
  - Automatische session expiry detection met redirect naar login
  - Veilige API response logging (geen credentials in logs)

### Versie 2025.4 - November 2025

**Verdi Integratie (Backend Volledig):**
- 🔗 **Verdi Synchronisatie Backend** - Volledige API integratie met Verdi alarmsoftware
  - On-demand shift synchronisatie naar Verdi
  - Station-specifieke configuratie (URL, ShiftSheet GUID)
  - Person GUID mappings voor gebruikers (cross-station support)
  - Position GUID mappings per station
  - Comprehensive sync logging met status tracking (success/error/pending)
  - Toegangscontrole: Admins en Supervisors hebben volledige toegang
  - 🔍 **Zoekfunctie in Gebruiker Mappings** - Snel gebruikers vinden bij GUID koppeling
    - Zoekt op gebruikersnaam, voornaam, achternaam en volledige naam
    - Real-time filtering terwijl u typt
    - Null-safe implementatie (werkt ook met incomplete namen)

**Statistieken Verbeteringen:**
- 🔄 **Sorteerbare Kolommen** - Klik op elke kolom header om te sorteren
  - Sorteren op medewerker naam (alfabetisch)
  - Sorteren op alle voorkeuren kolommen (dag/nacht, week/weekend, totaal, percentage)
  - Sorteren op alle werkelijke shifts kolommen
  - Visuele sorteer-indicatoren (▲ ▼) tonen actieve kolom en richting
  - Toggle functionaliteit: klik opnieuw om sorteerrichting om te draaien
  - Percentage kolom sorteert correct op berekende waarde (voorkeuren/max uren)

**Verdi Sync Verbeteringen:**
- 🎯 **Flexibele Personeelsbezetting** - Intelligente handling van variabel aantal personen
  - Automatische groepering van shifts met meerdere personen
  - Shifts met 1 persoon: gebruikt alleen Positie 1 (Chauffeur)
  - Shifts met 2 personen: gebruikt Positie 1 (Chauffeur) + Positie 2 (Ambulancier)
  - Shifts met 0 personen: worden automatisch overgeslagen met duidelijke logging
  - Positie indices aangepast naar 1-based (Positie 1, 2) i.p.v. 0-based
  - Verbeterde error messages met specifieke positienamen (Chauffeur/Ambulancier)
  - Sync logs worden correct toegepast op alle shift records in een groep
- 🕐 **Correcte Tijdzones met Zomer/Wintertijd** - Shift tijden worden correct naar Verdi gestuurd
  - Dagshifts: 7:00-19:00 (altijd correct, ongeacht seizoen)
  - Nachtshifts: 19:00-7:00 (altijd correct, ongeacht seizoen)
  - Automatische detectie van zomertijd (CEST, UTC+2) en wintertijd (CET, UTC+1)
  - Timezone indicator wordt toegevoegd: +02:00 in zomer, +01:00 in winter
  - Shift tijden in Verdi matchen exact met tijden in planning systeem
  - Werkt correct bij overgang zomer/wintertijd (laatste zondag maart/oktober)

**Beveiliging:**
- 🔒 **Enhanced Authorization** - Alle Verdi endpoints beveiligd
  - Toegankelijk voor admins en supervisors
  - Voorkomt ongeautoriseerde toegang door ambulanciers
  - Veilige opslag van Verdi credentials

### Versie 2025.3 - Oktober 2025

**Technische Verbeteringen:**
- ⚡ **Cache Optimalisatie** - Snellere updates en betere browser prestaties
  - API responses worden niet meer gecached → wijzigingen zijn direct zichtbaar
  - React Query update interval verlaagd naar 5 seconden voor snellere gegevens refresh
  - Intelligente caching strategie voor static assets (JS/CSS/afbeeldingen)
  - Productie-ready cache headers voor optimale performance
  - Werkt betrouwbaar op alle browsers (Chrome, Firefox, Safari, Edge)
  
- 🔧 **Configuratie Flexibiliteit**
  - NODE_ENV environment variabele ondersteuning voor productie omgevingen
  - Verbeterde Windows Server deployment ondersteuning

**Gebruikerservaring:**
- Wijzigingen in planning en voorkeuren zijn binnen seconden zichtbaar
- Geen oude/verouderde data meer door browser caching
- Betere performance door optimale asset caching

### Versie 2025.2 - Oktober 2025

**Nieuwe Features:**
- 📅 **Kalender Synchronisatie** - Synchroniseer uw shifts automatisch met Google Calendar, Outlook of Apple Agenda
  - Persoonlijke, beveiligde kalender link per gebruiker
  - Automatische updates van shifts
  - Werkt op alle apparaten (telefoon, tablet, computer)
  - Eenvoudige handleiding voor alle populaire kalender apps

**Technische Verbeteringen:**
- 🕐 Verbeterde shift tijden weergave (onafhankelijk van tijdzone)
- 🔒 Beveiligde token-based authenticatie voor kalender feeds
- 📊 Nauwkeurigere dashboard waarschuwingen

### Versie 2025.1

**Features:**
- ✅ Feestdagen worden nu correct behandeld als weekend dagen
- ✅ Verbeterde veiligheidscontroles tegen opeenvolgende shifts
- ✅ Geavanceerde planning algoritmes voor betere verdeling
- ✅ Cross-team functionaliteit voor supervisors

### Geplande Updates

- 📧 Email notificaties voor planning wijzigingen
- 📱 Mobiele app ondersteuning
- 📊 Uitgebreide rapportage mogelijkheden
- 🔐 Twee-factor authenticatie (Azure-AD)
- 🖥️ Verdi Frontend Interface - Admin UI voor configuratie en synchronisatie

---

Deze handleiding is bijgewerkt voor versie 2025.4 van het Ambulance Planning Systeem. Voor de meest recente informatie en updates, raadpleeg uw systeembeheerder.