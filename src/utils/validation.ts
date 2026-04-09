export const skincareKeywords = [
  "water", "aqua", "glycerin", "acid", "extract", "oil", "alcohol", "serum", "cream", "lotion", 
  "cleanser", "toner", "moisturizer", "spf", "sunscreen", "retinol", "niacinamide", "hyaluronic", 
  "vitamin", "zinc", "oxide", "sulfate", "paraben", "fragrance", "perfume", "essential", 
  "glycol", "sodium", "potassium", "stearate", "palmitate", "cetyl", "stearyl", "dimethicone", 
  "silicone", "peptide", "ceramide", "squalane", "urea", "panthenol", "allantoin", "aloe", 
  "vera", "green", "tea", "rose", "witch", "hazel", "salicylic", "glycolic", "lactic", 
  "mandelic", "azelaic", "kojic", "tranexamic", "ferulic", "resveratrol", "bakuchiol", 
  "centella", "asiatica", "cica", "mugwort", "propolis", "honey", "snail", "mucin", 
  "galactomyces", "bifida", "ferment", "yeast", "rice", "oat", "colloidal", "clay", 
  "kaolin", "bentonite", "charcoal", "sulfur", "benzoyl", "peroxide", "tretinoin", 
  "adapalene", "tazarotene", "laurate", "myristate", "caprylic", "triglyceride", "phenoxyethanol",
  "face", "skin", "body", "wash", "gel", "mask", "peel", "scrub", "exfoliant", "balm", "stick", "butter",
  "dry", "oily", "combination", "sensitive", "acne", "wrinkles", "aging", "texture", "pores", "blackheads",
  "cerave", "cetaphil", "ordinary", "paula", "choice", "neutrogena", "aveeno", "laroche", "posay", "vichy",
  "eucerin", "bioderma", "skinceuticals", "drunk", "elephant", "tatcha", "sunday", "riley", "glossier",
  "kiehl", "clinique", "estee", "lauder", "lancome", "shiseido", "innisfree", "cosrx", "klairs", "purito",
  "laneige", "sulwhasoo", "hadalabo", "rohto", "biore", "anessa", "sk-ii", "skii", "origins", "fresh",
  "none", "nothing", "don't", "dont", "use", "any", "routine", "morning", "night", "am", "pm", "daily",
  "cleansing", "moisturizing", "protecting", "treating", "serums", "acids", "vitamins", "products", "skincare",
  "regimen", "steps", "step", "first", "second", "third", "fourth", "fifth",
  "redness", "dark", "spots", "hyperpigmentation", "melasma", "rosacea", "eczema", "psoriasis", "dermatitis",
  "glow", "brightening", "hydrating", "soothing", "calming", "firming", "lifting", "anti-aging",
  "murad", "dermalogica", "obagi", "perricone", "kate", "somerville", "peter", "thomas", "roth", "ole", "henriksen",
  "moisturise", "moisturising", "cleans", "cleansing", "wash", "soap", "sunblock", "sunscreen", "spf", "uv",
  "brand", "brands", "list", "names", "currently", "using", "products", "skincare", "routine",
  "beef", "tallow", "lard", "fat", "tret", "taz", "aa", "vit", "c", "b5", "b3"
];

const profanity = [
  "fuck", "shit", "asshole", "bitch", "dick", "pussy", "cunt", "bastard", "idiot", "stupid", "dumb", "moron",
  "nigger", "faggot", "retard", "slut", "whore", "rape", "kill", "die", "suicide", "porn", "sex", "naked"
];

export interface ValidationResult {
  isValid: boolean;
  isVague?: boolean;
  error?: string;
}

export const validateDisplayName = (name: string): ValidationResult => {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: "Display name cannot be empty." };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: "Display name is too short." };
  }
  if (trimmed.length > 30) {
    return { isValid: false, error: "Display name is too long." };
  }

  const lower = trimmed.toLowerCase();
  const isProfane = profanity.some(p => lower.includes(p));
  if (isProfane) {
    return { isValid: false, error: "Please choose a different display name." };
  }

  return { isValid: true };
};

export const validateSkincareInput = (text: string): ValidationResult => {
  const trimmed = text.trim();
  
  if (!trimmed) {
    return { isValid: false, error: "Input cannot be empty." };
  }

  const lower = trimmed.toLowerCase();

  // 1. Profanity & Insults (Keep this for safety)
  const isProfane = profanity.some(p => lower.includes(p));
  if (isProfane) {
    return { isValid: false, error: "Please use appropriate language. We couldn't process your request." };
  }

  // 2. Basic Garbage Check (Only block if it's purely non-alphanumeric or extremely repetitive)
  // We allow misspellings and long chemical names by removing the aggressive nonsenseRegex.
  const hasAlphanumeric = /[a-z0-9]/i.test(trimmed);
  const isPureSymbols = !hasAlphanumeric && trimmed.length > 3;
  const isExtremelyRepetitive = /(.)\1{15,}/.test(trimmed); // Only block if a single char repeats 15+ times

  if (isPureSymbols || isExtremelyRepetitive) {
    return { isValid: false, error: "We couldn't recognize that as valid skincare information. Please enter real words." };
  }

  // 3. Length Check
  if (trimmed.length < 2) {
    return { isValid: false, error: "Input is too short. Please provide more detail." };
  }

  // 4. Vague Detection
  const wordCount = trimmed.split(/\s+/).length;
  const hasListMarkers = trimmed.includes(",") || trimmed.includes("\n") || trimmed.includes(";");
  
  let isVague = false;
  // If it's just 1-3 words and doesn't look like a list, flag as vague but valid
  if (wordCount <= 3 && !hasListMarkers && trimmed.length < 50) {
    isVague = true;
  }

  // We no longer require keywords to be present, allowing the AI to handle 
  // misspelled or niche ingredients.
  return { isValid: true, isVague };
};
