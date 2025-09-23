# Vivaldi Patch Setup

Dieses Setup sorgt dafür, dass Vivaldi beim Start automatisch gepatcht wird,
falls noch kein Backup (`window.bak.html`) existiert.

## Ordnerstruktur

```
<root>\
  Application\ <Version>\ resources\vivaldi\window.html
  JS\ 
    patch.bat
    vivaldi_auto_patch.vbs
    README.md   (diese Datei)
```

- **`patch.bat`**  
  Enthält die eigentliche Patch-Logik:
  - beendet Vivaldi
  - zieht Änderungen (JS/CSS)
  - sichert `window.html` als `window.bak.html`
  - patched `window.html`
  - startet Vivaldi neu

- **`vivaldi_auto_patch.vbs`**  
  Wrapper für `patch.bat`, läuft **unsichtbar** und entscheidet:
  - wenn **kein** `window.bak.html` vorhanden → `patch.bat` wird gestartet
  - wenn **bereits gepatcht** → kein erneuter Patch (optional Start von Vivaldi, aktuell deaktiviert)

## Aufgabenplanung

Es existiert eine geplante Aufgabe **„Vivaldi Patch on Launch“**:

- **Trigger**: Security-Event 4688 (Start von `vivaldi.exe`)
- **Aktion**: Startet `vivaldi_auto_patch.vbs`
- **Einstellungen**:
  - „Mit höchsten Privilegien ausführen“
  - „Wenn die Aufgabe bereits ausgeführt wird → Keine neue Instanz starten“

## Wichtige Optionen in `vivaldi_auto_patch.vbs`

```vbscript
Const AutoStartVivaldi = False
```

- `False` (Standard): Vivaldi wird nur durch `patch.bat` neu gestartet,
  wenn ein Patch erforderlich ist.  
- `True`: Auch wenn schon gepatcht, startet Vivaldi sofort beim Trigger.

## Ablauf

1. Du startest Vivaldi (egal ob aus Taskleiste, Startmenü etc.)
2. Die Aufgabe erkennt den Start und führt `vivaldi_auto_patch.vbs` aus
3. `vivaldi_auto_patch.vbs` prüft:
   - **Backup fehlt** → `patch.bat` wird ausgeführt, patcht Vivaldi und startet ihn neu
   - **Backup vorhanden** → es passiert nichts
4. Ergebnis: Vivaldi läuft **immer nur in einer Instanz**, sauber gepatcht

---

## Aufgabenplanung Import/Export

### Aufgabe exportieren
1. Aufgabenplanung öffnen  
2. Aufgabe auswählen → Rechtsklick → **Exportieren…**  
3. XML-Datei speichern (z. B. `Vivaldi Patch on Launch.xml`)  

### Aufgabe importieren
1. Auf Ziel-PC Aufgabenplanung öffnen  
2. Rechtsklick auf „Aufgabenplanungsbibliothek“ → **Importieren…**  
3. XML-Datei auswählen  
4. Pfade in der Aufgabe anpassen (z. B. zu `vivaldi_auto_patch.vbs`), falls nötig  
5. Mit Admin-Rechten bestätigen  

---

## Fehlerbehebung

- **Fehlermeldung „vivaldi.exe konnte nicht gefunden werden“**  
  → In der Aufgabe prüfen, dass der Trigger-Pfad zur `vivaldi.exe` korrekt ist.  
  Typisch:  
  `C:\Users\<Name>\AppData\Local\Vivaldi\Application\vivaldi.exe`

- **Mehrere Instanzen von Vivaldi öffnen sich**  
  → sicherstellen, dass in der Aufgabe „Keine neue Instanz starten“ ausgewählt ist  
  → `AutoStartVivaldi = False` verwenden

- **Kein Patch trotz Neustart**  
  → prüfen, ob `window.bak.html` bereits existiert (dann patcht die BAT nicht mehr)
