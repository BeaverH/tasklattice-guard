// Reviewed Default Rule selection. Catalog additions are opt-in; order is executable behavior.
export const defaultPolicySelection = [
  {
    "policyId": "builtin-indirect-prompt-injection",
    "ruleIds": [
      "boundary/indirect-injection"
    ]
  },
  {
    "policyId": "builtin-memory-poisoning",
    "ruleIds": [
      "boundary/memory-poisoning"
    ]
  },
  {
    "policyId": "local-content-safety",
    "ruleIds": [
      "category/denied_insults",
      "category/harm_toxic_abuse",
      "category/harmful_violence",
      "category/harmful_self_harm",
      "category/harmful_child_safety",
      "category/harmful_illegal_weapons",
      "category/bias_gender",
      "category/bias_racial",
      "category/bias_religious",
      "category/bias_sexual_orientation"
    ]
  },
  {
    "policyId": "local-injection-protection",
    "ruleIds": [
      "prompt-injection-blocker/blocked-word-1",
      "prompt-injection-blocker/blocked-word-2",
      "prompt-injection-blocker/blocked-word-3",
      "prompt-injection-blocker/blocked-word-4",
      "prompt-injection-blocker/blocked-word-5",
      "prompt-injection-blocker/blocked-word-6",
      "prompt-injection-blocker/blocked-word-7",
      "prompt-injection-blocker/blocked-word-8",
      "prompt-injection-blocker/blocked-word-9",
      "prompt-injection-blocker/blocked-word-10",
      "prompt-injection-blocker/blocked-word-11",
      "prompt-injection-blocker/blocked-word-12",
      "prompt-injection-blocker/blocked-word-13",
      "prompt-injection-blocker/blocked-word-14",
      "sql-injection-blocker/blocked-word-1",
      "sql-injection-blocker/blocked-word-2",
      "sql-injection-blocker/blocked-word-3",
      "sql-injection-blocker/blocked-word-4",
      "sql-injection-blocker/blocked-word-5",
      "sql-injection-blocker/blocked-word-6",
      "sql-injection-blocker/blocked-word-7",
      "sql-injection-blocker/blocked-word-8",
      "code-injection-blocker/blocked-word-3",
      "code-injection-blocker/blocked-word-4",
      "code-injection-blocker/blocked-word-5",
      "code-injection-blocker/blocked-word-6",
      "code-injection-blocker/blocked-word-7",
      "application/active-html",
      "application/template-traversal",
      "category/prompt_injection_jailbreak",
      "category/prompt_injection_data_exfiltration",
      "category/prompt_injection_sql",
      "category/prompt_injection_malicious_code",
      "category/prompt_injection_system_prompt"
    ]
  },
  {
    "policyId": "local-credentials",
    "ruleIds": [
      "credentials-api-keys/aws_access_key",
      "credentials-api-keys/aws_secret_key",
      "credentials-api-keys/github_token",
      "credentials-api-keys/slack_token",
      "credentials-api-keys/generic_api_key",
      "credential/bearer-token",
      "credential/private-key-header",
      "credential/hex-token",
      "credential/password"
    ]
  },
  {
    "policyId": "local-payment-data",
    "ruleIds": [
      "financial-pii/credit_card",
      "financial-pii/iban",
      "pattern/ca_bank_account",
      "pattern/sg_bank_account"
    ]
  },
  {
    "policyId": "local-government-identifiers",
    "ruleIds": [
      "au-pii-tax-identifiers/au_tfn",
      "au-pii-tax-identifiers/au_abn",
      "au-pii-tax-identifiers/au_medicare",
      "pattern/uae_emirates_id",
      "pattern/ca_on_drivers_licence",
      "pattern/ca_immigration_doc",
      "pattern/fr_nir",
      "pattern/uoft_tcard",
      "pattern/sg_uen",
      "pattern/ca_ohip",
      "pattern/ca_sin",
      "pattern/eu_vat",
      "pattern/nl_bsn_contextual",
      "pattern/au_tfn",
      "pattern/uoft_student_id",
      "pattern/us_ssn",
      "pattern/us_ssn_no_dash",
      "pattern/br_cpf",
      "pattern/br_cpf_unformatted",
      "pattern/br_cnpj",
      "pattern/br_rg",
      "pattern/sg_nric",
      "pattern/uoft_utorid"
    ]
  },
  {
    "policyId": "local-passports",
    "ruleIds": [
      "pattern/passport_singapore",
      "pattern/passport_china",
      "pattern/passport_us",
      "pattern/passport_germany",
      "pattern/passport_france",
      "pattern/passport_netherlands",
      "pattern/passport_canada",
      "pattern/passport_india",
      "identity/passport"
    ]
  },
  {
    "policyId": "local-contact-data",
    "ruleIds": [
      "pattern/sg_phone",
      "pattern/uae_phone",
      "pattern/fr_phone",
      "pattern/br_phone_mobile",
      "pattern/br_phone_landline",
      "pattern/br_cep",
      "pattern/fr_postal_code",
      "pattern/street_address",
      "pattern/sg_postal_code",
      "pattern/ca_postal_code",
      "pattern/email",
      "pattern/us_phone"
    ]
  },
  {
    "policyId": "local-network-addresses",
    "ruleIds": [
      "pattern/ipv4",
      "pattern/ipv6",
      "pattern/url"
    ]
  },
  {
    "policyId": "local-sensitive-attribute-terms",
    "ruleIds": [
      "pattern/gender_sexual_orientation",
      "pattern/race_ethnicity_national_origin",
      "pattern/religion",
      "pattern/age_discrimination",
      "pattern/disability",
      "pattern/marital_family_status",
      "pattern/military_status",
      "pattern/public_assistance"
    ]
  },
  {
    "policyId": "local-risk-content-terms",
    "ruleIds": [
      "pattern/explosives",
      "pattern/weapons_firearms",
      "pattern/weapons_other",
      "pattern/violence_threats",
      "pattern/terrorism",
      "pattern/self_harm_suicide",
      "pattern/illegal_activities",
      "pattern/harassment_hate"
    ]
  }
] as const;
