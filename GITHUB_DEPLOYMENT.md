# GitHub Deployment naar Windows Server

## BELANGRIJK: Debug Deployment voor Verdi GUID Issue

Deze deployment voegt **extra debug logging** toe om te ontdekken waarom Verdi geen `shiftGuid` terugstuurt.

## Stap 1: Push de code naar GitHub (doe dit nu in Replit)

```bash
git add .
git commit -m "Add debug logging for Verdi GUID response issue"
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

## Stap 4: DEBUG - Test Verdi synchronisatie en bekijk logs

**BELANGRIJK**: Deze deployment is puur voor debugging. Je hoeft NIETS te verwijderen in Verdi.

1. **Ga naar je planning pagina**
2. **Klik "Synchroniseren naar Verdi"** (1 keer)
3. **Bekijk direct de PM2 logs**:
   ```powershell
   pm2 logs ambulance-planning --lines 200
   ```

## Stap 5: Wat te zoeken in de logs

Als `shiftGuid` **WEL** wordt teruggegeven:
```
Verdi response: { result: 'Success', shiftGuid: 'abc-123-def-456', warnings: 0, errors: 0 }
```
✅ GEEN debug errors → de fix werkt al!

Als `shiftGuid` **NIET** wordt teruggegeven:
```
⚠️ CRITICAL: Verdi returned Success but NO shiftGuid!
Full Verdi response object: { ... }
Response keys: ['result', 'warningFeedback', 'errorFeedback', 'shift']
Response has these properties: { hasShift: true, hasId: false, ... }
```
🔍 Kopieer deze VOLLEDIGE debug output en stuur naar mij!

## Stap 6: Stuur debug output

**Kopieer de volledige console output** (vooral de regels met "CRITICAL" en "Full Verdi response") en deel deze met mij. Dan kan ik de definitieve fix maken.

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
