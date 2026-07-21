"""Normalize messy breed names from City of Toronto open data.

The raw data has many issues:
- Truncated names with trailing dashes/parens
- Double spaces, inconsistent hyphenation
- Misspellings and typos
- Multiple variants of the same breed
"""

# Manual merge map: map known messy variants to a canonical name.
# Keys are UPPERCASE raw breed names, values are the canonical form.
BREED_ALIASES = {
    # ── Trailing-dash / trailing-paren truncations ──
    "BICHON FRISE -": "BICHON FRISE",
    "CHIHUAHUA SH -": "CHIHUAHUA SH",
    "DOMESTIC SHORT-": "DOMESTIC SH",
    "DOMESTIC SHORT": "DOMESTIC SH",
    "GERM SHEPHERD -": "GERM SHEPHERD",
    "LABRADOR RETR -": "LABRADOR RETR",
    "WEST HIGHLAND -": "WEST HIGHLAND",
    "GOLDENDOODLE (G": "GOLDENDOODLE",
    "BERNEDOODLE (BE": "BERNEDOODLE",
    "GOLDEN RETR - P": "GOLDEN RETR",
    "POODLE MIN - BI": "POODLE MIN",
    "RAT TERRIER - B": "RAT TERRIER",
    "ROTTWEILER - GE": "ROTTWEILER",
    "BOXER - CANE CO": "BOXER",
    "BOXER - MASTIFF": "BOXER",

    # ── Labrador variants ──
    "LABRADOR RETREI": "LABRADOR RETR",
    "LABRADOR RETRIE": "LABRADOR RETR",
    "LABRADOR RETRIV": "LABRADOR RETR",
    "LABADOR": "LABRADOR RETR",
    "LAB": "LABRADOR RETR",
    "RETRIEVER (LABR": "LABRADOR RETR",
    "CROSS LAB & GOL": "LABRADOR RETR",
    "YELLOW LABRADOR": "LABRADOR RETR",
    "SHEPHERD LAB MI": "LABRADOR RETR",
    "SHEPPARD LABRAD": "LABRADOR RETR",

    # ── Golden Retriever variants ──
    "GOLDEN RETREIVE": "GOLDEN RETR",
    "GOLDEN RITIVER": "GOLDEN RETR",
    "RETRIEVER (GOLD": "GOLDEN RETR",

    # ── German Shepherd variants ──
    "GERMAN SHEPARD": "GERM SHEPHERD",
    "GERMAN SHEPPARD": "GERM SHEPHERD",
    "GERMAN SHEPPHER": "GERM SHEPHERD",
    "GERMAN SHEPHERD": "GERM SHEPHERD",
    "KING SHEPPARD": "GERM SHEPHERD",

    # ── Australian variants (typos) ──
    "AUSTRAILAN LABR": "AUSTRALIAN LABR",
    "AUSTRIALIAN LAB": "AUSTRALIAN LABR",
    "AUSTRIALIA KELP": "AUST KELPIE",
    "AUSTRALIA SHEPP": "AUST SHEPHERD",
    "AUTRALIAN CATTL": "AUST CATTLE DOG",
    "AUSTRALIAN CATT": "AUST CATTLE DOG",
    "AUSTRALIAN SHEP": "AUST SHEPHERD",
    "AUSTRALIAN BERN": "AUSSIE BERNEDOO",
    "AUSTRALIAN COBB": "AUST CATTLE DOG",
    "MINI AUSTRALIAN": "AUST SHEPHERD",

    # ── Yorkshire Terrier ──
    "YORKSHIRE TERRI": "YORKSHIRE TERR",

    # ── Jack Russell ──
    "JACK RUSSEL": "JACK RUSSELL TE",
    "PARSON JACK RUS": "JACK RUSSELL TE",
    "PARSON RUSS TER": "JACK RUSSELL TE",
    "PARSON RUSSELL": "JACK RUSSELL TE",
    "MIX / JACK RUSS": "JACK RUSSELL TE",

    # ── Alaskan Malamute ──
    "ALASK MALAMUT": "ALASK MALAMUTE",

    # ── American Bully / Bulldog ──
    "AMERICAN STAFFO": "AMERICAN STAFF",
    "AMERICAN  BULLY": "AMERICAN BULLY",
    "AMERICAN  BULL": "AMERICAN BULLY",
    "STAFFORDSHIRE T": "STAFFORDSHIRE",
    "AMERICAN BULLDO": "AMER BULLDOG",
    "BULLDOG AMERICA": "AMER BULLDOG",
    "XL AMERICAN BUL": "AMERICAN BULLY",
    "XL BULLY AND CA": "XL BULLY",
    "AMERICAN BULL": "AMERICAN BULLY",
    "AMERICAN BULL D": "AMERICAN BULLY",
    "AMERICAN BULL T": "AMERICAN BULLY",
    "MICRO AMERICAN": "AMERICAN BULLY",
    "MICRO BULLY": "AMERICAN BULLY",
    "MICRO EXOTIC BU": "AMERICAN BULLY",
    "AMERICAN POCKET": "AMERICAN BULLY",
    "POCKET BULLY": "AMERICAN BULLY",

    # ── British / Domestic Shorthair ──
    "BRITISH SHORT H": "BRITISH SH",
    "SHORT HAIR DOME": "DOMESTIC SH",
    "SHORT HAIRED CA": "DOMESTIC SH",
    "SHORT-HAIRED DO": "DOMESTIC SH",
    "CLASSIC SHORT H": "DOMESTIC SH",
    "DOMESTIC LONGHA": "DOMESTIC LH",
    "LONG HAIR MEDIU": "DOMESTIC MH",
    "MEDIUM HAIR DOM": "DOMESTIC MH",
    "AMERICAN SHORT": "AMER SH",
    "DSH": "DOMESTIC SH",
    "ASH": "AMER SH",

    # ── West Highland ──
    "WEST HIGHLAND T": "WEST HIGHLAND",
    "WESTHIGHLAND TE": "WEST HIGHLAND",
    "WESTY TERRIER": "WEST HIGHLAND",

    # ── Shih Tzu variants ──
    "SHIATSU": "SHIH TZU",
    "SHITZUE": "SHIH TZU",
    "SHITZU & POODLE": "SHIH POO",
    "SHIH TZU POODLE": "SHIH POO",
    "SHIH TZU - POOD": "SHIH POO",
    "SHI-POO": "SHIH POO",
    "SHIH POO (SHIH": "SHIH POO",
    "SHIPOOJA": "SHIH POO",
    "MIX OF SHIHPOO": "SHIH POO",
    "SHIH TZU - PUG": "SHIH TZU MIX",
    "SHIH TZU TERRIE": "SHIH TZU MIX",
    "SHIH TZU X TOY": "SHIH TZU MIX",
    "MIX SHIH TZU BI": "SHIH TZU MIX",

    # ── Shih Poo / hyphen variants ──
    "SHIH-POO": "SHIH POO",
    "SHIHPOO": "SHIH POO",

    # ── Aussie Doodle variants ──
    "AUSSIE-DOODLE": "AUSSIE DOODLE",
    "AUSSIEDOODLE": "AUSSIE DOODLE",
    "AUSSI DOODLE": "AUSSIE DOODLE",
    "AUSSIDOODLE": "AUSSIE DOODLE",

    # ── Dachshund ──
    "DASCHUND": "DACHSHUND",
    "DACHSHUND (MINI": "DACHSHUND MIN",
    "DACHSHUND (STAN": "DACHSHUND",
    "MINIATURE DACHS": "DACHSHUND MIN",
    "STANDARD DACHSH": "DACHSHUND",
    "DACHSHUND X PAR": "DACHSHUND MIX",

    # ── Poodle ──
    "PUDDLE": "POODLE",
    "POODLE (MINIATU": "POODLE MIN",
    "POODLE (STANDAR": "POODLE STND",
    "MINIATURE POODL": "POODLE MIN",
    "STANDARD POODLE": "POODLE STND",
    "TOY POODLE": "POODLE TOY",

    # ── Schnauzer ──
    "MINIATURE SCHNA": "SCHNAUZER MIN",
    "STANDARD SCHNAU": "SCHNAUZER STAND",
    "SCHNOODLE (SCHN": "SCHNAUZER MIX",

    # ── Pharaoh Hound ──
    "PHAROAH HOUND": "PHARAOH HOUND",

    # ── Presa Canario ──
    "PRESSA CANARIO": "PRESA CANARIO",

    # ── Vizsla ──
    "VISZLA": "VIZSLA",
    "HUNGARIAN VISZL": "VIZSLA",
    "VIZSLA (SMOOTH)": "VIZSLA",

    # ── Wheaten Terrier ──
    "WHEATON TERRIER": "WHEATEN TERRIER",
    "WHEATON TERRIOR": "WHEATEN TERRIER",
    "SC WHEAT TERR": "WHEATEN TERRIER",

    # ── Terrier mix ──
    "TERRIOR MIX": "TERRIER MIX",
    "TERRIER AND YOR": "TERRIER MIX",

    # ── Unknown / No breed ──
    "UKNOWN": "UNKNOWN",
    "UNKOWN": "UNKNOWN",
    "UNSURE": "UNKNOWN",
    "NO BREED": "UNKNOWN",
    "BREED UNKNOWN": "UNKNOWN",

    # ── Mixed ──
    "MIXBREED": "MIXED",
    "MIXED RACE": "MIXED",
    "MIXED BREED": "MIXED",
    "MIXED BREAD": "MIXED",
    "MIXED BREED ROT": "MIXED",
    "MALTESE MIX PAR": "MALTESE MIX",
    "MIXED - BEAGLE": "MIXED",
    "MIXED FRENCH BU": "MIXED",
    "MIXED LAB CROSS": "MIXED",
    "MIXED MEDIUM": "MIXED",
    "MIXED POTCAKE": "POTCAKE",
    "1/2 MALTESE": "MALTESE MIX",
    "DOMESTIC MIXED": "MIXED",

    # ── Chihuahua ──
    "CHIHUAHUAS": "CHIHUAHUA",
    "CHUAHWA": "CHIHUAHUA",
    "CHIHUAHUA (LONG": "CHIHUAHUA LH",
    "CHIHUAHUA (SHOR": "CHIHUAHUA SH",
    "CHIHUAHUA AUSTR": "CHIHUAHUA MIX",
    "CHIHUAHUA X POM": "CHIHUAHUA MIX",
    "CHIHUAHUA TERRI": "CHIHUAHUA MIX",
    "SHORT HAIRED CH": "CHIHUAHUA SH",
    "LONG HAIRED CHI": "CHIHUAHUA LH",
    "MIX CHIHUAHUA A": "CHIHUAHUA MIX",

    # ── Border Collie ──
    "BORDER COLLIE S": "BORDER COLLIE",

    # ── Scottish Fold ──
    "SCOTTISH FOLD M": "SCOTTISH FOLD",
    "SCOTTISH STRAIG": "SCOTTISH FOLD",

    # ── Korean Jindo ──
    "KOREAN JINDO MI": "KOREAN JINDO",

    # ── Newfoundland ──
    "NEWFOUNDLAND LA": "NEWFOUNDLAND",

    # ── Bernese Mountain Dog ──
    "BERNESE MOUNTAI": "BERNESE MTN DOG",

    # ── Doberman ──
    "DOBERMAN PINSCH": "DOBERMAN PINSCHER",

    # ── Belgian variants ──
    "BELGIAN MALINOI": "BELG MALINOIS",
    "BELGIAN GROENEN": "BELG SHEEPDOG",
    "BELGIAN SHEPHER": "BELG MALINOIS",

    # ── Cavalier ──
    "CAVALIER SPAN": "CAVALIER SPANIEL",
    "CAVACHON (CAVAL": "CAVALIER SPANIEL",
    "CAVAPOO (CAVALI": "CAVAPOO",

    # ── Cockapoo ──
    "COCKAPOO (COCKE": "COCKAPOO",
    "COOKAPOO": "COCKAPOO",
    "MINI COCKAPOO": "COCKAPOO",

    # ── Cocker Spaniel ──
    "COCKER SPAN": "COCKER SPANIEL",
    "SPANIEL (AMERIC": "AMERICAN COCKER",
    "SPANIEL (ENGLIS": "ENG COCKER SPAN",
    "SPANIEL (FRENCH": "FRENCH SPANIEL",

    # ── Maltipoo ──
    "MALTIPOO (MALTE": "MALTIPOO",
    "MULITPOO": "MALTIPOO",
    "MULTESE": "MALTESE",

    # ── Morkie ──
    "MORKIE (MALTESE": "MORKIE",

    # ── Corgi ──
    "CORGI (CARDIGAN": "WELSH CORGI CAR",
    "CORGI (PEMBROKE": "WELSH CORGI PEM",
    "PEMBROKE WELSH": "WELSH CORGI PEM",
    "PEMBROOKE CORGI": "WELSH CORGI PEM",
    "CORGI-BLUE HEEL": "WELSH CORGI PEM",

    # ── Dogue de Bordeaux ──
    "DOGUE DE BORDX": "DOGUE DE BORDEA",

    # ── Lagotto ──
    "LAGOTTO ROMAGNO": "LAGOTTO",
    "LAGOTTO ROMANGO": "LAGOTTO",
    "LAGOTTO ROMNGIO": "LAGOTTO",

    # ── Coton de Tulear ──
    "COTON DU TULEAR": "COTON DE TULEAR",

    # ── Bouvier ──
    "BOUVIER DE FLAN": "BOUV FLANDRES",

    # ── Formosan ──
    "FORMOSA MOUNTAI": "FORMOSAN MOUNTA",

    # ── Potcake ──
    "POT CAKE": "POTCAKE",
    "POTCAKE - MIXED": "POTCAKE",
    "BAHAMIAN POTCAK": "POTCAKE",

    # ── Goldendoodle ──
    "GOLDEN DOODLE G": "GOLDENDOODLE",
    "MINI GOLDEN DOO": "GOLDENDOODLE",
    "MINI GOLDENDOOD": "GOLDENDOODLE",
    "MINIATURE GOLDE": "GOLDENDOODLE",

    # ── Bernedoodle ──
    "BERNADOODLE": "BERNEDOODLE",

    # ── Labradoodle ──
    "MINI DOODLE": "LABRADOODLE",

    # ── Aussiedoodle ──
    "MINI AUSSIEDOOD": "AUSSIE DOODLE",
    "AUSSIE BERNEDOO": "AUSSIE DOODLE",

    # ── English Bulldog ──
    "OLD ENG BULLDOG": "ENG BULLDOG",
    "OLDE ENGLISH BU": "ENG BULLDOG",
    "MINI BULLDOG": "ENG BULLDOG",
    "MINIATURE ENGLI": "ENG BULLDOG",
    "SWISS BULLDOG": "ENG BULLDOG",

    # ── Pit Bull ──
    "AMERICAN PIT BU": "PIT BULL",
    "AM PIT BULL TER": "PIT BULL",
    "PITBULL CANE CO": "PIT BULL MIX",
    "PITBULL CROSS T": "PIT BULL MIX",

    # ── Husky ──
    "HUSKY": "SIBERIAN HUSKY",
    "HUSKY ROTTTWEIL": "SIBERIAN HUSKY",

    # ── Pomeranian ──
    "POMSKY (POMERAN": "POMSKY",

    # ── Chug ──
    "CHUG (CHIHUAHUA": "CHUG",

    # ── Chorkie ──
    "CHORKIE (CHIHUA": "CHORKIE",

    # ── Shorkie ──
    "SHORKIE (SHIH T": "SHORKIE",

    # ── Pointer ──
    "POINTER (GERMAN": "GERM SH POINT",

    # ── Lhasa Apso ──
    "LHASO APSO (SHO": "LHASA APSO",

    # ── Dogo Argentino ──
    "DOGGO ARGENTINO": "DOGO ARGENTINO",
    "ARGENTINIAN DOG": "DOGO ARGENTINO",

    # ── Bichon ──
    "BICHON FRISE MI": "BICHON FRISE",
    "BICHON MALTES": "BICHON FRISE",
    "BICHON FRISÃ©": "BICHON FRISE",
    "BICHONPOO": "BICHON POODLE",

    # ── Neapolitan Mastiff ──
    "NEAPOLITAN MAST": "MASTIFF",
    "MASTIFF - LAB M": "MASTIFF",
    "MASTIFF BOXER M": "MASTIFF",
    "TIBETAN MASTIFF": "MASTIFF",
    "SPANISH MASTIFF": "MASTIFF",

    # ── Icelandic Sheepdog ──
    "ICELANDIC SHEEP": "ICELND SHEEPDOG",

    # ── Miniature Pinscher ──
    "MINIATURE PINCH": "MIN PINSCHER",
    "PINSHER": "MIN PINSCHER",
    "MINIATURE AMERI": "AMER ESKIMO",

    # ── Setter ──
    "SETTER (IRISH)": "IRISH SETTER",

    # ── Beagle ──
    "BEAGLE - PARSON": "BEAGLE MIX",
    "BEA TZU": "BEAGLE MIX",

    # ── Cat color-based (not breeds) ──
    "BLACK": "DOMESTIC SH",
    "BLACK WHITE SHO": "DOMESTIC SH",
    "CALICO": "DOMESTIC SH",
    "ORANGE TABBY": "DOMESTIC SH",
    "TABBY AMERICAN": "AMER SH",
    "TABBY CAT": "DOMESTIC SH",
    "TABBY DOMESTIC": "DOMESTIC SH",
    "TABBY SHORT HAI": "DOMESTIC SH",
    "TABY": "DOMESTIC SH",
    "TORTOISESHELL": "DOMESTIC SH",
    "TORTOISE": "DOMESTIC SH",
    "TUXEDO": "DOMESTIC SH",
    "TUXEDO CAT": "DOMESTIC SH",
    "STANDARD HOUSE": "DOMESTIC SH",
    "SNOWSHOE": "DOMESTIC SH",

    # ── Bengal ──
    "BENGAL CROSS": "BENGAL MIX",
    "MIX BENGAL TABB": "BENGAL MIX",

    # ── Siamese ──
    "SIAMESE + DOMES": "SIAMESE MIX",
    "SIAMESE AND TAB": "SIAMESE MIX",

    # ── Ragdoll ──
    "MIX RAGDOLL": "RAGDOLL MIX",

    # ── Maine Coon ──
    "MIX OF MAINE CO": "MAINE COON",

    # ── Persian ──
    "PERSIAN AND HIM": "PERSIAN",

    # ── Misc cat ──
    "INDIAN CAT": "DOMESTIC SH",

    # ── Misc dog typos / truncations ──
    "CAUCASIAN SHEPH": "CAUCASIAN SHEPHERD",
    "PICARDY SHEEPDG": "PICARDY SHEEPDOG",
    "MAREMMA SHEEPDG": "MAREMMA SHEEPDOG",
    "SHILOH SHEPHERD": "GERM SHEPHERD",
    "WHITE SHEPHERD": "GERM SHEPHERD",
    "ANATOL SHEPHERD": "ANATOLIAN SHEPHERD",
    "KALPIE": "AUST KELPIE",
    "GREEK SHEPPARD": "GREEK SHEPHERD",
    "TENN TR BRINDLE": "TREEING CUR",
    "TR WALKER HOUND": "TREEING WALKER HOUND",
    "BLACK/TAN HOUND": "HOUND",
    "ENGLISH HOUND": "HOUND",
    "COCONUT HOUND": "POTCAKE",
    "CHINESE SHARPEI": "CHINESE SHAR-PE",
    "MIX DE YORKSHIR": "YORKSHIRE TERR",
    "MIX CAROLINA HU": "CAROLINA DOG",
    "MALSHI": "MALTESE MIX",
    "YORKIE + BICHON": "YORKIE MALTESE",
    "INDIAN PARAIH": "INDIAN PARIAH D",
    "MEXICAN VILLAGE": "MEX HAIRLESS",
    "PERUVIAN HAIRLE": "MEX HAIRLESS",
    "MONGREL": "MIXED",
    "MUTT": "MIXED",
    "METIS": "MIXED",
    "INDIE": "MIXED",
    "ASTIPZE": "MIXED",
    "GANARASKAN": "MIXED",
    "CHINESE FIELD D": "CHINESE CRESTED",
    "BLACK MOUTH KER": "BLACK MOUTH CUR",
    "BLUE CANE CORSO": "CANE CORSO",
    "CANE CORSO MIX": "CANE CORSO",
    "PORTIDOODLE": "PORT WATER DOG",
    "SWISS RIDGE DOO": "MIXED",
    "MCNAB MIX": "MIXED",
    "SPITZ MIX": "RUSSIAN SPITZ",
    "HAVA - SHI": "HAVANESE",
    "BASSET LAB MIX": "BASSET HOUND MI",
    "EUROPEAN BOXER": "BOXER",
    "PATTERDALE TERR": "TERRIER",
}


def normalize_breed(raw_breed: str) -> str:
    """Return a cleaned breed name.

    1. Strip and uppercase
    2. Collapse multiple spaces
    3. Apply alias map
    """
    b = raw_breed.strip().upper()
    # Collapse multiple spaces
    while "  " in b:
        b = b.replace("  ", " ")

    # Check alias map
    if b in BREED_ALIASES:
        b = BREED_ALIASES[b]

    return b


def normalize_records(records: list[dict]) -> list[dict]:
    """Return a new list of records with normalized PRIMARY_BREED."""
    out = []
    for r in records:
        r2 = dict(r)
        r2["PRIMARY_BREED"] = normalize_breed(r["PRIMARY_BREED"])
        out.append(r2)
    return out
