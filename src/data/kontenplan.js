// ══════════════════════════════════════════════════════════════════════════════
// ISB-KONTENPLAN BAYERN – Single Source of Truth (vollständig nach IKR)
// Felder: nr, kuerzel, name, klasse (IKR), gruppe, typ, klr?
//         minSchulklasse (Schuljahr 7–10), lernbereich (LehrplanPLUS 2026)
// ══════════════════════════════════════════════════════════════════════════════
export const KONTEN = [
  { nr:"0500", kuerzel:"GR",    name:"Grundstücke",                                          klasse:0, gruppe:"05 Grundstücke und Bauten",              typ:"aktiv",    minSchulklasse:7,  lernbereich:"LB3" },
  { nr:"0530", kuerzel:"BVG",   name:"Betriebs- und Verwaltungsgebäude",                     klasse:0, gruppe:"05 Grundstücke und Bauten",              typ:"aktiv",    minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"0700", kuerzel:"MA",    name:"Maschinen und Anlagen",                                klasse:0, gruppe:"07 Technische Anlagen und Maschinen",    typ:"aktiv",    minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"0840", kuerzel:"FP",    name:"Fuhrpark",                                             klasse:0, gruppe:"08 Betriebs- und Geschäftsausstattung",  typ:"aktiv",    minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"0860", kuerzel:"BM",    name:"Büromaschinen",                                        klasse:0, gruppe:"08 Betriebs- und Geschäftsausstattung",  typ:"aktiv",    minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"0870", kuerzel:"BGA",   name:"Büromöbel und Geschäftsausstattung",                   klasse:0, gruppe:"08 Betriebs- und Geschäftsausstattung",  typ:"aktiv",    minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"0890", kuerzel:"GWG",   name:"Geringwertige Wirtschaftsgüter",                       klasse:0, gruppe:"08 Betriebs- und Geschäftsausstattung",  typ:"aktiv",    minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"1500", kuerzel:"WP",    name:"Wertpapiere des Anlagevermögens",                      klasse:1, gruppe:"15 Wertpapiere des Anlagevermögens",     typ:"aktiv",    minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"2000", kuerzel:"R",     name:"Rohstoffe (Fertigungsmaterial)",                       klasse:2, gruppe:"20 Roh-, Hilfs-, Betriebsstoffe",        typ:"aktiv",    minSchulklasse:7,  lernbereich:"LB4" },
  { nr:"2010", kuerzel:"F",     name:"Fremdbauteile",                                        klasse:2, gruppe:"20 Roh-, Hilfs-, Betriebsstoffe",        typ:"aktiv",    minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"2020", kuerzel:"H",     name:"Hilfsstoffe",                                          klasse:2, gruppe:"20 Roh-, Hilfs-, Betriebsstoffe",        typ:"aktiv",    minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"2030", kuerzel:"B",     name:"Betriebsstoffe",                                       klasse:2, gruppe:"20 Roh-, Hilfs-, Betriebsstoffe",        typ:"aktiv",    minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"2400", kuerzel:"FO",    name:"Forderungen aus Lieferungen und Leistungen",           klasse:2, gruppe:"24 Forderungen aus L+L",                 typ:"aktiv",    minSchulklasse:8,  lernbereich:"LB4" },
  { nr:"2470", kuerzel:"ZWFO",  name:"Zweifelhafte Forderungen",                             klasse:2, gruppe:"24 Forderungen aus L+L",                 typ:"aktiv",    minSchulklasse:9,  lernbereich:"LB5" },
  { nr:"2600", kuerzel:"VORST", name:"Vorsteuer",                                            klasse:2, gruppe:"26 Sonstige Vermögensgegenstände",       typ:"aktiv",    minSchulklasse:8,  lernbereich:"LB6" },
  { nr:"2800", kuerzel:"BK",    name:"Bank (Kontokorrentkonto)",                             klasse:2, gruppe:"28 Flüssige Mittel",                     typ:"aktiv",    minSchulklasse:7,  lernbereich:"LB3" },
  { nr:"2880", kuerzel:"KA",    name:"Kasse",                                                klasse:2, gruppe:"28 Flüssige Mittel",                     typ:"aktiv",    minSchulklasse:7,  lernbereich:"LB3" },
  { nr:"2900", kuerzel:"ARA",   name:"Aktive Rechnungsabgrenzung",                           klasse:2, gruppe:"29 Aktive Rechnungsabgrenzung",          typ:"aktiv",    minSchulklasse:10, lernbereich:"LB1" },
  { nr:"3000", kuerzel:"EK",    name:"Eigenkapital",                                         klasse:3, gruppe:"30 Eigenkapital",                        typ:"passiv",   minSchulklasse:7,  lernbereich:"LB3" },
  { nr:"3001", kuerzel:"P",     name:"Privatkonto",                                          klasse:3, gruppe:"30 Eigenkapital",                        typ:"passiv",   minSchulklasse:9,  lernbereich:"LB1" },
  { nr:"3670", kuerzel:"EWB",   name:"Einzelwertberichtigung",                               klasse:3, gruppe:"36 Wertberichtigungen",                  typ:"passiv",   minSchulklasse:9,  lernbereich:"LB5" },
  { nr:"3680", kuerzel:"PWB",   name:"Pauschalwertberichtigung",                             klasse:3, gruppe:"36 Wertberichtigungen",                  typ:"passiv",   minSchulklasse:9,  lernbereich:"LB5" },
  { nr:"3900", kuerzel:"RST",   name:"Rückstellungen",                                       klasse:3, gruppe:"39 Sonstige Rückstellungen",             typ:"passiv",   minSchulklasse:10, lernbereich:"LB1" },
  { nr:"4200", kuerzel:"KBKV",  name:"Kurzfristige Bankverbindlichkeiten (bis 1 Jahr)",      klasse:4, gruppe:"42 Verbindlichkeiten bei Kreditinstituten", typ:"passiv", minSchulklasse:8,  lernbereich:"LB6" },
  { nr:"4250", kuerzel:"LBKV",  name:"Langfristige Bankverbindlichkeiten",                   klasse:4, gruppe:"42 Verbindlichkeiten bei Kreditinstituten", typ:"passiv", minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"4400", kuerzel:"VE",    name:"Verbindlichkeiten aus Lieferungen und Leistungen",     klasse:4, gruppe:"44 Verbindlichkeiten aus L+L",            typ:"passiv",   minSchulklasse:7,  lernbereich:"LB4" },
  { nr:"4800", kuerzel:"UST",   name:"Umsatzsteuer",                                         klasse:4, gruppe:"48 Sonstige Verbindlichkeiten",           typ:"passiv",   minSchulklasse:8,  lernbereich:"LB6" },
  { nr:"4830", kuerzel:"VFA",   name:"Sonstige Steuerverbindlichkeiten",                     klasse:4, gruppe:"48 Sonstige Verbindlichkeiten",           typ:"passiv",   minSchulklasse:9,  lernbereich:"LB6" },
  { nr:"4840", kuerzel:"VSV",   name:"Verbindlichkeiten gegenüber Sozialversicherungsträgern", klasse:4, gruppe:"48 Sonstige Verbindlichkeiten",        typ:"passiv",   minSchulklasse:9,  lernbereich:"LB5" },
  { nr:"4900", kuerzel:"PRA",   name:"Passive Rechnungsabgrenzung",                          klasse:4, gruppe:"49 Passive Rechnungsabgrenzung",         typ:"passiv",   minSchulklasse:10, lernbereich:"LB1" },
  { nr:"5000", kuerzel:"UEFE",  name:"Umsatzerlöse für eigene Erzeugnisse",                  klasse:5, gruppe:"50 Umsatzerlöse",                        typ:"ertrag",   klr:true,  minSchulklasse:8,  lernbereich:"LB4" },
  { nr:"5001", kuerzel:"EBFE",  name:"Erlösberichtigungen",                                  klasse:5, gruppe:"50 Umsatzerlöse",                        typ:"ertrag",              minSchulklasse:8,  lernbereich:"LB4" },
  { nr:"5400", kuerzel:"EMP",   name:"Erlöse aus Vermietung und Verpachtung",                klasse:5, gruppe:"54 Sonstige betriebliche Erträge",       typ:"ertrag",              minSchulklasse:9,  lernbereich:"LB5" },
  { nr:"5430", kuerzel:"ASBE",  name:"Andere sonstige betriebliche Erträge",                 klasse:5, gruppe:"54 Sonstige betriebliche Erträge",       typ:"ertrag",   klr:true,  minSchulklasse:8,  lernbereich:"LB4" },
  { nr:"5490", kuerzel:"PFE",   name:"Periodenfremde Erträge",                               klasse:5, gruppe:"54 Sonstige betriebliche Erträge",       typ:"ertrag",              minSchulklasse:9,  lernbereich:"LB5" },
  { nr:"5495", kuerzel:"EFO",   name:"Erträge aus abgeschriebenen Forderungen",              klasse:5, gruppe:"54 Sonstige betriebliche Erträge",       typ:"ertrag",   klr:true,  minSchulklasse:9,  lernbereich:"LB5" },
  { nr:"5650", kuerzel:"EAWP",  name:"Erträge aus dem Abgang von Wertpapieren des AV",       klasse:5, gruppe:"56 Erträge aus anderen Wertpapieren",   typ:"ertrag",              minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"5710", kuerzel:"ZE",    name:"Zinserträge",                                          klasse:5, gruppe:"57 Zinsen und ähnliche Erträge",         typ:"ertrag",              minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"5780", kuerzel:"DDE",   name:"Dividendenerträge",                                    klasse:5, gruppe:"57 Zinsen und ähnliche Erträge",         typ:"ertrag",              minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"6000", kuerzel:"AWR",   name:"Aufwendungen für Rohstoffe",                           klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:7,  lernbereich:"LB4" },
  { nr:"6001", kuerzel:"BZKR",  name:"Bezugskosten für Rohstoffe",                           klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6002", kuerzel:"NR",    name:"Nachlässe für Rohstoffe",                              klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6010", kuerzel:"AWF",   name:"Aufwendungen für Fremdbauteile",                       klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6011", kuerzel:"BZKF",  name:"Bezugskosten für Fremdbauteile",                       klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6012", kuerzel:"NF",    name:"Nachlässe für Fremdbauteile",                          klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6020", kuerzel:"AWH",   name:"Aufwendungen für Hilfsstoffe",                         klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6021", kuerzel:"BZKH",  name:"Bezugskosten für Hilfsstoffe",                         klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6022", kuerzel:"NH",    name:"Nachlässe für Hilfsstoffe",                            klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6030", kuerzel:"AWB",   name:"Aufwendungen für Betriebsstoffe",                      klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6031", kuerzel:"BZKB",  name:"Bezugskosten für Betriebsstoffe",                      klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6032", kuerzel:"NB",    name:"Nachlässe für Betriebsstoffe",                         klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6040", kuerzel:"AWVM",  name:"Aufwendungen für Verpackungsmaterial",                 klasse:6, gruppe:"60 Aufwand Roh-/Hilfs-/Betriebsstoffe", typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6140", kuerzel:"AFR",   name:"Ausgangsfrachten",                                     klasse:6, gruppe:"61 Aufwand bezogene Leistungen",         typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB4" },
  { nr:"6160", kuerzel:"FRI",   name:"Fremdinstandhaltung",                                  klasse:6, gruppe:"61 Aufwand bezogene Leistungen",         typ:"aufwand",             minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"6200", kuerzel:"LG",    name:"Löhne und Gehälter",                                   klasse:6, gruppe:"62 Löhne und Gehälter",                  typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB5" },
  { nr:"6400", kuerzel:"AGASV", name:"Arbeitgeberanteil zur Sozialversicherung",             klasse:6, gruppe:"64 Soziale Abgaben",                     typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB5" },
  { nr:"6520", kuerzel:"ABSA",  name:"Abschreibungen auf Sachanlagen",                       klasse:6, gruppe:"65 Abschreibungen",                      typ:"aufwand",  klr:true,  minSchulklasse:9,  lernbereich:"LB2" },
  { nr:"6540", kuerzel:"ABGWG", name:"Abschreibungen auf GWG",                              klasse:6, gruppe:"65 Abschreibungen",                      typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB2" },
  { nr:"6700", kuerzel:"AWMP",  name:"Mieten, Pachten",                                      klasse:6, gruppe:"67 Aufwand Rechte und Dienste",          typ:"aufwand",  klr:true,  minSchulklasse:7,  lernbereich:"LB3" },
  { nr:"6730", kuerzel:"GEB",   name:"Gebühren",                                             klasse:6, gruppe:"67 Aufwand Rechte und Dienste",          typ:"aufwand",  klr:true,  minSchulklasse:8,  lernbereich:"LB3" },
  { nr:"6750", kuerzel:"KGV",   name:"Kosten des Geldverkehrs",                              klasse:6, gruppe:"67 Aufwand Rechte und Dienste",          typ:"aufwand",  klr:true,  minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"6760", kuerzel:"PROV",  name:"Provisionen",                                          klasse:6, gruppe:"67 Aufwand Rechte und Dienste",          typ:"aufwand",  klr:true,  minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"6770", kuerzel:"RBK",   name:"Rechts- und Beratungskosten",                          klasse:6, gruppe:"67 Aufwand Rechte und Dienste",          typ:"aufwand",  klr:true,  minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"6800", kuerzel:"BMK",   name:"Büromaterial und Kleingüter",                          klasse:6, gruppe:"68 Aufwand Kommunikation",               typ:"aufwand",  klr:true,  minSchulklasse:7,  lernbereich:"LB3" },
  { nr:"6820", kuerzel:"KOM",   name:"Kommunikationsgebühren",                               klasse:6, gruppe:"68 Aufwand Kommunikation",               typ:"aufwand",  klr:true,  minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"6850", kuerzel:"REK",   name:"Reisekosten",                                          klasse:6, gruppe:"68 Aufwand Kommunikation",               typ:"aufwand",  klr:true,  minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"6870", kuerzel:"WER",   name:"Werbung",                                              klasse:6, gruppe:"68 Aufwand Kommunikation",               typ:"aufwand",  klr:true,  minSchulklasse:7,  lernbereich:"LB3" },
  { nr:"6900", kuerzel:"VBEI",  name:"Versicherungsbeiträge",                                klasse:6, gruppe:"69 Sonstige Aufwendungen",               typ:"aufwand",  klr:true,  minSchulklasse:7,  lernbereich:"LB3" },
  { nr:"6950", kuerzel:"ABFO",  name:"Abschreibungen auf Forderungen",                       klasse:6, gruppe:"69 Sonstige Aufwendungen",               typ:"aufwand",             minSchulklasse:9,  lernbereich:"LB5" },
  { nr:"6990", kuerzel:"PFAW",  name:"Periodenfremde Aufwendungen",                          klasse:6, gruppe:"69 Sonstige Aufwendungen",               typ:"aufwand",             minSchulklasse:9,  lernbereich:"LB5" },
  { nr:"7000", kuerzel:"GWST",  name:"Gewerbesteuer",                                        klasse:7, gruppe:"70 Betriebliche Steuern",                typ:"aufwand",             minSchulklasse:9,  lernbereich:"LB6" },
  { nr:"7020", kuerzel:"GRST",  name:"Grundsteuer",                                          klasse:7, gruppe:"70 Betriebliche Steuern",                typ:"aufwand",             minSchulklasse:9,  lernbereich:"LB6" },
  { nr:"7030", kuerzel:"KFZST", name:"Kraftfahrzeugsteuer",                                  klasse:7, gruppe:"70 Betriebliche Steuern",                typ:"aufwand",             minSchulklasse:9,  lernbereich:"LB6" },
  { nr:"7460", kuerzel:"VAWP",  name:"Verluste aus dem Abgang von Wertpapieren des AV",      klasse:7, gruppe:"74 Verluste aus Finanzanlagen",          typ:"aufwand",             minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"7510", kuerzel:"ZAW",   name:"Zinsaufwendungen",                                     klasse:7, gruppe:"75 Zinsen",                              typ:"aufwand",             minSchulklasse:9,  lernbereich:"LB3" },
  { nr:"8010", kuerzel:"SBK",   name:"Schlussbilanzkonto",                                   klasse:8, gruppe:"80 Ergebnisrechnungen",                  typ:"abschluss",           minSchulklasse:7,  lernbereich:"LB5" },
  { nr:"8020", kuerzel:"GUV",   name:"Gewinn- und Verlustkonto",                             klasse:8, gruppe:"80 Ergebnisrechnungen",                  typ:"abschluss",           minSchulklasse:7,  lernbereich:"LB5" },
];

// Schnelle Lookups (O(1) via Map)
const _KONTEN_BY_NR = new Map(KONTEN.map(k => [k.nr, k]));
export function getKonto(nr)    { return _KONTEN_BY_NR.get(nr) || null; }
export function getKürzel(nr)   { return _KONTEN_BY_NR.get(nr)?.kuerzel ?? nr; }
export function getVollname(nr) { return _KONTEN_BY_NR.get(nr)?.name    ?? null; }

// Kürzel-Lookups (für renderMitTooltips in BuchungsWerk.jsx)
export const _KUERZEL_SET   = new Set(KONTEN.map(k => k.kuerzel));
export const _KUERZEL_REGEX = /\b([A-ZÄÖÜ]{2,6}[0-9]?)\b/g;
export const _KUERZEL_TO_NR = new Map(KONTEN.map(k => [k.kuerzel, k.nr]));

export const KONTEN_KLASSEN = [
  { nr:0, label:"Klasse 0", titel:"Sachanlagen" },
  { nr:1, label:"Klasse 1", titel:"Finanzanlagen" },
  { nr:2, label:"Klasse 2", titel:"Umlaufvermögen & ARA" },
  { nr:3, label:"Klasse 3", titel:"Eigenkapital & Rückstellungen" },
  { nr:4, label:"Klasse 4", titel:"Verbindlichkeiten & PRA" },
  { nr:5, label:"Klasse 5", titel:"Erträge" },
  { nr:6, label:"Klasse 6", titel:"Betriebliche Aufwendungen" },
  { nr:7, label:"Klasse 7", titel:"Weitere Aufwendungen & Zinsen" },
  { nr:8, label:"Klasse 8", titel:"Ergebnisrechnungen" },
];

export const KONTEN_TYP_FARBEN = {
  aktiv:     { bg:"#dbeafe", text:"#1e40af", border:"#93c5fd",  label:"Aktiv" },
  passiv:    { bg:"#fce7f3", text:"#9d174d", border:"#f9a8d4",  label:"Passiv" },
  ertrag:    { bg:"#dcfce7", text:"#166534", border:"#86efac",  label:"Ertrag" },
  aufwand:   { bg:"#fee2e2", text:"#991b1b", border:"#fca5a5",  label:"Aufwand" },
  abschluss: { bg:"#fef9c3", text:"#854d0e", border:"#fde047",  label:"Abschluss" },
};
