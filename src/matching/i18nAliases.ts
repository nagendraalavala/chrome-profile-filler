/**
 * Multilingual field name aliases.
 * Maps non-English form field labels to their English concept equivalents.
 * Used by the matching engine to understand forms in any language.
 */
export const I18N_FIELD_ALIASES: Record<string, string[]> = {
  // --- Spanish ---
  "firstName": [
    "nombre", "primer_nombre", "nombres",
  ],
  "lastName": [
    "apellido", "apellidos", "segundo_nombre", "apellido_paterno",
  ],
  "email": [
    "correo", "correo_electronico", "email",
  ],
  "phone": [
    "telefono", "celular", "movil", "numero_telefono",
  ],
  "address.line1": [
    "direccion", "calle", "domicilio",
  ],
  "address.city": [
    "ciudad", "localidad", "poblacion",
  ],
  "address.state": [
    "estado", "provincia", "region",
  ],
  "address.zip": [
    "codigo_postal", "cp",
  ],
  "address.country": [
    "pais",
  ],
  "workExperience.company": [
    "empresa", "compania", "organizacion",
  ],
  "workExperience.title": [
    "puesto", "cargo", "titulo_laboral",
  ],
  "education.school": [
    "escuela", "universidad", "colegio", "institucion",
  ],
  "education.degree": [
    "titulo", "grado", "carrera",
  ],

  // --- French ---
  "firstName.fr": [
    "prenom", "prenoms",
  ],
  "lastName.fr": [
    "nom", "nom_de_famille", "nom_famille",
  ],
  "email.fr": [
    "courriel", "adresse_email", "courrier_electronique",
  ],
  "phone.fr": [
    "portable", "numero_telephone", "tel",
  ],
  "address.line1.fr": [
    "adresse", "rue", "voie",
  ],
  "address.city.fr": [
    "ville", "commune",
  ],
  "address.zip.fr": [
    "code_postal",
  ],
  "address.country.fr": [
    "pays",
  ],
  "workExperience.company.fr": [
    "entreprise", "societe",
  ],
  "workExperience.title.fr": [
    "poste", "fonction", "intitule_poste",
  ],
  "education.school.fr": [
    "ecole", "universite", "etablissement",
  ],
  "education.degree.fr": [
    "diplome", "formation",
  ],

  // --- German ---
  "firstName.de": [
    "vorname",
  ],
  "lastName.de": [
    "nachname", "familienname", "zuname",
  ],
  "email.de": [
    "email_adresse",
  ],
  "phone.de": [
    "telefonnummer", "handy", "mobilnummer",
  ],
  "address.line1.de": [
    "strasse", "adresse", "anschrift",
  ],
  "address.city.de": [
    "stadt", "ort", "wohnort",
  ],
  "address.zip.de": [
    "postleitzahl", "plz",
  ],
  "address.country.de": [
    "land",
  ],
  "workExperience.company.de": [
    "firma", "unternehmen", "arbeitgeber",
  ],
  "workExperience.title.de": [
    "position", "beruf", "jobtitel", "berufsbezeichnung",
  ],
  "education.school.de": [
    "schule", "hochschule", "bildungseinrichtung",
  ],
  "education.degree.de": [
    "abschluss", "studiengang",
  ],

  // --- Portuguese ---
  "firstName.pt": [
    "nome", "primeiro_nome",
  ],
  "lastName.pt": [
    "sobrenome", "apelido",
  ],
  "phone.pt": [
    "telemovel", "numero_telefone",
  ],
  "address.line1.pt": [
    "endereco", "rua", "morada",
  ],
  "address.city.pt": [
    "cidade",
  ],
  "address.zip.pt": [
    "cep", "codigo_postal",
  ],

  // --- Hindi (transliterated) ---
  "firstName.hi": [
    "naam", "pehla_naam", "pratham_naam",
  ],
  "lastName.hi": [
    "upnaam", "kul_naam",
  ],
  "phone.hi": [
    "phone_number", "mobile_number", "durbhash",
  ],
  "address.line1.hi": [
    "pata", "sthan",
  ],
  "address.city.hi": [
    "shahar", "nagar",
  ],
  "address.state.hi": [
    "rajya", "pradesh",
  ],
  "address.country.hi": [
    "desh",
  ],

  // --- Chinese (Pinyin) ---
  "firstName.zh": [
    "xingming", "ming", "mingzi",
  ],
  "lastName.zh": [
    "xing",
  ],
  "email.zh": [
    "dianziyoujian", "youxiang",
  ],
  "phone.zh": [
    "dianhua", "shouji", "shoujihao",
  ],
  "address.line1.zh": [
    "dizhi", "jiedao",
  ],
  "address.city.zh": [
    "chengshi",
  ],
  "address.zip.zh": [
    "youzhengbianma", "youbian",
  ],
  "address.country.zh": [
    "guojia",
  ],

  // --- Japanese (Romaji) ---
  "firstName.ja": [
    "namae", "shimei", "mei",
  ],
  "lastName.ja": [
    "myoji", "sei",
  ],
  "phone.ja": [
    "denwa", "keitai",
  ],
  "address.line1.ja": [
    "jusho", "jyusho",
  ],
  "address.city.ja": [
    "shi", "toshi",
  ],

  // --- Korean (Romanized) ---
  "firstName.ko": [
    "irum", "ireum", "seongmyeong",
  ],
  "lastName.ko": [
    "seong",
  ],
  "phone.ko": [
    "jeonhwa", "hyudaepon",
  ],
  "address.line1.ko": [
    "juso",
  ],

  // --- Arabic (Transliterated) ---
  "firstName.ar": [
    "ism", "alism", "alismalawal",
  ],
  "lastName.ar": [
    "ism_alaaila", "alqab",
  ],
  "phone.ar": [
    "hatif", "jawwal", "raqam_alhatif",
  ],
  "address.line1.ar": [
    "unwan", "alarss",
  ],
  "address.city.ar": [
    "madina",
  ],
  "address.country.ar": [
    "balad", "dawla",
  ],
};

/**
 * Flatten the i18n aliases into the same format as FIELD_ALIASES.
 * Strips the locale suffix (e.g., "firstName.fr" -> "firstName").
 */
export function getI18nAliases(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, aliases] of Object.entries(I18N_FIELD_ALIASES)) {
    // Strip locale suffix: "firstName.fr" -> "firstName"
    const profileKey = key.replace(/\.(es|fr|de|pt|hi|zh|ja|ko|ar)$/, "");
    if (!result[profileKey]) {
      result[profileKey] = [];
    }
    result[profileKey].push(...aliases);
  }
  return result;
}
