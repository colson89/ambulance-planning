# Windows Server Deployment Instructies

## Stap 1: Maak nieuwe build
```bash
npm run build
```

## Stap 2: Stop de applicatie op Windows Server
```powershell
pm2 stop ambulance-planning
```

## Stap 3: Upload de volgende bestanden naar Windows Server:
- `dist/index.js` (nieuwe backend met snapshot fix)
- `dist/public/` (hele folder met frontend)

## Stap 4: Start de applicatie opnieuw
```powershell
pm2 restart ambulance-planning
```

## Stap 5: Cleanup legacy logs (EENMALIG!)
1. Log in als admin gebruiker
2. Ga naar **Verdi Settings** pagina
3. Klik op de knop **"Legacy Logs Opschonen"**
4. Wacht tot je een melding ziet: "X legacy logs verwijderd"

## Stap 6: Synchroniseer opnieuw
1. Ga naar je planning pagina
2. Klik op **"Synchroniseren naar Verdi"**
3. Nu wordt alles correct met UPDATEs gestuurd!

## Verifieer dat het werkt:
Je zou in de console logs moeten zien:
```
Found existing Verdi shift via date/time match for [datum]_[tijd]_[type]: [GUID]
isUpdate: true
```

In plaats van:
```
isUpdate: false
```

## Troubleshooting:
- Als je nog steeds conflicts ziet → herhaal stap 5 (legacy logs cleanup)
- Als cleanup niet werkt → verwijder alle shifts manueel in Verdi en sync opnieuw
