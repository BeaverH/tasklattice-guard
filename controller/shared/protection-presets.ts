import type { ProtectionPreset } from "./protection-map.js";

// Profiles select current capability Rules; composition expectations retain first-match evidence.
export const protectionPresets: readonly ProtectionPreset[] = [
  {
    "id": "common-baseline",
    "version": "2.0.0",
    "name": "Common baseline",
    "industry": "general",
    "jurisdictions": [],
    "description": "Basic local protection for credentials, personal data, harmful phrases and prompt attacks. No external model required.",
    "policies": [
      {
        "policyId": "local-credentials",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "credentials-api-keys/aws_access_key",
          "credentials-api-keys/aws_secret_key",
          "credentials-api-keys/github_token",
          "credentials-api-keys/slack_token",
          "credentials-api-keys/generic_api_key",
          "credential/bearer-token",
          "credential/private-key-header",
          "credential/hex-token",
          "credential/password"
        ],
        "ruleOrder": [
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
        "policyId": "local-content-safety",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "category/denied_insults",
          "category/harmful_self_harm",
          "category/harmful_violence",
          "category/harmful_child_safety",
          "category/harmful_illegal_weapons",
          "category/bias_racial",
          "category/bias_gender",
          "category/bias_religious",
          "category/bias_sexual_orientation",
          "category/harm_toxic_abuse"
        ],
        "ruleOrder": [
          "category/denied_insults",
          "category/harmful_self_harm",
          "category/harmful_violence",
          "category/harmful_child_safety",
          "category/harmful_illegal_weapons",
          "category/bias_racial",
          "category/bias_gender",
          "category/bias_religious",
          "category/bias_sexual_orientation",
          "category/harm_toxic_abuse"
        ]
      },
      {
        "policyId": "local-injection-protection",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
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
          "category/prompt_injection_data_exfiltration"
        ],
        "ruleOrder": [
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
          "category/prompt_injection_data_exfiltration"
        ]
      },
      {
        "policyId": "local-payment-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "financial-pii/credit_card",
          "financial-pii/iban"
        ],
        "ruleOrder": [
          "financial-pii/credit_card",
          "financial-pii/iban"
        ]
      },
      {
        "policyId": "local-passports",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "identity/passport"
        ],
        "ruleOrder": [
          "identity/passport"
        ]
      },
      {
        "policyId": "local-contact-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "pattern/email",
          "pattern/us_phone"
        ],
        "ruleOrder": [
          "pattern/email",
          "pattern/us_phone"
        ]
      }
    ],
    "suggestedTopics": [],
    "optionalPolicyIds": [
      "builtin-content-safety",
      "builtin-jailbreak",
      "builtin-topic-safety",
      "builtin-contextual-grounding"
    ],
    "limitations": [
      "Local patterns provide basic screening, not complete semantic coverage or guaranteed attack prevention.",
      "Selected output transformations require complete-response buffering, including streaming requests.",
      "Optional model-backed protection is not enabled until explicitly selected, configured and validated."
    ]
  },
  {
    "id": "banking-assistant",
    "version": "2.0.0",
    "name": "Banking customer service",
    "industry": "banking",
    "jurisdictions": [],
    "description": "Common baseline plus identity-check evasion and misleading investment-guarantee patterns. Banking education stays available.",
    "policies": [
      {
        "policyId": "local-credentials",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "credentials-api-keys/aws_access_key",
          "credentials-api-keys/aws_secret_key",
          "credentials-api-keys/github_token",
          "credentials-api-keys/slack_token",
          "credentials-api-keys/generic_api_key",
          "credential/bearer-token",
          "credential/private-key-header",
          "credential/hex-token",
          "credential/password"
        ],
        "ruleOrder": [
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
        "policyId": "local-content-safety",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "category/denied_insults",
          "category/harmful_self_harm",
          "category/harmful_violence",
          "category/harmful_child_safety",
          "category/harmful_illegal_weapons",
          "category/bias_racial",
          "category/bias_gender",
          "category/bias_religious",
          "category/bias_sexual_orientation",
          "category/harm_toxic_abuse"
        ],
        "ruleOrder": [
          "category/denied_insults",
          "category/harmful_self_harm",
          "category/harmful_violence",
          "category/harmful_child_safety",
          "category/harmful_illegal_weapons",
          "category/bias_racial",
          "category/bias_gender",
          "category/bias_religious",
          "category/bias_sexual_orientation",
          "category/harm_toxic_abuse"
        ]
      },
      {
        "policyId": "local-injection-protection",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
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
          "category/prompt_injection_data_exfiltration"
        ],
        "ruleOrder": [
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
          "category/prompt_injection_data_exfiltration"
        ]
      },
      {
        "policyId": "local-payment-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "financial-pii/credit_card",
          "financial-pii/iban"
        ],
        "ruleOrder": [
          "financial-pii/credit_card",
          "financial-pii/iban"
        ]
      },
      {
        "policyId": "local-passports",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "identity/passport"
        ],
        "ruleOrder": [
          "identity/passport"
        ]
      },
      {
        "policyId": "local-contact-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "pattern/email",
          "pattern/us_phone"
        ],
        "ruleOrder": [
          "pattern/email",
          "pattern/us_phone"
        ]
      },
      {
        "policyId": "local-fraud-prevention",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "banking/identity-evasion",
          "banking/return-guarantee"
        ],
        "ruleOrder": [
          "banking/identity-evasion",
          "banking/return-guarantee"
        ]
      }
    ],
    "suggestedTopics": [
      "Accounts, cards and payments",
      "Banking product information",
      "Customer service and fraud reporting"
    ],
    "optionalPolicyIds": [
      "builtin-content-safety",
      "builtin-jailbreak",
      "builtin-topic-safety",
      "builtin-contextual-grounding",
      "local-contact-data",
      "local-government-identifiers",
      "local-payment-data"
    ],
    "limitations": [
      "Local patterns provide basic screening, not complete semantic coverage or guaranteed attack prevention.",
      "Selected output transformations require complete-response buffering, including streaming requests.",
      "Optional model-backed protection is not enabled until explicitly selected, configured and validated.",
      "Financial reference controls are text checks, not regulatory compliance, suitability decisions, transaction authorization or certification."
    ]
  },
  {
    "id": "securities-assistant",
    "version": "2.0.0",
    "name": "Securities & brokerage",
    "industry": "securities",
    "jurisdictions": [],
    "description": "Common baseline plus insider-trading, market-manipulation and misleading return-guarantee patterns.",
    "policies": [
      {
        "policyId": "local-credentials",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "credentials-api-keys/aws_access_key",
          "credentials-api-keys/aws_secret_key",
          "credentials-api-keys/github_token",
          "credentials-api-keys/slack_token",
          "credentials-api-keys/generic_api_key",
          "credential/bearer-token",
          "credential/private-key-header",
          "credential/hex-token",
          "credential/password"
        ],
        "ruleOrder": [
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
        "policyId": "local-content-safety",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "category/denied_insults",
          "category/harmful_self_harm",
          "category/harmful_violence",
          "category/harmful_child_safety",
          "category/harmful_illegal_weapons",
          "category/bias_racial",
          "category/bias_gender",
          "category/bias_religious",
          "category/bias_sexual_orientation",
          "category/harm_toxic_abuse"
        ],
        "ruleOrder": [
          "category/denied_insults",
          "category/harmful_self_harm",
          "category/harmful_violence",
          "category/harmful_child_safety",
          "category/harmful_illegal_weapons",
          "category/bias_racial",
          "category/bias_gender",
          "category/bias_religious",
          "category/bias_sexual_orientation",
          "category/harm_toxic_abuse"
        ]
      },
      {
        "policyId": "local-injection-protection",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
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
          "category/prompt_injection_data_exfiltration"
        ],
        "ruleOrder": [
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
          "category/prompt_injection_data_exfiltration"
        ]
      },
      {
        "policyId": "local-payment-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "financial-pii/credit_card",
          "financial-pii/iban"
        ],
        "ruleOrder": [
          "financial-pii/credit_card",
          "financial-pii/iban"
        ]
      },
      {
        "policyId": "local-passports",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "identity/passport"
        ],
        "ruleOrder": [
          "identity/passport"
        ]
      },
      {
        "policyId": "local-contact-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "pattern/email",
          "pattern/us_phone"
        ],
        "ruleOrder": [
          "pattern/email",
          "pattern/us_phone"
        ]
      },
      {
        "policyId": "local-fraud-prevention",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "banking/identity-evasion",
          "banking/return-guarantee",
          "securities/inside-information",
          "securities/manipulation"
        ],
        "ruleOrder": [
          "banking/identity-evasion",
          "banking/return-guarantee",
          "securities/inside-information",
          "securities/manipulation"
        ]
      }
    ],
    "suggestedTopics": [
      "Securities products and risk education",
      "Brokerage account support",
      "Public market information"
    ],
    "optionalPolicyIds": [
      "builtin-content-safety",
      "builtin-jailbreak",
      "builtin-topic-safety",
      "builtin-contextual-grounding",
      "local-contact-data",
      "local-government-identifiers",
      "local-payment-data"
    ],
    "limitations": [
      "Local patterns provide basic screening, not complete semantic coverage or guaranteed attack prevention.",
      "Selected output transformations require complete-response buffering, including streaming requests.",
      "Optional model-backed protection is not enabled until explicitly selected, configured and validated.",
      "Financial reference controls are text checks, not regulatory compliance, suitability decisions, transaction authorization or certification."
    ]
  },
  {
    "id": "internet-customer-support",
    "version": "2.0.0",
    "name": "Internet platform support",
    "industry": "internet",
    "jurisdictions": [],
    "description": "Common baseline plus phishing, session theft, SQL/code and rendered-content injection patterns.",
    "policies": [
      {
        "policyId": "local-credentials",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "credentials-api-keys/aws_access_key",
          "credentials-api-keys/aws_secret_key",
          "credentials-api-keys/github_token",
          "credentials-api-keys/slack_token",
          "credentials-api-keys/generic_api_key",
          "credential/bearer-token",
          "credential/private-key-header",
          "credential/hex-token",
          "credential/password"
        ],
        "ruleOrder": [
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
        "policyId": "local-content-safety",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "category/denied_insults",
          "category/harmful_self_harm",
          "category/harmful_violence",
          "category/harmful_child_safety",
          "category/harmful_illegal_weapons",
          "category/bias_racial",
          "category/bias_gender",
          "category/bias_religious",
          "category/bias_sexual_orientation",
          "category/harm_toxic_abuse"
        ],
        "ruleOrder": [
          "category/denied_insults",
          "category/harmful_self_harm",
          "category/harmful_violence",
          "category/harmful_child_safety",
          "category/harmful_illegal_weapons",
          "category/bias_racial",
          "category/bias_gender",
          "category/bias_religious",
          "category/bias_sexual_orientation",
          "category/harm_toxic_abuse"
        ]
      },
      {
        "policyId": "local-injection-protection",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
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
          "category/prompt_injection_data_exfiltration",
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
          "application/template-traversal"
        ],
        "ruleOrder": [
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
          "category/prompt_injection_data_exfiltration",
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
          "application/template-traversal"
        ]
      },
      {
        "policyId": "local-payment-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "financial-pii/credit_card",
          "financial-pii/iban"
        ],
        "ruleOrder": [
          "financial-pii/credit_card",
          "financial-pii/iban"
        ]
      },
      {
        "policyId": "local-passports",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "identity/passport"
        ],
        "ruleOrder": [
          "identity/passport"
        ]
      },
      {
        "policyId": "local-contact-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "pattern/email",
          "pattern/us_phone"
        ],
        "ruleOrder": [
          "pattern/email",
          "pattern/us_phone"
        ]
      },
      {
        "policyId": "local-fraud-prevention",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "internet/phishing",
          "internet/session-theft"
        ],
        "ruleOrder": [
          "internet/phishing",
          "internet/session-theft"
        ]
      }
    ],
    "suggestedTopics": [
      "Product support and troubleshooting",
      "Account and subscription help",
      "Trust and safety reporting"
    ],
    "optionalPolicyIds": [
      "builtin-content-safety",
      "builtin-jailbreak",
      "builtin-topic-safety",
      "builtin-contextual-grounding",
      "keyword-blocking",
      "competitor-mention-detection"
    ],
    "limitations": [
      "Local patterns provide basic screening, not complete semantic coverage or guaranteed attack prevention.",
      "Selected output transformations require complete-response buffering, including streaming requests.",
      "Optional model-backed protection is not enabled until explicitly selected, configured and validated.",
      "Content screening does not replace output encoding, parameterized queries, sandboxing or access control."
    ]
  },
  {
    "id": "singapore-financial-assistant",
    "version": "2.0.0",
    "name": "Singapore financial reference",
    "industry": "banking",
    "jurisdictions": [
      "singapore"
    ],
    "description": "Banking baseline plus Singapore customer-identifier and personal-data-use phrase checks. No MAS-specific Policy is included.",
    "policies": [
      {
        "policyId": "local-credentials",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "credentials-api-keys/aws_access_key",
          "credentials-api-keys/aws_secret_key",
          "credentials-api-keys/github_token",
          "credentials-api-keys/slack_token",
          "credentials-api-keys/generic_api_key",
          "credential/bearer-token",
          "credential/private-key-header",
          "credential/hex-token",
          "credential/password"
        ],
        "ruleOrder": [
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
        "policyId": "local-content-safety",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "category/denied_insults",
          "category/harmful_self_harm",
          "category/harmful_violence",
          "category/harmful_child_safety",
          "category/harmful_illegal_weapons",
          "category/bias_racial",
          "category/bias_gender",
          "category/bias_religious",
          "category/bias_sexual_orientation",
          "category/harm_toxic_abuse"
        ],
        "ruleOrder": [
          "category/denied_insults",
          "category/harmful_self_harm",
          "category/harmful_violence",
          "category/harmful_child_safety",
          "category/harmful_illegal_weapons",
          "category/bias_racial",
          "category/bias_gender",
          "category/bias_religious",
          "category/bias_sexual_orientation",
          "category/harm_toxic_abuse"
        ]
      },
      {
        "policyId": "local-injection-protection",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
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
          "category/prompt_injection_data_exfiltration"
        ],
        "ruleOrder": [
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
          "category/prompt_injection_data_exfiltration"
        ]
      },
      {
        "policyId": "local-payment-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "financial-pii/credit_card",
          "financial-pii/iban",
          "sg-pdpa-financial-data/sg_bank_account"
        ],
        "ruleOrder": [
          "financial-pii/credit_card",
          "financial-pii/iban",
          "sg-pdpa-financial-data/sg_bank_account"
        ]
      },
      {
        "policyId": "local-passports",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "identity/passport"
        ],
        "ruleOrder": [
          "identity/passport"
        ]
      },
      {
        "policyId": "local-contact-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "pattern/email",
          "pattern/us_phone",
          "pattern/sg_phone"
        ],
        "ruleOrder": [
          "pattern/email",
          "pattern/us_phone",
          "pattern/sg_phone"
        ]
      },
      {
        "policyId": "local-fraud-prevention",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "banking/identity-evasion",
          "banking/return-guarantee"
        ],
        "ruleOrder": [
          "banking/identity-evasion",
          "banking/return-guarantee"
        ]
      },
      {
        "policyId": "local-government-identifiers",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "pattern/sg_nric"
        ],
        "ruleOrder": [
          "pattern/sg_nric"
        ]
      },
      {
        "policyId": "local-data-use-boundaries",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "sg-pdpa-personal-identifiers/sg_pdpa_personal_identifiers",
          "sg-pdpa-sensitive-data/sg_pdpa_sensitive_data",
          "sg-pdpa-do-not-call/sg_pdpa_do_not_call",
          "sg-pdpa-data-transfer/sg_pdpa_data_transfer",
          "sg-pdpa-profiling-automated-decisions/sg_pdpa_profiling_automated_decisions"
        ],
        "ruleOrder": [
          "sg-pdpa-personal-identifiers/sg_pdpa_personal_identifiers",
          "sg-pdpa-sensitive-data/sg_pdpa_sensitive_data",
          "sg-pdpa-do-not-call/sg_pdpa_do_not_call",
          "sg-pdpa-data-transfer/sg_pdpa_data_transfer",
          "sg-pdpa-profiling-automated-decisions/sg_pdpa_profiling_automated_decisions"
        ]
      }
    ],
    "suggestedTopics": [
      "Singapore banking customer support",
      "Financial products and risk education",
      "Personal-data handling requests"
    ],
    "optionalPolicyIds": [
      "builtin-content-safety",
      "builtin-jailbreak",
      "builtin-topic-safety",
      "builtin-contextual-grounding",
      "local-fraud-prevention"
    ],
    "limitations": [
      "Local patterns provide basic screening, not complete semantic coverage or guaranteed attack prevention.",
      "Selected output transformations require complete-response buffering, including streaming requests.",
      "Optional model-backed protection is not enabled until explicitly selected, configured and validated.",
      "Financial reference controls are text checks, not regulatory compliance, suitability decisions, transaction authorization or certification.",
      "No MAS-specific control is included without a verified, directly relevant MAS source and reviewed Rule-level mapping."
    ]
  },
  {
    "id": "china-mainland-runtime",
    "version": "2.0.0",
    "name": "China mainland runtime baseline",
    "industry": "general",
    "jurisdictions": [
      "cn"
    ],
    "description": "Local China-mainland identifier, credential and explicit Chinese prompt-manipulation controls. Broader content governance and generated-content labelling require separate integration.",
    "policies": [
      {
        "policyId": "local-credentials",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "credentials-api-keys/aws_access_key",
          "credentials-api-keys/aws_secret_key",
          "credentials-api-keys/github_token",
          "credentials-api-keys/slack_token",
          "credentials-api-keys/generic_api_key",
          "credential/bearer-token",
          "credential/private-key-header",
          "credential/hex-token",
          "credential/password"
        ],
        "ruleOrder": [
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
        "policyId": "local-passports",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "identity/passport"
        ],
        "ruleOrder": [
          "identity/passport"
        ]
      },
      {
        "policyId": "local-government-identifiers",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "cn-personal-information/resident-identity-card"
        ],
        "ruleOrder": [
          "cn-personal-information/resident-identity-card"
        ]
      },
      {
        "policyId": "local-contact-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "cn-personal-information/mainland-mobile"
        ],
        "ruleOrder": [
          "cn-personal-information/mainland-mobile"
        ]
      },
      {
        "policyId": "local-payment-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "cn-personal-information/unionpay-card"
        ],
        "ruleOrder": [
          "cn-personal-information/unionpay-card"
        ]
      },
      {
        "policyId": "local-injection-protection",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "cn-prompt-security/instruction-override",
          "cn-prompt-security/prompt-extraction",
          "cn-prompt-security/unrestricted-mode"
        ],
        "ruleOrder": [
          "cn-prompt-security/instruction-override",
          "cn-prompt-security/prompt-extraction",
          "cn-prompt-security/unrestricted-mode"
        ]
      }
    ],
    "suggestedTopics": [],
    "optionalPolicyIds": [
      "builtin-content-safety",
      "builtin-jailbreak",
      "builtin-topic-safety",
      "builtin-contextual-grounding",
      "builtin-automated-reasoning",
      "local-government-identifiers"
    ],
    "limitations": [
      "Runtime Enforced: only the selected local identifier, credential and explicit prompt-manipulation patterns run without an external model.",
      "Requires Integration: broader Chinese-language content-risk classification, grounding, generated-content visible and implicit labels, and authenticated transaction context require validated models or application/gateway integration.",
      "Governance Only: filing, security assessment, training-data governance, lawful-basis and consent decisions, cross-border review, retention, human oversight and regulatory reporting are not automated by this Profile.",
      "The jurisdiction label is deployment context, not a legal-scope decision, certification or proof of compliance with mainland-China law or standards.",
      "Redaction can remove identifiers needed by an authorized workflow; use approved structured channels and review field-level handling instead of assuming text redaction is always appropriate."
    ]
  },
  {
    "id": "china-banking-assistant",
    "version": "2.0.0",
    "name": "China mainland banking assistant",
    "industry": "banking",
    "jurisdictions": [
      "cn"
    ],
    "description": "China mainland runtime baseline plus bounded banking-assistant controls for credential theft, identity-check evasion and selected misleading return guarantees.",
    "policies": [
      {
        "policyId": "local-credentials",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "credentials-api-keys/aws_access_key",
          "credentials-api-keys/aws_secret_key",
          "credentials-api-keys/github_token",
          "credentials-api-keys/slack_token",
          "credentials-api-keys/generic_api_key",
          "credential/bearer-token",
          "credential/private-key-header",
          "credential/hex-token",
          "credential/password"
        ],
        "ruleOrder": [
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
        "policyId": "local-passports",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "identity/passport"
        ],
        "ruleOrder": [
          "identity/passport"
        ]
      },
      {
        "policyId": "local-government-identifiers",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "cn-personal-information/resident-identity-card"
        ],
        "ruleOrder": [
          "cn-personal-information/resident-identity-card"
        ]
      },
      {
        "policyId": "local-contact-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "cn-personal-information/mainland-mobile"
        ],
        "ruleOrder": [
          "cn-personal-information/mainland-mobile"
        ]
      },
      {
        "policyId": "local-payment-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "cn-personal-information/unionpay-card"
        ],
        "ruleOrder": [
          "cn-personal-information/unionpay-card"
        ]
      },
      {
        "policyId": "local-injection-protection",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "cn-prompt-security/instruction-override",
          "cn-prompt-security/prompt-extraction",
          "cn-prompt-security/unrestricted-mode"
        ],
        "ruleOrder": [
          "cn-prompt-security/instruction-override",
          "cn-prompt-security/prompt-extraction",
          "cn-prompt-security/unrestricted-mode"
        ]
      },
      {
        "policyId": "local-fraud-prevention",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input",
          "output"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "cn-banking/verification-code-theft",
          "cn-banking/sensitive-credential-solicitation",
          "cn-banking/identity-check-evasion",
          "cn-banking/misleading-return-guarantee"
        ],
        "ruleOrder": [
          "cn-banking/verification-code-theft",
          "cn-banking/sensitive-credential-solicitation",
          "cn-banking/identity-check-evasion",
          "cn-banking/misleading-return-guarantee"
        ]
      }
    ],
    "suggestedTopics": [
      "账户、银行卡与支付",
      "银行产品信息与风险教育",
      "客户服务与反欺诈报告"
    ],
    "optionalPolicyIds": [
      "builtin-content-safety",
      "builtin-jailbreak",
      "builtin-topic-safety",
      "builtin-contextual-grounding",
      "builtin-automated-reasoning",
      "local-government-identifiers",
      "local-fraud-prevention"
    ],
    "limitations": [
      "Runtime Enforced: only the selected local identifier, credential and explicit prompt-manipulation patterns run without an external model.",
      "Requires Integration: broader Chinese-language content-risk classification, grounding, generated-content visible and implicit labels, and authenticated transaction context require validated models or application/gateway integration.",
      "Governance Only: filing, security assessment, training-data governance, lawful-basis and consent decisions, cross-border review, retention, human oversight and regulatory reporting are not automated by this Profile.",
      "The jurisdiction label is deployment context, not a legal-scope decision, certification or proof of compliance with mainland-China law or standards.",
      "Redaction can remove identifiers needed by an authorized workflow; use approved structured channels and review field-level handling instead of assuming text redaction is always appropriate.",
      "Banking phrase checks do not make credit, suitability, KYC, AML, transaction-authorisation or fraud determinations and do not implement JR/T 0221-2021 evaluation procedures."
    ]
  },
  {
    "id": "australia-data-protection",
    "version": "1.0.0",
    "name": "Australia data protection",
    "industry": "general",
    "jurisdictions": [
      "au"
    ],
    "description": "A reviewed selection of capability Rules for Australia data protection. Individual checks remain configurable.",
    "policies": [
      {
        "policyId": "local-credentials",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "credentials-api-keys/aws_access_key",
          "credentials-api-keys/aws_secret_key",
          "credentials-api-keys/github_token",
          "credentials-api-keys/slack_token",
          "advanced-au-pii-protection/credentials-api-keys/generic_api_key"
        ],
        "ruleOrder": [
          "credentials-api-keys/aws_access_key",
          "credentials-api-keys/aws_secret_key",
          "credentials-api-keys/github_token",
          "credentials-api-keys/slack_token",
          "advanced-au-pii-protection/credentials-api-keys/generic_api_key"
        ]
      },
      {
        "policyId": "local-payment-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "financial-pii/credit_card",
          "financial-pii/iban",
          "financial-pii/visa",
          "financial-pii/mastercard",
          "financial-pii/amex",
          "financial-pii/discover"
        ],
        "ruleOrder": [
          "financial-pii/credit_card",
          "financial-pii/iban",
          "financial-pii/visa",
          "financial-pii/mastercard",
          "financial-pii/amex",
          "financial-pii/discover"
        ],
        "testCaseOverrides": {
          "advanced-au-pii-protection/rule-financial-pii/visa-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [credit_card_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-payment-data",
                "ruleId": "financial-pii/credit_card"
              }
            ]
          },
          "advanced-au-pii-protection/rule-financial-pii/mastercard-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [credit_card_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-payment-data",
                "ruleId": "financial-pii/credit_card"
              }
            ]
          },
          "advanced-au-pii-protection/rule-financial-pii/amex-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [credit_card_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-payment-data",
                "ruleId": "financial-pii/credit_card"
              }
            ]
          },
          "advanced-au-pii-protection/rule-financial-pii/discover-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [credit_card_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-payment-data",
                "ruleId": "financial-pii/credit_card"
              }
            ]
          },
          "baseline-pii-protection/rule-financial-pii/visa-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [credit_card_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-payment-data",
                "ruleId": "financial-pii/credit_card"
              }
            ]
          },
          "baseline-pii-protection/rule-financial-pii/mastercard-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [credit_card_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-payment-data",
                "ruleId": "financial-pii/credit_card"
              }
            ]
          },
          "baseline-pii-protection/rule-financial-pii/amex-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [credit_card_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-payment-data",
                "ruleId": "financial-pii/credit_card"
              }
            ]
          },
          "baseline-pii-protection/rule-financial-pii/discover-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [credit_card_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-payment-data",
                "ruleId": "financial-pii/credit_card"
              }
            ]
          },
          "pattern-matching/accept/visa": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [credit_card_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-payment-data",
                "ruleId": "financial-pii/credit_card"
              }
            ]
          },
          "pattern-matching/accept/mastercard": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [credit_card_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-payment-data",
                "ruleId": "financial-pii/credit_card"
              }
            ]
          },
          "pattern-matching/accept/amex": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [credit_card_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-payment-data",
                "ruleId": "financial-pii/credit_card"
              }
            ]
          },
          "pattern-matching/accept/discover": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [credit_card_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-payment-data",
                "ruleId": "financial-pii/credit_card"
              }
            ]
          }
        }
      },
      {
        "policyId": "local-government-identifiers",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "au-pii-tax-identifiers/au_tfn",
          "au-pii-tax-identifiers/au_abn",
          "au-pii-tax-identifiers/au_medicare",
          "pattern/us_ssn",
          "pattern/us_ssn_no_dash",
          "international-pii-identifiers/nl_bsn_contextual",
          "international-pii-identifiers/br_cpf",
          "international-pii-identifiers/br_cpf_unformatted",
          "international-pii-identifiers/br_rg",
          "pattern/br_cnpj"
        ],
        "ruleOrder": [
          "au-pii-tax-identifiers/au_tfn",
          "au-pii-tax-identifiers/au_abn",
          "au-pii-tax-identifiers/au_medicare",
          "pattern/us_ssn",
          "pattern/us_ssn_no_dash",
          "pattern/br_cnpj",
          "international-pii-identifiers/nl_bsn_contextual",
          "international-pii-identifiers/br_cpf",
          "international-pii-identifiers/br_cpf_unformatted",
          "international-pii-identifiers/br_rg"
        ],
        "testCaseOverrides": {
          "advanced-au-pii-protection/rule-international-pii-identifiers/br_cpf_unformatted-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [au_abn_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-government-identifiers",
                "ruleId": "au-pii-tax-identifiers/au_abn"
              }
            ]
          }
        }
      },
      {
        "policyId": "local-passports",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "au-pii-passports/passport_australia",
          "pattern/passport_us",
          "international-pii-identifiers/passport_uk",
          "pattern/passport_germany",
          "pattern/passport_france",
          "pattern/passport_netherlands",
          "pattern/passport_china",
          "pattern/passport_india",
          "international-pii-identifiers/passport_japan",
          "pattern/passport_canada"
        ],
        "ruleOrder": [
          "pattern/passport_china",
          "pattern/passport_us",
          "pattern/passport_germany",
          "pattern/passport_france",
          "pattern/passport_netherlands",
          "pattern/passport_canada",
          "pattern/passport_india",
          "au-pii-passports/passport_australia",
          "international-pii-identifiers/passport_uk",
          "international-pii-identifiers/passport_japan"
        ],
        "testCaseOverrides": {
          "advanced-au-pii-protection/rule-au-pii-passports/passport_australia-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [passport_india_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-passports",
                "ruleId": "pattern/passport_india"
              }
            ]
          },
          "advanced-au-pii-protection/rule-international-pii-identifiers/passport_uk-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [passport_us_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-passports",
                "ruleId": "pattern/passport_us"
              }
            ]
          },
          "advanced-au-pii-protection/rule-international-pii-identifiers/passport_japan-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [passport_netherlands_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-passports",
                "ruleId": "pattern/passport_netherlands"
              }
            ]
          },
          "pattern-matching/accept/passport_uk": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [passport_us_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-passports",
                "ruleId": "pattern/passport_us"
              }
            ]
          },
          "pattern-matching/accept/passport_japan": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [passport_netherlands_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-passports",
                "ruleId": "pattern/passport_netherlands"
              }
            ]
          }
        }
      },
      {
        "policyId": "local-contact-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "pattern/email",
          "pattern/us_phone",
          "pattern/br_phone_landline",
          "pattern/br_phone_mobile",
          "pattern/street_address",
          "pattern/br_cep"
        ],
        "ruleOrder": [
          "pattern/br_phone_mobile",
          "pattern/br_phone_landline",
          "pattern/br_cep",
          "pattern/street_address",
          "pattern/email",
          "pattern/us_phone"
        ],
        "testCaseOverrides": {
          "advanced-au-pii-protection/rule-contact-information-pii/br_phone_landline-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [br_phone_mobile_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-contact-data",
                "ruleId": "pattern/br_phone_mobile"
              }
            ]
          },
          "pattern-matching/accept/br_phone_landline": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "The earlier selected Rule covers the same complete value. Assert canonical first-match evidence and the entire replacement text.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [br_phone_mobile_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-contact-data",
                "ruleId": "pattern/br_phone_mobile"
              }
            ]
          }
        }
      },
      {
        "policyId": "local-network-addresses",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "network-infrastructure-pii/ipv4",
          "network-infrastructure-pii/ipv6"
        ],
        "ruleOrder": [
          "network-infrastructure-pii/ipv4",
          "network-infrastructure-pii/ipv6"
        ]
      },
      {
        "policyId": "local-sensitive-attribute-terms",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "enabledRuleIds": [
          "protected-class-information/gender_sexual_orientation",
          "protected-class-information/race_ethnicity_national_origin",
          "protected-class-information/religion",
          "protected-class-information/age_discrimination",
          "protected-class-information/disability",
          "protected-class-information/marital_family_status",
          "protected-class-information/military_status",
          "protected-class-information/public_assistance"
        ],
        "ruleOrder": [
          "protected-class-information/gender_sexual_orientation",
          "protected-class-information/race_ethnicity_national_origin",
          "protected-class-information/religion",
          "protected-class-information/age_discrimination",
          "protected-class-information/disability",
          "protected-class-information/marital_family_status",
          "protected-class-information/military_status",
          "protected-class-information/public_assistance"
        ],
        "parameterValues": {}
      }
    ],
    "suggestedTopics": [],
    "optionalPolicyIds": [],
    "limitations": [
      "Local text checks do not establish regulatory applicability or compliance. Review individual Rule scope and handling before deployment."
    ]
  },
  {
    "id": "eu-data-protection",
    "version": "1.0.0",
    "name": "EU data protection",
    "industry": "general",
    "jurisdictions": [
      "eu"
    ],
    "description": "A reviewed selection of capability Rules for EU data protection. Individual checks remain configurable.",
    "policies": [
      {
        "policyId": "local-government-identifiers",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "gdpr-eu-national-identifiers/fr_nir",
          "gdpr-eu-business-identifiers/eu_vat"
        ],
        "ruleOrder": [
          "gdpr-eu-national-identifiers/fr_nir",
          "gdpr-eu-business-identifiers/eu_vat"
        ]
      },
      {
        "policyId": "local-passports",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "gdpr-eu-national-identifiers/eu_passport_generic"
        ],
        "ruleOrder": [
          "gdpr-eu-national-identifiers/eu_passport_generic"
        ]
      },
      {
        "policyId": "local-payment-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "gdpr-eu-financial-data/eu_iban_enhanced",
          "gdpr-eu-financial-data/iban"
        ],
        "ruleOrder": [
          "gdpr-eu-financial-data/eu_iban_enhanced",
          "gdpr-eu-financial-data/iban"
        ]
      },
      {
        "policyId": "local-contact-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "pattern/email",
          "pattern/fr_phone",
          "gdpr-eu-contact-information/fr_postal_code"
        ],
        "ruleOrder": [
          "pattern/email",
          "pattern/fr_phone",
          "gdpr-eu-contact-information/fr_postal_code"
        ]
      }
    ],
    "suggestedTopics": [],
    "optionalPolicyIds": [],
    "limitations": [
      "Local text checks do not establish regulatory applicability or compliance. Review individual Rule scope and handling before deployment."
    ]
  },
  {
    "id": "singapore-data-protection",
    "version": "1.0.0",
    "name": "Singapore data protection",
    "industry": "general",
    "jurisdictions": [
      "singapore"
    ],
    "description": "A reviewed selection of capability Rules for Singapore data protection. Individual checks remain configurable.",
    "policies": [
      {
        "policyId": "local-government-identifiers",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "pattern/sg_nric",
          "sg-pdpa-business-identifiers/sg_uen"
        ],
        "ruleOrder": [
          "pattern/sg_nric",
          "sg-pdpa-business-identifiers/sg_uen"
        ]
      },
      {
        "policyId": "local-passports",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "sg-pdpa-pii-identifiers/passport_singapore"
        ],
        "ruleOrder": [
          "sg-pdpa-pii-identifiers/passport_singapore"
        ]
      },
      {
        "policyId": "local-contact-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "pattern/sg_phone",
          "sg-pdpa-contact-information/sg_postal_code",
          "pattern/email"
        ],
        "ruleOrder": [
          "pattern/sg_phone",
          "sg-pdpa-contact-information/sg_postal_code",
          "pattern/email"
        ],
        "testCaseOverrides": {
          "local-regional-contact-formats/accept/sg_phone/input": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "Require complete identifier redaction, not merely a transform decision or a partially masked value.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [sg_phone_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-contact-data",
                "ruleId": "pattern/sg_phone"
              }
            ]
          },
          "pattern-matching/accept/sg_phone": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "Require complete identifier redaction, not merely a transform decision or a partially masked value.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [sg_phone_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-contact-data",
                "ruleId": "pattern/sg_phone"
              }
            ]
          },
          "pdpa-singapore/rule-sg-pdpa-contact-information/sg_phone-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "Require complete identifier redaction, not merely a transform decision or a partially masked value.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [sg_phone_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-contact-data",
                "ruleId": "pattern/sg_phone"
              }
            ]
          },
          "singapore-customer-identifiers/rule-sg-pdpa-contact-information/sg_phone-acceptance/input": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "Require complete identifier redaction, not merely a transform decision or a partially masked value.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [sg_phone_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-contact-data",
                "ruleId": "pattern/sg_phone"
              }
            ]
          }
        }
      },
      {
        "policyId": "local-payment-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "sg-pdpa-financial-data/sg_bank_account",
          "financial-pii/credit_card"
        ],
        "ruleOrder": [
          "sg-pdpa-financial-data/sg_bank_account",
          "financial-pii/credit_card"
        ]
      },
      {
        "policyId": "local-data-use-boundaries",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "sg-pdpa-personal-identifiers/sg_pdpa_personal_identifiers",
          "sg-pdpa-sensitive-data/sg_pdpa_sensitive_data",
          "sg-pdpa-do-not-call/sg_pdpa_do_not_call",
          "sg-pdpa-data-transfer/sg_pdpa_data_transfer",
          "sg-pdpa-profiling-automated-decisions/sg_pdpa_profiling_automated_decisions"
        ],
        "ruleOrder": [
          "sg-pdpa-personal-identifiers/sg_pdpa_personal_identifiers",
          "sg-pdpa-sensitive-data/sg_pdpa_sensitive_data",
          "sg-pdpa-do-not-call/sg_pdpa_do_not_call",
          "sg-pdpa-data-transfer/sg_pdpa_data_transfer",
          "sg-pdpa-profiling-automated-decisions/sg_pdpa_profiling_automated_decisions"
        ]
      }
    ],
    "suggestedTopics": [],
    "optionalPolicyIds": [],
    "limitations": [
      "Local text checks do not establish regulatory applicability or compliance. Review individual Rule scope and handling before deployment."
    ]
  },
  {
    "id": "uae-reference-controls",
    "version": "1.0.0",
    "name": "UAE reference controls",
    "industry": "general",
    "jurisdictions": [
      "uae"
    ],
    "description": "A reviewed selection of capability Rules for UAE reference controls. Individual checks remain configurable.",
    "policies": [
      {
        "policyId": "local-government-identifiers",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "pattern/uae_emirates_id"
        ],
        "ruleOrder": [
          "pattern/uae_emirates_id"
        ],
        "testCaseOverrides": {
          "accept/uae_emirates_id/input": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "Require complete identifier redaction, not merely a transform decision or a partially masked value.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [uae_emirates_id_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-government-identifiers",
                "ruleId": "pattern/uae_emirates_id"
              }
            ]
          },
          "pattern-matching/accept/uae_emirates_id": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "Require complete identifier redaction, not merely a transform decision or a partially masked value.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [uae_emirates_id_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-government-identifiers",
                "ruleId": "pattern/uae_emirates_id"
              }
            ]
          },
          "uae-regulatory-compliance/rule-uae-data-protection-pii/uae_emirates_id-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "Require complete identifier redaction, not merely a transform decision or a partially masked value.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [uae_emirates_id_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-government-identifiers",
                "ruleId": "pattern/uae_emirates_id"
              }
            ]
          }
        }
      },
      {
        "policyId": "local-contact-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "pattern/uae_phone",
          "pattern/email",
          "uae-data-protection-pii/uae_po_box"
        ],
        "ruleOrder": [
          "pattern/uae_phone",
          "pattern/email",
          "uae-data-protection-pii/uae_po_box"
        ],
        "testCaseOverrides": {
          "local-regional-contact-formats/accept/uae_phone/input": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "Require complete identifier redaction, not merely a transform decision or a partially masked value.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [uae_phone_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-contact-data",
                "ruleId": "pattern/uae_phone"
              }
            ]
          },
          "pattern-matching/accept/uae_phone": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "Require complete identifier redaction, not merely a transform decision or a partially masked value.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [uae_phone_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-contact-data",
                "ruleId": "pattern/uae_phone"
              }
            ]
          },
          "uae-regulatory-compliance/rule-uae-data-protection-pii/uae_phone-acceptance": {
            "sourcePolicyVersion": "4.0.0",
            "reason": "Require complete identifier redaction, not merely a transform decision or a partially masked value.",
            "expectedDecision": "transform",
            "expectedOutputContent": "Acceptance sample: [uae_phone_REDACTED]",
            "expectedMatches": [
              {
                "policyId": "local-contact-data",
                "ruleId": "pattern/uae_phone"
              }
            ]
          }
        }
      },
      {
        "policyId": "local-payment-data",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "financial-pii/iban",
          "financial-pii/credit_card"
        ],
        "ruleOrder": [
          "financial-pii/iban",
          "financial-pii/credit_card"
        ]
      },
      {
        "policyId": "local-content-safety",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "uae-cultural-sensitivity-filter/uae_cultural_sensitivity",
          "uae-anti-discrimination-filter/uae_anti_discrimination"
        ],
        "ruleOrder": [
          "uae-cultural-sensitivity-filter/uae_cultural_sensitivity",
          "uae-anti-discrimination-filter/uae_anti_discrimination"
        ]
      }
    ],
    "suggestedTopics": [],
    "optionalPolicyIds": [],
    "limitations": [
      "Local text checks do not establish regulatory applicability or compliance. Review individual Rule scope and handling before deployment."
    ]
  },
  {
    "id": "multilingual-content-safety",
    "version": "1.0.0",
    "name": "Multilingual content safety",
    "industry": "general",
    "jurisdictions": [],
    "description": "A reviewed selection of capability Rules for Multilingual content safety. Individual checks remain configurable.",
    "policies": [
      {
        "policyId": "local-content-safety",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "category/harm_toxic_abuse",
          "nsfw-filter-spanish/harm_toxic_abuse_es",
          "nsfw-filter-french/harm_toxic_abuse_fr",
          "nsfw-filter-german/harm_toxic_abuse_de",
          "nsfw-filter-australian/harm_toxic_abuse_au",
          "category/harmful_self_harm",
          "category/harmful_child_safety",
          "category/bias_racial"
        ],
        "ruleOrder": [
          "category/harm_toxic_abuse",
          "nsfw-filter-spanish/harm_toxic_abuse_es",
          "nsfw-filter-french/harm_toxic_abuse_fr",
          "nsfw-filter-german/harm_toxic_abuse_de",
          "nsfw-filter-australian/harm_toxic_abuse_au",
          "category/harmful_self_harm",
          "category/harmful_child_safety",
          "category/bias_racial"
        ]
      }
    ],
    "suggestedTopics": [],
    "optionalPolicyIds": [],
    "limitations": [
      "Local text checks do not establish regulatory applicability or compliance. Review individual Rule scope and handling before deployment."
    ]
  },
  {
    "id": "claims-assistant",
    "version": "1.0.0",
    "name": "Claims assistance",
    "industry": "general",
    "jurisdictions": [],
    "description": "A reviewed selection of capability Rules for Claims assistance. Individual checks remain configurable.",
    "policies": [
      {
        "policyId": "local-fraud-prevention",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "claims-fraud-coaching-filter/claims_fraud_coaching",
          "claims-prior-auth-gaming-filter/claims_prior_auth_gaming"
        ],
        "ruleOrder": [
          "claims-fraud-coaching-filter/claims_fraud_coaching",
          "claims-prior-auth-gaming-filter/claims_prior_auth_gaming"
        ]
      },
      {
        "policyId": "local-data-use-boundaries",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "claims-phi-disclosure-filter/claims_phi_disclosure"
        ],
        "ruleOrder": [
          "claims-phi-disclosure-filter/claims_phi_disclosure"
        ]
      },
      {
        "policyId": "local-injection-protection",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "claims-system-override-filter/claims_system_override"
        ],
        "ruleOrder": [
          "claims-system-override-filter/claims_system_override"
        ]
      },
      {
        "policyId": "local-professional-advice",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "claims-medical-advice-filter/claims_medical_advice"
        ],
        "ruleOrder": [
          "claims-medical-advice-filter/claims_medical_advice"
        ]
      }
    ],
    "suggestedTopics": [],
    "optionalPolicyIds": [],
    "limitations": [
      "Local text checks do not establish regulatory applicability or compliance. Review individual Rule scope and handling before deployment."
    ]
  },
  {
    "id": "eu-high-risk-practices",
    "version": "1.0.0",
    "name": "EU high-risk practice restrictions",
    "industry": "general",
    "jurisdictions": [
      "eu"
    ],
    "description": "A reviewed selection of capability Rules for EU high-risk practice restrictions. Individual checks remain configurable.",
    "policies": [
      {
        "policyId": "local-prohibited-practices",
        "policyVersion": "4.0.0",
        "enabledRails": [
          "input"
        ],
        "parameterValues": {},
        "enabledRuleIds": [
          "eu-ai-act-art5-manipulation/eu_ai_act_art5_manipulation",
          "eu-ai-act-art5-vulnerability/eu_ai_act_art5_vulnerability",
          "eu-ai-act-art5-social-scoring/eu_ai_act_art5_social_scoring",
          "eu-ai-act-art5-emotion-recognition/eu_ai_act_art5_emotion_recognition",
          "eu-ai-act-art5-biometric-profiling/eu_ai_act_art5_biometric_profiling",
          "eu-ai-act-art5-manipulation-fr/eu_ai_act_art5_manipulation_fr",
          "eu-ai-act-art5-vulnerability-fr/eu_ai_act_art5_vulnerability_fr",
          "eu-ai-act-art5-social-scoring-fr/eu_ai_act_art5_social_scoring_fr",
          "eu-ai-act-art5-emotion-recognition-fr/eu_ai_act_art5_emotion_recognition_fr",
          "eu-ai-act-art5-biometric-profiling-fr/eu_ai_act_art5_biometric_profiling_fr"
        ],
        "ruleOrder": [
          "eu-ai-act-art5-manipulation/eu_ai_act_art5_manipulation",
          "eu-ai-act-art5-vulnerability/eu_ai_act_art5_vulnerability",
          "eu-ai-act-art5-social-scoring/eu_ai_act_art5_social_scoring",
          "eu-ai-act-art5-emotion-recognition/eu_ai_act_art5_emotion_recognition",
          "eu-ai-act-art5-biometric-profiling/eu_ai_act_art5_biometric_profiling",
          "eu-ai-act-art5-manipulation-fr/eu_ai_act_art5_manipulation_fr",
          "eu-ai-act-art5-vulnerability-fr/eu_ai_act_art5_vulnerability_fr",
          "eu-ai-act-art5-social-scoring-fr/eu_ai_act_art5_social_scoring_fr",
          "eu-ai-act-art5-emotion-recognition-fr/eu_ai_act_art5_emotion_recognition_fr",
          "eu-ai-act-art5-biometric-profiling-fr/eu_ai_act_art5_biometric_profiling_fr"
        ]
      }
    ],
    "suggestedTopics": [],
    "optionalPolicyIds": [],
    "limitations": [
      "Local text checks do not establish regulatory applicability or compliance. Review individual Rule scope and handling before deployment."
    ]
  }
];
