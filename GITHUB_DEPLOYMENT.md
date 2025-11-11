# GitHub Deployment naar Windows Server

## Stap 1: Push de code naar GitHub (doe dit nu in Replit)

```bash
git add .
git commit -m "Verdi UPDATE detectie met snapshot data - fixes conflicts bij regenerate"
git push origin main
```

## Stap 2: Op Windows Server - Pull de nieuwe code

Open PowerShell op je Windows Server en ga naar de project folder:

```powershell
# Stop de applicatie
pm2 stop ambulance-planning

# Backup oude versie (voor de zekerheid)
cp -r dist dist.backup

# Pull nieuwe code van GitHub
git pull origin main

# Installeer dependencies (als er nieuwe zijn)
npm install

# Build de nieuwe versie
npm run build

# Start de applicatie opnieuw
pm2 restart ambulance-planning

# Bekijk de logs om te zien of alles werkt
pm2 logs ambulance-planning --lines 50
```

## Stap 3: Verifieer de nieuwe versie

Open een browser en ga naar:
```
http://jouw-server-ip:5000/api/version
```

Je zou moeten zien:
```json
{
  "schemaVersion": "1.1.0-snapshot-fix",
  "features": ["snapshot-based-update-detection", "legacy-log-cleanup"]
}
```

## Stap 4: BELANGRIJK - Eenmalige cleanup

**Optie A - Via Verdi interface (AANBEVOLEN)**:
1. Log in op Verdi alarm software
2. Verwijder ALLE mei 2026 shifts handmatig
3. Dit reset de Verdi database en voorkomt conflicts

**Optie B - Via cleanup button (als Verdi niet toegankelijk is)**:
1. Log in als admin in de applicatie
2. Ga naar **Verdi Settings**
3. Klik op **"Legacy Logs Opschonen"**
4. Wacht op bevestiging

## Stap 5: Synchroniseer opnieuw

1. Ga naar je planning pagina
2. Klik **"Synchroniseren naar Verdi"**
3. Alle shifts worden nu MET snapshot data aangemaakt
4. Console logs zouden moeten tonen: `isUpdate: false` (eerste keer is correct - het zijn nieuwe shifts)

## Stap 6: Test UPDATE functionaliteit

1. Wijzig **1 persoon** in een shift (vervang iemand door iemand anders)
2. Klik weer **"Synchroniseren naar Verdi"**
3. Nu zou je in de logs moeten zien:
   ```
   Found existing Verdi shift via date/time match for [datum]_[tijd]_[type]: [GUID]
   isUpdate: true
   ```
4. **GEEN conflict errors meer!** ✅

## Troubleshooting

**Als je nog steeds conflicts ziet:**
1. Check of de nieuwe versie draait: `/api/version` moet `1.1.0-snapshot-fix` tonen
2. Controleer PM2 logs: `pm2 logs ambulance-planning`
3. Doe cleanup opnieuw (stap 4)
4. Als alles faalt: verwijder ALLE shifts in Verdi en sync helemaal opnieuw

**Als de applicatie niet start:**
1. Check logs: `pm2 logs ambulance-planning --err`
2. Controleer database verbinding in console
3. Rollback: `pm2 stop ambulance-planning && rm -rf dist && mv dist.backup dist && pm2 restart ambulance-planning`

## Wat is er veranderd?

✅ Elke sync slaat nu shift details op in de database (datum, tijd, type)
✅ Bij volgende sync wordt dit gebruikt voor UPDATE detectie
✅ Ook na opnieuw genereren van planning werken UPDATEs
✅ Geen conflicts meer bij persoon wijzigen!

## Voor toekomstige updates

Vanaf nu is deployment simpel:
```powershell
cd C:\pad\naar\ambulance-planning
git pull origin main
npm install
npm run build
pm2 restart ambulance-planning
```

De UPDATE detectie werkt automatisch - geen handmatige cleanup meer nodig!
