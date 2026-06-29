/** Maps common form field names/patterns to dot-notation profile keys. */
export const FIELD_ALIASES: Record<string, string[]> = {
  // Personal
  "firstName": [
    "first_name", "fname", "first", "given_name", "givenname",
    "applicant_first_name", "candidate_first_name", "your_first_name",
    "signup_first_name", "register_first_name", "checkout_first_name",
    "billing_first_name", "shipping_first_name",
  ],
  "lastName": [
    "last_name", "lname", "last", "surname", "family_name", "familyname",
    "applicant_last_name", "candidate_last_name", "your_last_name",
    "signup_last_name", "register_last_name", "checkout_last_name",
    "billing_last_name", "shipping_last_name",
  ],
  "email": [
    "email_address", "emailaddress", "e_mail", "mail", "your_email",
    "applicant_email", "candidate_email", "contact_email", "primary_email",
    "signup_email", "register_email", "checkout_email", "order_email",
    "billing_email", "account_email", "login_email",
  ],
  "phone": [
    "phone_number", "phonenumber", "telephone", "tel", "mobile",
    "mobile_number", "cell", "cell_phone", "contact_phone", "primary_phone",
    "shipping_phone", "billing_phone", "order_phone", "checkout_phone",
    "delivery_phone", "home_phone", "work_phone", "office_phone",
    "daytime_phone", "evening_phone", "personal_phone",
  ],

  // Address
  "address.line1": [
    "street", "street_address", "address1", "address_line_1", "addressline1",
    "mailing_address", "home_address", "address_line1", "street_address_1",
    "residential_address", "primary_address",
    "shipping_address", "shipping_street", "ship_address", "ship_street",
    "billing_address", "billing_street", "bill_address", "bill_street",
    "delivery_address", "delivery_street",
  ],
  "address.line2": [
    "address2", "address_line_2", "addressline2", "apt", "apartment",
    "suite", "unit", "address_line2", "street_address_2",
  ],
  "address.city": [
    "city", "city_name", "town", "municipality", "locality",
    "candidate_city", "home_city", "mailing_city",
    "shipping_city", "ship_city", "billing_city", "bill_city", "delivery_city",
  ],
  "address.state": [
    "state", "province", "region", "state_name", "state_province",
    "candidate_state", "home_state", "mailing_state",
    "shipping_state", "ship_state", "billing_state", "bill_state", "delivery_state",
  ],
  "address.zip": [
    "zip", "zipcode", "zip_code", "postal_code", "postalcode", "postcode",
    "candidate_postal_code", "mailing_zip",
    "shipping_zip", "ship_zip", "billing_zip", "bill_zip", "delivery_zip",
  ],
  "address.country": [
    "country", "country_name", "nation", "country_code",
    "candidate_country", "home_country", "mailing_country",
    "shipping_country", "ship_country", "billing_country", "bill_country", "delivery_country",
  ],

  // Work Experience
  "workExperience.company": [
    "company", "company_name", "employer", "organization", "org",
    "current_employer", "employer_name", "workplace",
  ],
  "workExperience.title": [
    "job_title", "jobtitle", "title", "designation", "role", "position",
    "current_title", "position_title", "work_title",
  ],
  "workExperience.years": [
    "years", "years_experience", "experience_years", "tenure",
    "years_of_experience", "work_years", "total_experience",
  ],

  // Education
  "education.school": [
    "school", "university", "college", "institution", "school_name",
    "university_name", "college_name", "alma_mater",
  ],
  "education.degree": [
    "degree", "degree_type", "qualification", "education_level",
    "highest_degree", "degree_name",
  ],
  "education.major": [
    "major", "field_of_study", "specialization", "concentration",
    "study_field", "discipline", "subject",
  ],
  "education.graduationYear": [
    "graduation_year", "grad_year", "year_graduated", "completion_year",
    "graduation_date", "year_of_graduation",
  ],

  // Social
  "social.linkedin": [
    "linkedin", "linkedin_url", "linkedinprofile", "linkedin_profile",
    "linkedin_link", "linked_in", "linkedin_mandatory",
  ],
  "social.github": [
    "github", "github_url", "githubprofile", "github_profile",
    "github_link", "github_username",
  ],
  "social.twitter": [
    "twitter", "twitter_url", "twitter_handle", "twitter_profile",
    "x_handle", "x_profile",
  ],
  "social.website": [
    "website", "personal_website", "portfolio", "portfolio_url",
    "homepage", "personal_url", "blog",
  ],

  // Emergency Contact
  "emergencyContact.name": [
    "emergency_contact_name", "emergency_name", "contact_person",
    "emergency_contact",
  ],
  "emergencyContact.phone": [
    "emergency_contact_phone", "emergency_phone", "emergency_number",
    "emergency_tel",
  ],
  "emergencyContact.relationship": [
    "emergency_contact_relationship", "relationship", "relation",
    "emergency_relation",
  ],

  // Banking
  "banking.bankName": [
    "bank_name", "bank", "financial_institution",
  ],
  "banking.accountNumber": [
    "account_number", "acct_number", "bank_account",
  ],
  "banking.routingNumber": [
    "routing_number", "routing", "aba_number", "sort_code",
  ],

  // Immigration / Visa
  "visaStatus": [
    "visa_status", "visa", "visa_type", "immigration_status",
    "work_authorization", "work_auth", "authorization_status",
  ],
  "passportNumber": [
    "passport_number", "pp_number", "passport_no", "pp_no",
    "passport_num", "travel_document_number", "pp_no_",
  ],
  "ssn": [
    "ssn", "social_security_number", "social_security", "ss_number",
    "last_4_ssn", "ssn_last_4", "last4ssn", "ssn4",
    "last_4_digits_of_ssn", "ssn_last_four",
  ],
  "availability": [
    "availability", "available", "start_date", "available_from",
    "notice_period", "earliest_start", "join_date",
  ],
  "currentLocation": [
    "current_location", "location", "current_city",
    "residing_city", "based_in", "work_location",
    "current_location_full_address", "current_address",
  ],
  "willingToRelocate": [
    "willing_to_relocate", "relocate", "relocation",
    "open_to_relocation", "open_to_relocate", "willing_to_move",
  ],
  "interviewAvailability": [
    "availability_for_interview", "interview_availability",
    "availability_for_interview_zoom_skype_webex",
    "interview_schedule",
  ],
  "skypeId": [
    "skype_id", "skype", "skype_handle", "skype_name",
  ],
  "contactNumber": [
    "contact_number", "phone", "phone_number", "mobile",
    "cell", "tel", "mobile_number", "cell_phone",
  ],
  "emailId": [
    "email_id", "email", "email_address", "e_mail",
  ],
  "dateOfBirth": [
    "date_of_birth", "dob", "birthday", "birth_date", "birthdate",
    "d_o_b", "born_on", "born_date",
  ],
  "age": [
    "age", "current_age", "your_age",
  ],
  "gender": [
    "gender", "sex", "male_female", "m_f",
  ],

  // Documents / Attachments
  "documents.resume": [
    "resume", "cv", "curriculum_vitae", "resume_upload", "cv_upload",
    "upload_resume", "upload_cv", "resume_file", "cv_file",
    "resume_attachment", "cv_attachment",
  ],
  "documents.coverLetter": [
    "cover_letter", "coverletter", "cover_letter_upload", "upload_cover_letter",
    "cover_letter_file", "motivation_letter", "application_letter",
  ],
  "documents.driversLicense": [
    "drivers_license", "dl", "driving_license", "license",
    "dl_upload", "upload_dl", "drivers_license_upload", "license_upload",
    "dl_file", "license_file", "id_document",
  ],
  "documents.passport": [
    "passport", "passport_upload", "upload_passport", "passport_file",
    "passport_copy", "travel_document",
  ],
  "documents.idCard": [
    "id_card", "national_id", "government_id", "photo_id",
    "id_upload", "upload_id", "identity_document", "id_proof",
  ],
  "documents.photo": [
    "photo", "profile_photo", "headshot", "avatar",
    "photo_upload", "upload_photo", "profile_picture", "picture",
  ],
  "documents.transcript": [
    "transcript", "academic_transcript", "transcript_upload",
    "upload_transcript", "grade_sheet", "marksheet",
  ],
  "documents.certificate": [
    "certificate", "certification", "cert_upload", "upload_certificate",
    "diploma", "degree_certificate",
  ],
  "documents.other": [
    "attachment", "file_upload", "upload_file", "document",
    "document_upload", "upload_document", "other_document",
    "additional_document", "supporting_document",
  ],

  // References
  "references": [
    "references", "reference", "professional_references",
    "reference_contact", "reference_name", "referees",
    "reference_details", "reference_information",
  ],
};

/**
 * Synonym groups for bidirectional concept matching.
 * All terms within a group are considered equivalent.
 * Both form field names AND user profile keys are resolved against these groups.
 * This allows users to use ANY key naming convention (e.g. "fname", "first_name",
 * "firstName", "given_name") and still match form fields intelligently.
 */
export const SYNONYM_GROUPS: string[][] = [
  // Name fields
  ["first_name", "fname", "fn", "first", "given_name", "givenname", "forename", "firstname"],
  ["last_name", "lname", "ln", "last", "surname", "family_name", "familyname", "lastname"],
  ["full_name", "name", "fullname", "complete_name", "your_name"],
  ["middle_name", "mname", "mn", "middle", "middlename"],
  ["preferred_name", "nickname", "nick", "alias", "display_name"],

  // Contact
  ["email", "email_address", "emailaddress", "e_mail", "mail", "emailid", "email_id", "e_mail_id"],
  ["phone", "phone_number", "phonenumber", "telephone", "tel", "mobile",
   "cell", "cellphone", "cell_phone", "mobile_number", "contact_phone",
   "ph", "phn", "contact_number", "phone_no", "mob", "mobile_no",
   "home_phone", "work_phone", "office_phone", "daytime_phone",
   "evening_phone", "personal_phone"],

  // Address (includes shipping/billing/delivery variants)
  ["street", "street_address", "address1", "address_line_1", "line1",
   "address_line1", "addr", "addr1", "address", "mailing_address",
   "home_address", "residential_address", "primary_address", "addressline1",
   "shipping_address", "shipping_street", "ship_address", "ship_street",
   "billing_address", "billing_street", "bill_address", "delivery_address"],
  ["address2", "addr2", "address_line_2", "line2", "apt", "apartment",
   "suite", "unit", "address_line2", "addressline2", "street_address_2"],
  ["city", "city_name", "town", "municipality", "locality",
   "shipping_city", "ship_city", "billing_city", "bill_city", "delivery_city"],
  ["state", "province", "region", "state_name", "state_province",
   "shipping_state", "ship_state", "billing_state", "bill_state", "delivery_state"],
  ["zip", "zipcode", "zip_code", "postal_code", "postalcode", "postcode",
   "pin", "pincode", "pin_code",
   "shipping_zip", "ship_zip", "billing_zip", "bill_zip", "delivery_zip"],
  ["country", "country_name", "nation", "country_code",
   "shipping_country", "ship_country", "billing_country", "bill_country"],

  // Work
  ["company", "company_name", "employer", "organization", "org",
   "employer_name", "workplace", "firm", "co", "corp", "current_company"],
  ["job_title", "jobtitle", "title", "designation", "role", "position",
   "job_role", "work_title", "current_title", "position_title"],
  ["years", "years_experience", "experience_years", "tenure",
   "years_of_experience", "yoe", "exp", "experience", "total_experience",
   "work_years"],
  ["salary", "compensation", "pay", "wage", "ctc", "current_salary",
   "expected_salary"],

  // Education
  ["school", "university", "college", "institution", "school_name",
   "university_name", "college_name", "alma_mater", "institute"],
  ["degree", "degree_type", "qualification", "education_level",
   "highest_degree", "degree_name"],
  ["major", "field_of_study", "specialization", "concentration",
   "discipline", "subject", "branch", "stream"],
  ["graduation_year", "grad_year", "year_graduated", "completion_year",
   "passing_year", "batch"],
  ["gpa", "grade", "cgpa", "grade_point_average", "percentage", "marks"],

  // Social
  ["linkedin", "linkedin_url", "linkedinprofile", "linkedin_profile",
   "linkedin_link", "li"],
  ["github", "github_url", "githubprofile", "github_profile",
   "github_username", "gh"],
  ["twitter", "twitter_url", "twitter_handle", "x_handle", "x_profile"],
  ["website", "personal_website", "portfolio", "portfolio_url",
   "homepage", "url", "blog", "personal_url", "web"],

  // Documents
  ["resume", "cv", "curriculum_vitae", "resume_file", "cv_file"],
  ["cover_letter", "coverletter", "motivation_letter", "application_letter"],
  ["drivers_license", "dl", "driving_license", "license",
   "driver_license", "licence"],
  ["passport", "travel_document", "passport_copy"],

  // Dates
  ["date_of_birth", "dob", "birthday", "birth_date", "birthdate", "bday"],
  ["start_date", "startdate", "from_date", "begin_date", "joining_date"],
  ["end_date", "enddate", "to_date", "finish_date", "leaving_date"],

  // Identity
  ["ssn", "social_security_number", "social_security", "ss_number",
   "last_4_ssn", "ssn_last_4", "last4ssn", "ssn4"],
  ["gender", "sex"],
  ["nationality", "citizenship"],
  ["marital_status", "marital", "relationship_status"],

  // Immigration / Visa
  ["visa_status", "visa", "visa_type", "immigration_status",
   "work_authorization", "work_auth", "authorization"],
  ["passport_number", "pp_number", "passport_no", "pp_no",
   "passport_num", "travel_document_number"],
  ["current_location", "location", "current_city", "residing_city",
   "based_in", "work_location", "current_location_full_address",
   "current_address"],

  // Relocation / Availability
  ["relocate", "relocation", "willing_to_relocate",
   "open_to_relocation", "open_to_relocate", "willing_to_move"],
  ["availability", "available", "notice_period", "start_availability",
   "available_from", "earliest_start", "availability_to_join",
   "availability_to_join_the_project", "join_date", "joining_date"],
  ["interview_availability", "availability_for_interview",
   "interview_schedule", "interview_time"],

  // Contact / Communication
  ["skype", "skype_id", "skype_handle", "skype_name"],
  ["contact_number", "phone", "phone_number", "mobile",
   "cell", "tel", "mobile_number", "cell_phone"],
  ["email_id", "email", "email_address", "e_mail"],

  // Experience & Education (long-form labels)
  ["total_years_of_experience", "years_of_experience", "experience",
   "total_experience", "years_experience", "work_experience"],
  ["qualification", "education", "degree", "qualification_with_passing_year",
   "qualification_with_passing_year_university_name",
   "highest_qualification"],

  // Identity / Security
  ["ssn_last_4_digits", "ssn", "social_security_number", "ssn_last_4",
   "last_4_ssn", "last4ssn"],

  // References
  ["references", "professional_references", "referees",
   "reference_details", "reference_information"],

  // Passport
  ["passport_number", "pp_number", "passport_no", "pp_no",
   "passport_num", "travel_document_number"],

  // Misc
  ["message", "comments", "notes", "additional_info", "remarks",
   "additional_comments", "other_info"],
  ["referral", "referred_by", "referrer", "how_did_you_hear"],

  // Social - extended
  ["linked_in", "linkedin", "linkedin_url", "linkedin_profile",
   "linkedin_mandatory", "li"],
];

/**
 * Common abbreviation expansions for token-level matching.
 * When a token matches an abbreviation, it is expanded before comparison.
 */
export const TOKEN_ABBREVIATIONS: Record<string, string[]> = {
  "fn": ["first", "name"],
  "ln": ["last", "name"],
  "mn": ["middle", "name"],
  "fname": ["first", "name"],
  "lname": ["last", "name"],
  "mname": ["middle", "name"],
  "addr": ["address"],
  "addr1": ["address", "1"],
  "addr2": ["address", "2"],
  "ph": ["phone"],
  "phn": ["phone"],
  "mob": ["mobile"],
  "tel": ["telephone"],
  "co": ["company"],
  "corp": ["company"],
  "org": ["organization"],
  "exp": ["experience"],
  "yoe": ["years", "experience"],
  "dob": ["date", "birth"],
  "ssn": ["social", "security"],
  "dl": ["drivers", "license"],
  "cv": ["resume"],
  "gpa": ["grade", "point"],
  "li": ["linkedin"],
  "gh": ["github"],
  "url": ["website"],
  "apt": ["apartment"],
  "uni": ["university"],
  "grad": ["graduation"],
  "bday": ["birthday"],
  "ref": ["reference"],
  "msg": ["message"],
  "info": ["information"],
  "num": ["number"],
  "no": ["number"],
  "yr": ["year"],
  "yrs": ["years"],
  "pp": ["passport"],
  "id": ["identification"],
  "auth": ["authorization"],
  "ship": ["shipping"],
  "bill": ["billing"],
  "del": ["delivery"],
  "acct": ["account"],
  "pwd": ["password"],
  "usr": ["username"],
  "cc": ["credit", "card"],
  "cvc": ["card", "verification"],
  "cvv": ["card", "verification"],
};

/**
 * Composite field rules for combining/splitting profile fields.
 * When a form asks for "full name" but profile has "firstName" + "lastName",
 * the engine combines them. When profile has "fullName" but form asks for
 * "firstName" and "lastName", the engine splits it.
 */
export interface CompositeRule {
  /** Concept names this rule matches (form field tokens) */
  concepts: string[];
  /** Profile keys to combine (in order), with separator */
  sourceKeys: string[];
  /** How to join the values */
  separator: string;
  /** For splitting: regex to extract parts from a composite value */
  splitPattern?: RegExp;
  /** For splitting: which target keys get which capture groups */
  splitTargets?: string[];
}

export const COMPOSITE_RULES: CompositeRule[] = [
  // full_name = first_name + last_name
  {
    concepts: ["full_name", "name", "fullname", "your_name", "applicant_name", "candidate_name", "display_name"],
    sourceKeys: ["firstName", "lastName"],
    separator: " ",
    splitPattern: /^(\S+)\s+(.+)$/,
    splitTargets: ["firstName", "lastName"],
  },
  // full_name with middle = first + middle + last
  {
    concepts: ["full_name_middle"],
    sourceKeys: ["firstName", "middleName", "lastName"],
    separator: " ",
  },
  // full_address = line1, city, state zip
  {
    concepts: ["full_address", "complete_address", "mailing_address_full"],
    sourceKeys: ["address.line1", "address.city", "address.state", "address.zip"],
    separator: ", ",
  },
  // city_state = city, state
  {
    concepts: ["city_state", "city_and_state", "location"],
    sourceKeys: ["address.city", "address.state"],
    separator: ", ",
  },
  // city_state_zip = city, state zip
  {
    concepts: ["city_state_zip"],
    sourceKeys: ["address.city", "address.state", "address.zip"],
    separator: ", ",
  },
  // phone with country code
  {
    concepts: ["full_phone", "phone_with_code", "international_phone"],
    sourceKeys: ["phoneCountryCode", "phone"],
    separator: "",
  },
  // full_name with suffix (e.g. "Dr. John Doe Jr.")
  {
    concepts: ["full_name_with_title", "name_with_prefix"],
    sourceKeys: ["prefix", "firstName", "lastName"],
    separator: " ",
  },
];

/** Section heading keywords that boost scores for grouped fields. */
export const SECTION_BOOST_KEYWORDS: Record<string, string[]> = {
  "address": [
    "address", "mailing address", "shipping address", "billing address",
    "home address", "residential address", "location",
  ],
  "workExperience": [
    "employment", "work experience", "work history", "job history",
    "professional experience", "current employment", "employer",
  ],
  "education": [
    "education", "academic", "school", "university", "qualification",
    "degree", "academic background",
  ],
  "social": [
    "social", "social media", "social links", "online profiles", "links",
  ],
  "emergencyContact": [
    "emergency", "emergency contact", "emergency information",
  ],
  "banking": [
    "banking", "bank", "payment", "financial", "direct deposit",
  ],
  "documents": [
    "documents", "attachments", "uploads", "files", "upload documents",
    "required documents", "supporting documents",
  ],
  "shipping": [
    "shipping", "ship to", "shipping address", "shipping information",
    "delivery", "delivery address", "deliver to", "shipping details",
  ],
  "billing": [
    "billing", "bill to", "billing address", "billing information",
    "payment address", "billing details", "invoice address",
  ],
  "checkout": [
    "checkout", "order", "purchase", "buy", "cart", "payment",
    "complete order", "place order", "order summary",
  ],
  "signup": [
    "sign up", "register", "create account", "join", "get started",
    "registration", "new account", "create your account",
  ],
  "contact": [
    "contact", "contact us", "get in touch", "contact information",
    "contact details", "reach us", "send message", "inquiry",
  ],
};

// ---------------------------------------------------------------------------
// Form type detection
// ---------------------------------------------------------------------------

export type FormType =
  | "checkout"
  | "signup"
  | "login"
  | "contact"
  | "job_application"
  | "shipping"
  | "billing"
  | "unknown";

interface FormTypeSignal {
  type: FormType;
  keywords: string[];
}

const FORM_TYPE_SIGNALS: FormTypeSignal[] = [
  {
    type: "checkout",
    keywords: [
      "checkout", "place order", "complete purchase", "order summary",
      "payment method", "pay now", "buy now", "add to cart",
      "credit card", "card number", "expiration", "cvv", "cvc",
    ],
  },
  {
    type: "shipping",
    keywords: [
      "shipping address", "ship to", "delivery address", "shipping method",
      "shipping information", "deliver to", "shipping details",
    ],
  },
  {
    type: "billing",
    keywords: [
      "billing address", "bill to", "billing information",
      "payment address", "invoice address", "billing details",
    ],
  },
  {
    type: "signup",
    keywords: [
      "sign up", "register", "create account", "create your account",
      "join now", "get started", "new account", "registration",
      "confirm password", "create password", "username",
    ],
  },
  {
    type: "login",
    keywords: [
      "sign in", "log in", "login", "welcome back",
      "forgot password", "remember me",
    ],
  },
  {
    type: "contact",
    keywords: [
      "contact us", "send message", "get in touch", "inquiry",
      "contact form", "reach out", "leave a message", "your message",
    ],
  },
  {
    type: "job_application",
    keywords: [
      "apply now", "job application", "submit application", "resume",
      "cover letter", "work experience", "education history",
      "years of experience", "current employer", "linkedin profile",
    ],
  },
];

/**
 * Detect the type of form on the page based on surrounding text signals.
 * Analyzes form labels, buttons, headings, and nearby text.
 */
export function detectFormType(formFields: { name: string; label: string; placeholder: string }[]): FormType {
  const signals: string[] = [];

  // Collect signals from form fields
  for (const field of formFields) {
    if (field.name) signals.push(field.name.toLowerCase());
    if (field.label) signals.push(field.label.toLowerCase());
    if (field.placeholder) signals.push(field.placeholder.toLowerCase());
  }

  // Collect signals from page headings and buttons
  const headings = document.querySelectorAll("h1, h2, h3, h4, legend, .form-title, .section-title");
  headings.forEach((el) => {
    const text = el.textContent?.trim().toLowerCase();
    if (text) signals.push(text);
  });

  const buttons = document.querySelectorAll("button, input[type='submit'], [role='button']");
  buttons.forEach((el) => {
    const text = (el.textContent?.trim() || (el as HTMLInputElement).value || "").toLowerCase();
    if (text) signals.push(text);
  });

  const joinedText = signals.join(" ");

  // Score each form type
  let bestType: FormType = "unknown";
  let bestScore = 0;

  for (const signal of FORM_TYPE_SIGNALS) {
    let score = 0;
    for (const keyword of signal.keywords) {
      if (joinedText.includes(keyword)) {
        score += keyword.split(" ").length; // multi-word keywords score higher
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestType = signal.type;
    }
  }

  return bestType;
}

/**
 * Get boosted confidence for a match based on detected form type.
 * Returns a multiplier (1.0 = no boost, >1.0 = boosted).
 */
export function getFormTypeBoost(formType: FormType, profileKey: string): number {
  const key = profileKey.toLowerCase();

  switch (formType) {
    case "checkout":
    case "shipping":
    case "billing":
      // Boost address, name, phone, email fields on checkout/shipping/billing forms
      if (key.includes("address") || key.includes("city") || key.includes("state") ||
          key.includes("zip") || key.includes("country") || key.includes("phone") ||
          key.includes("email") || key.includes("firstname") || key.includes("lastname") ||
          key.includes("name")) {
        return 1.15;
      }
      break;
    case "signup":
      // Boost name, email, phone on signup forms
      if (key.includes("email") || key.includes("firstname") || key.includes("lastname") ||
          key.includes("name") || key.includes("phone")) {
        return 1.15;
      }
      break;
    case "contact":
      // Boost name, email, phone, message on contact forms
      if (key.includes("email") || key.includes("name") || key.includes("phone") ||
          key.includes("message")) {
        return 1.15;
      }
      break;
    case "job_application":
      // Boost work, education, document fields on job forms
      if (key.includes("work") || key.includes("education") || key.includes("resume") ||
          key.includes("linkedin") || key.includes("experience") || key.includes("documents")) {
        return 1.15;
      }
      break;
  }

  return 1.0;
}
