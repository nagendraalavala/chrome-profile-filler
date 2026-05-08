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
};
