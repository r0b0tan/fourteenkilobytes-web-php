# 9. Konto und Sicherheit

[← Daten und Wartung](08-data-and-maintenance.md) · [Inhalt](README.md) · [Weiter: Fehlerbehebung →](10-troubleshooting.md)

fourteenkilobytes hat ein einziges Admin-Konto, geschützt durch ein Passwort.

## Anmelden und abmelden

- Eine Anmeldung gilt bis zu 24 Stunden. Danach wirst du gebeten, dich neu anzumelden.
- Zur Sicherheit wird die Anmeldung alle 15 Minuten im Hintergrund erneuert. Davon merkst du nichts.
- **Logout** beendet die Anmeldung sofort auf dem Server. Ein kopiertes Anmelde-Cookie ist danach wertlos.
- Nach fünf fehlgeschlagenen Anmeldeversuchen innerhalb von fünf Minuten werden weitere Versuche von derselben Adresse fünf Minuten lang blockiert.

## Passwort ändern

1. Öffne **Einstellungen → Allgemein → Passwort**.
2. Gib das **Aktuelle Passwort** und das **Neue Passwort** (mindestens 8 Zeichen) ein und wiederhole es.
3. Klicke auf **Passwort ändern**.

Du bleibst angemeldet. Alle anderen Anmeldungen, etwa auf einem anderen Rechner, werden sofort abgemeldet. Ändere dein Passwort, sobald du vermutest, dass jemand anderes es kennt.

## Verlorenes Passwort zurücksetzen

Eine Wiederherstellung per E-Mail gibt es nicht. Wenn du Zugriff auf den Server hast, kannst du ein neues Passwort setzen, ohne Inhalte zu verlieren. Beide Wege behalten deine Posts, Seiten und Einstellungen.

### Weg A: auf der Kommandozeile (empfohlen)

Führe auf dem Server im Verzeichnis deiner Installation aus:

```bash
read -rs -p "Neues Passwort: " PW; echo
printf '%s' "$PW" | php -r '$p = stream_get_contents(STDIN); $s = base64_encode(random_bytes(32)); echo json_encode(["salt" => $s, "apiToken" => bin2hex(hash_pbkdf2("sha256", $p, $s, 600000, 32, true)), "createdAt" => date("c")], JSON_PRETTY_PRINT), "\n";' > data/instance.json
unset PW
chmod 600 data/instance.json
rm -f data/sessions.json
```

Läuft der Webserver unter einem anderen Benutzer (etwa `www-data`), gib ihm die Datei zurück:

```bash
sudo chown www-data:www-data data/instance.json
```

Melde dich dann mit dem neuen Passwort an. Durch das Entfernen von `data/sessions.json` werden alle bestehenden Anmeldungen beendet.

### Weg B: den Setup-Assistenten erneut durchlaufen

1. Lösche auf dem Server die Datei `data/instance.json`.
2. Öffne sofort `/setup/` und gehe den Assistenten durch.

Der Assistent erkennt die vorhandenen Daten und zeigt „Existing settings and content were found.“ Er setzt nur das neue Passwort; Seitentitel, Sprache, Einstellungen und Inhalte bleiben, wie sie sind.

> Bis du den Assistenten abgeschlossen hast, könnte jeder, der `/setup/` öffnet, das Passwort festlegen. Schließe ihn also direkt nach dem Löschen ab, oder nimm Weg A, der diese Lücke nicht hat.

## Das Audit-Log

**Einstellungen → Logs** listet sicherheitsrelevante Ereignisse mit Zeit, Aktion, IP-Adresse und Details:

- erfolgreiche und fehlgeschlagene Anmeldungen, Abmeldungen
- Passwortänderungen und fehlgeschlagene Versuche
- veröffentlichte, gelöschte und endgültig gelöschte Inhalte
- Änderungen an Einstellungen, Zurücksetzen, Importe
- blockierte Anfragen (zu viele Versuche, ungültige Sicherheits-Token)

Sieh hinein, wenn du unerwünschte Zugriffe vermutest. **Exportieren** lädt das Log herunter, **Löschen** leert es (auf dem Server bleibt eine Sicherungskopie).

## Eingebauter Schutz

Hier musst du nichts einstellen; die Liste zeigt, was deine Website schützt:

- Passwörter werden nur als gesalzener Hash gespeichert (PBKDF2 mit 600.000 Runden).
- Jede Änderung im Admin-Bereich verlangt ein Sicherheits-Token, damit fremde Websites keine Aktionen in deinem Namen auslösen können.
- Die Admin-Seiten dürfen Skripte nur von deinem eigenen Server laden.
- Hochgeladene Backups und Einstellungen werden vor dem Speichern geprüft.
- Besucher bekommen nur statische HTML-Dateien. Die öffentliche Website hat keine Anmeldung, keine Formulare und keine Skripte, die man angreifen könnte.

## Betrieb hinter einem Proxy

Läuft deine Website hinter einem Reverse-Proxy, einem Load-Balancer oder einem CDN, scheint jede Anfrage von der Adresse des Proxys zu kommen. Eine Anmeldesperre nach Fehlversuchen träfe dann alle. Teile fourteenkilobytes mit der Einstellung `FKB_TRUSTED_PROXIES` mit, welche Adressen zu deinem Proxy gehören (einzelne Adressen oder Bereiche, durch Kommas getrennt):

| Server | Wo einstellen |
|---|---|
| Apache | `.htaccess` oder virtueller Host: `SetEnv FKB_TRUSTED_PROXIES "172.16.0.0/12"` |
| nginx mit PHP-FPM | Konfiguration des PHP-FPM-Pools: `env[FKB_TRUSTED_PROXIES] = 10.0.0.0/8` |
| Docker | Umgebung des Containers: `FKB_TRUSTED_PROXIES=172.16.0.0/12` |

Trage nur Adressen ein, die du kontrollierst. Die echte Besucheradresse wird dann aus dem Header `X-Forwarded-For` gelesen, aber nur bei Anfragen von diesen Adressen.

## HTTPS

Betreibe deine Website über HTTPS. Der Setup-Assistent warnt, wenn es fehlt. Sobald HTTPS zuverlässig läuft, kannst du zusätzlich HSTS einschalten; das weist Browser an, für deine Domain immer HTTPS zu verwenden. Ein auskommentiertes Beispiel steht in `.htaccess` und `nginx.conf.example`. Schalte es erst ein, wenn du dir sicher bist, denn Browser merken es sich lange.
