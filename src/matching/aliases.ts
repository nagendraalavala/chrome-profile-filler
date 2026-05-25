/** Maps common form field names/patterns to dot-notation profile keys. */
export const FIELD_ALIASES: Record<string, string[]> = {
  // Personal
  "firstName": [
    "first_name", "fname", "first", "given_name", "givenname",
    "applicant_first_name", "candidate_first_name", "your_first_name",
  ],
  "lastName": [
    "last_name", "lname", "last", "surname", "family_name", "familyname",
    "applicant_last_name", "candidate_last_name", "your_last_name",
  ],
  "email": [
    "email_address", "emailaddress", "e_mail", "mail", "your_email",
    "applicant_email", "candidate_email", "contact_email", "primary_email",
  ],
  "phone": [
    "phone_number", "phonenumber", "telephone", "tel", "mobile",
    "mobile_number", "cell", "cell_phone", "contact_phone", "primary_phone",
  ],

  // Address
  "address.line1": [
    "street", "street_address", "address1", "address_line_1", "addressline1",
    "mailing_address", "home_address", "address_line1", "street_address_1",
    "residential_address", "primary_address",
  ],
  "address.line2": [
    "address2", "address_line_2", "addressline2", "apt", "apartment",
    "suite", "unit", "address_line2", "street_address_2",
  ],
  "address.city": [
    "city", "city_name", "town", "municipality", "locality",
    "candidate_city", "home_city", "mailing_city",
  ],
  "address.state": [
    "state", "province", "region", "state_name", "state_province",
    "candidate_state", "home_state", "mailing_state",
  ],
  "address.zip": [
    "zip", "zipcode", "zip_code", "postal_code", "postalcode", "postcode",
    "candidate_postal_code", "mailing_zip",
  ],
  "address.country": [
    "country", "country_name", "nation", "country_code",
    "candidate_country", "home_country", "mailing_country",
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
    "linkedin_link",
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
  ["email", "email_address", "emailaddress", "e_mail", "mail", "emailid", "email_id"],
  ["phone", "phone_number", "phonenumber", "telephone", "tel", "mobile",
   "cell", "cellphone", "cell_phone", "mobile_number", "contact_phone",
   "ph", "phn", "contact_number", "phone_no", "mob", "mobile_no"],

  // Address
  ["street", "street_address", "address1", "address_line_1", "line1",
   "address_line1", "addr", "addr1", "address", "mailing_address",
   "home_address", "residential_address", "primary_address", "addressline1"],
  ["address2", "addr2", "address_line_2", "line2", "apt", "apartment",
   "suite", "unit", "address_line2", "addressline2", "street_address_2"],
  ["city", "city_name", "town", "municipality", "locality"],
  ["state", "province", "region", "state_name", "state_province"],
  ["zip", "zipcode", "zip_code", "postal_code", "postalcode", "postcode",
   "pin", "pincode", "pin_code"],
  ["country", "country_name", "nation", "country_code"],

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
  ["ssn", "social_security_number", "social_security", "ss_number"],
  ["gender", "sex"],
  ["nationality", "citizenship"],
  ["marital_status", "marital", "relationship_status"],

  // Misc
  ["message", "comments", "notes", "additional_info", "remarks",
   "additional_comments", "other_info"],
  ["availability", "available", "notice_period", "start_availability"],
  ["referral", "referred_by", "referrer", "reference", "how_did_you_hear"],
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
};

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
};
