"""
Guardrails Engine — AgentClamp
Handles safety policies, PII detection, competitor blocklists, prompt injection, bias, hallucinations, secrets compliance, and regulatory aspects.
"""

import os
import re
import base64
from typing import List, Dict, Any, Optional

# Presidio is imported lazily inside GuardrailsEngine.__init__ to avoid
# loading heavy NLP models at startup (saves ~200MB RAM on constrained hosts).
_presidio_analyzer = None
_presidio_anonymizer = None

def normalize_leetspeak(t: str) -> str:
    """Standardizes homoglyphs and leetspeak substitutions to standard characters."""
    mapping = {
        '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g',
        '@': 'a', '$': 's', '!': 'i', '|': 'i'
    }
    res = []
    for char in t:
        res.append(mapping.get(char, char))
    return "".join(res)

def try_decode_base64(s: str) -> Optional[str]:
    """Scans and extracts base64 encoded chunks, returning a decoded string if valid."""
    chunks = re.findall(r'[a-zA-Z0-9+/=]{12,}', s)
    decoded_texts = []
    for chunk in chunks:
        # Strip trailing padding first and re-add properly
        chunk = chunk.rstrip('=')
        pad_needed = len(chunk) % 4
        if pad_needed != 0:
            chunk += "=" * (4 - pad_needed)
        try:
            decoded = base64.b64decode(chunk).decode('utf-8', errors='ignore')
            if any(c.isalnum() for c in decoded) and len(decoded.strip()) >= 5:
                decoded_texts.append(decoded)
        except Exception:
            pass
    return " | ".join(decoded_texts) if decoded_texts else None

def try_decode_hex(s: str) -> Optional[str]:
    """Scans and extracts hexadecimal chunks, returning decoded bytes as utf-8 string."""
    chunks = re.findall(r'\b(?:[0-9a-fA-F]{2}){6,}\b', s)
    decoded_texts = []
    for chunk in chunks:
        try:
            decoded = bytes.fromhex(chunk).decode('utf-8', errors='ignore')
            if any(c.isalnum() for c in decoded) and len(decoded.strip()) >= 5:
                decoded_texts.append(decoded)
        except Exception:
            pass
    return " | ".join(decoded_texts) if decoded_texts else None

def try_decode_binary(s: str) -> Optional[str]:
    """Scans and decodes space-separated or chunked 8-bit binary patterns."""
    chunks = re.findall(r'\b[01]{8}(?:\s+[01]{8}){4,}\b', s)
    decoded_texts = []
    for chunk in chunks:
        try:
            bits = chunk.split()
            chars = [chr(int(b, 2)) for b in bits]
            decoded = "".join(chars)
            if any(c.isalnum() for c in decoded) and len(decoded.strip()) >= 5:
                decoded_texts.append(decoded)
        except Exception:
            pass
    return " | ".join(decoded_texts) if decoded_texts else None

def decode_rot13(s: str) -> str:
    """Decodes ROT13 encoded text strings."""
    res = []
    for c in s:
        if 'a' <= c <= 'z':
            res.append(chr((ord(c) - ord('a') + 13) % 26 + ord('a')))
        elif 'A' <= c <= 'Z':
            res.append(chr((ord(c) - ord('A') + 13) % 26 + ord('A')))
        else:
            res.append(c)
    return "".join(res)

# Presidio engines — lazy-loaded on first PII call to avoid loading
# heavy spaCy NLP models at startup (saves ~200-300MB RAM).
_analyzer = None
_anonymizer = None

def _get_presidio():
    """Lazily load Presidio engines on first use."""
    global _analyzer, _anonymizer
    if _analyzer is None:
        from presidio_analyzer import AnalyzerEngine
        from presidio_anonymizer import AnonymizerEngine
        _analyzer = AnalyzerEngine()
        _anonymizer = AnonymizerEngine()
    return _analyzer, _anonymizer


class GuardrailsEngine:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        config = {
            "pii_detection": True,
            "competitors": ["CompetitorA", "CompetitorB"],
            "prompt_injection": True,
            "bias_detection": True,
            "hallucination_check": True,
            "data_compliance": True,
            "regulatory_disclaimer": True
        }
        """
        self.config = config or {}
        self.pii_enabled = self.config.get("pii_detection", False)
        self.competitors = self.config.get("competitors", [])
        
        # New customizable safety switches
        self.prompt_injection_enabled = self.config.get("prompt_injection", False)
        self.bias_enabled = self.config.get("bias_detection", False)
        self.hallucination_enabled = self.config.get("hallucination_check", False)
        self.data_compliance_enabled = self.config.get("data_compliance", False)
        self.regulatory_disclaimer_enabled = self.config.get("regulatory_disclaimer", False)

    def detect_prompt_injection(self, text: str) -> Dict[str, Any]:
        """
        Holistically detects prompt injection and jailbreak attempts across 5 threat aspects:
        1. Goal Hijacking (Override Instructions)
        2. System Prompt Extraction (Instruction Leakage)
        3. Roleplay Virtualization (DAN / Simulation tricks)
        4. Context / Delimiter Escaping (Tags / Conversational fake turns)
        5. Obfuscated Bypass Attempts (Base64, Hex, Binary, ROT13, Leetspeak)
        """
        if not self.prompt_injection_enabled or not text:
            return {"flagged": False, "reason": None, "category": None}

        # Specialized Threat Aspect Scanning Matrices
        override_regexes = [
            r'(?i)\b(?:ignore|bypass|override|forget|reset|clear|disregard|neglect|circumvent|disable|skip)\b.*?\b(?:instructions?|prompts?|guidelines?|rules?|filters?|constraints?|security|policies?|system)\b',
            r'(?i)\b(?:do not follow|stop following)\b.*?\b(?:instructions?|prompts?|guidelines?|rules?|filters?|constraints?|security|policies?|system)\b',
            r'(?i)\b(?:new instructions|override instructions|bypass constraints|ignore standard filters)\b'
        ]

        leakage_regexes = [
            r'(?i)\b(?:reveal|show|print|output|display|read|write|expose|leak|tell|share|dump|get)\b.*?\b(?:system\s+(?:prompt|instructions?|directives?|rules?|guidelines?|message)|initial\s+(?:prompt|instructions?)|hidden\s+(?:prompt|instructions?|rules?))\b',
            r'(?i)\b(?:how were you configured|what is your system prompt|give me your system prompt|give me your prompt)\b',
            r'(?i)\b(?:write the text above|copy the rules above|repeat the instructions above|repeat your prompt)\b'
        ]

        roleplay_regexes = [
            r'(?i)\b(?:you are now|act as|simulate|pretend to be|fictional scenario|dan mode|developer mode|sudo mode|do anything now|jailbroken|hypothetical scenario|roleplay as|play the role of|operate as|respond as)\b',
            r'(?i)\b(?:jailbreak|bypass security|dan\s+\d+|do-anything-now|unrestricted mode|jailbroken mode|jailbreak mode)\b',
            r'(?i)\b(?:you have no rules|no constraints|free from safety|respond without filters|unfiltered mode)\b'
        ]

        delimiter_regexes = [
            r'(?i)(?:</system>|</span>|</div>|===|---|### System:|\[system\]|\[system prompt\]|</instruction>|</system_prompt>)',
            r'(?i)(?:^system:|^assistant:|^ai:|^user:|^human:|\n\s*system:|\n\s*assistant:|\n\s*ai:|\n\s*user:|\n\s*human:)',
            r'(?i)(?:stop generating|end of conversation|terminate prompt|new session)'
        ]

        # Exact keywords fallback list
        fallback_keywords = [
            "ignore previous instructions", "ignore all instructions", 
            "ignore previous prompts", "ignore all prompts", "ignore the above",
            "ignore previous guidelines", "bypass guidelines", "override guidelines",
            "system prompt override", "you are now a", "dan mode", 
            "jailbreak", "override security", "forget your guidelines",
            "execute system command", "bypass filters", "do anything now",
            "system override", "give me api key", "give me userid", "give me user id"
        ]

        # Scan text using all aspects
        def scan_text(t: str) -> Optional[Dict[str, str]]:
            t_lower = t.lower()
            t_norm = normalize_leetspeak(t_lower)

            # 1. Delimiter Escaping (Checked FIRST to avoid general roleplay false-category hits)
            for pattern in delimiter_regexes:
                if re.search(pattern, t_lower) or re.search(pattern, t_norm):
                    return {"category": "Context / Delimiter Escaping", "matched_pattern": pattern}

            # 2. Goal Hijacking
            for pattern in override_regexes:
                if re.search(pattern, t_lower) or re.search(pattern, t_norm):
                    return {"category": "Adversarial Override (Goal Hijacking)", "matched_pattern": pattern}

            # 3. Prompt Leakage
            for pattern in leakage_regexes:
                if re.search(pattern, t_lower) or re.search(pattern, t_norm):
                    return {"category": "System Prompt Extraction (Instruction Leakage)", "matched_pattern": pattern}

            # 4. Roleplay Jailbreak
            for pattern in roleplay_regexes:
                if re.search(pattern, t_lower) or re.search(pattern, t_norm):
                    return {"category": "Roleplay Virtualization (Jailbreak)", "matched_pattern": pattern}

            # 5. Fallback Keywords
            for kw in fallback_keywords:
                if kw in t_lower or kw in t_norm:
                    return {"category": "Adversarial Pattern Detected", "matched_pattern": kw}

            return None

        # Phase 1: Scan plain input text
        match = scan_text(text)
        if match:
            return {
                "flagged": True,
                "category": match["category"],
                "reason": f"Prompt Injection Blocked: {match['category']} detected."
            }

        # Phase 2: Obfuscated Decoding Pipeline
        # Check Base64
        b64_decoded = try_decode_base64(text)
        if b64_decoded:
            b64_match = scan_text(b64_decoded)
            if b64_match:
                return {
                    "flagged": True,
                    "category": "Obfuscated Bypass Attempt (Encoding)",
                    "reason": f"Prompt Injection Blocked: Obfuscated Bypass (Base64) triggers {b64_match['category']} policy. Decoded: '{b64_decoded}'"
                }

        # Check Hex
        hex_decoded = try_decode_hex(text)
        if hex_decoded:
            hex_match = scan_text(hex_decoded)
            if hex_match:
                return {
                    "flagged": True,
                    "category": "Obfuscated Bypass Attempt (Encoding)",
                    "reason": f"Prompt Injection Blocked: Obfuscated Bypass (Hex) triggers {hex_match['category']} policy. Decoded: '{hex_decoded}'"
                }

        # Check Binary
        binary_decoded = try_decode_binary(text)
        if binary_decoded:
            binary_match = scan_text(binary_decoded)
            if binary_match:
                return {
                    "flagged": True,
                    "category": "Obfuscated Bypass Attempt (Encoding)",
                    "reason": f"Prompt Injection Blocked: Obfuscated Bypass (Binary) triggers {binary_match['category']} policy. Decoded: '{binary_decoded}'"
                }

        # Check ROT13
        rot13_decoded = decode_rot13(text)
        if rot13_decoded and rot13_decoded != text:
            rot13_match = scan_text(rot13_decoded)
            if rot13_match:
                return {
                    "flagged": True,
                    "category": "Obfuscated Bypass Attempt (Encoding)",
                    "reason": f"Prompt Injection Blocked: Obfuscated Bypass (ROT13) triggers {rot13_match['category']} policy. Decoded: '{rot13_decoded}'"
                }

        return {"flagged": False, "reason": None, "category": None}

    def detect_secrets(self, text: str) -> str:
        """Scan input/output for API keys, passwords, and private tokens."""
        if not self.data_compliance_enabled or not text:
            return text

        processed_text = text

        # Regex for common API keys / credentials
        secrets_patterns = {
            "OpenAI API Key": r"sk-[a-zA-Z0-9]{48}",
            "GitHub Token": r"ghp_[a-zA-Z0-9]{36}",
            "Generic Credentials": r"(?i)(password|passwd|db_password|db_pass)\s*=\s*['\"][a-zA-Z0-9_\-@#$!%^&*()+]+['\"]"
        }

        for name, pattern in secrets_patterns.items():
            processed_text = re.sub(pattern, f"[REDACTED {name.upper()}]", processed_text)

        return processed_text

    def validate_input(self, text: str) -> str:
        """Process user input before it reaches the LLM."""
        if not text:
            return text

        processed_text = text

        # 1. PII Detection (Anonymize)
        if self.pii_enabled:
            try:
                from presidio_anonymizer.entities import OperatorConfig
                analyzer, anonymizer = _get_presidio()
                results = analyzer.analyze(text=processed_text, language='en')
                anonymized_result = anonymizer.anonymize(
                    text=processed_text,
                    analyzer_results=results,
                    operators={
                        "PERSON": OperatorConfig("replace", {"new_value": "[PERSON]"}),
                        "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "[EMAIL]"}),
                        "PHONE_NUMBER": OperatorConfig("mask", {"type": "mask", "masking_char": "*", "number_of_chars": 5, "masking_direction": "backward"}),
                    }
                )
                processed_text = anonymized_result.text
            except Exception as e:
                print(f"Presidio error: {e}")

        # 2. Scrub secrets & private tokens
        if self.data_compliance_enabled:
            processed_text = self.detect_secrets(processed_text)

        return processed_text

    def detect_cognitive_violations(self, text: str, user_input: Optional[str] = None) -> Dict[str, Any]:
        """Perform a cognitive safety audit using a lightweight LLM."""
        cognitive_policies = []
        if self.bias_enabled:
            cognitive_policies.append("bias_detection (fairness/generalizations)")
        if self.hallucination_enabled:
            cognitive_policies.append("hallucination_check (ungrounded claims)")
        if self.regulatory_disclaimer_enabled:
            cognitive_policies.append("regulatory_disclaimer (finance/medical/legal advice)")

        if not cognitive_policies or not text:
            return {"flagged": False, "policy": None, "reason": None}

        try:
            # Import dynamically to avoid circular dependencies
            from core.litellm_client import get_langchain_llm
            import json

            # Resolve default model & provider from env
            provider = os.getenv("DEFAULT_PROVIDER", "groq")
            model = os.getenv("DEFAULT_MODEL", "llama-3.1-8b-instant")

            # Create a client
            eval_llm = get_langchain_llm(provider=provider, model=model, temperature=0.0)

            policies_list_str = "\n".join(f"- {p}" for p in cognitive_policies)
            system_prompt = (
                "You are an AI Safety Auditor. Your task is to analyze the proposed response from an AI assistant "
                "to a user prompt, and determine if it violates the active safety policies.\n"
                "ACTIVE SAFETY POLICIES YOU MUST AUDIT:\n"
                f"{policies_list_str}\n\n"
                "Return a JSON object in this exact format, with no markdown formatting tags and no extra text:\n"
                "{\n"
                "  \"flagged\": true/false,\n"
                "  \"policy\": \"hallucination_check\" / \"bias_detection\" / \"regulatory_disclaimer\" / null,\n"
                "  \"reason\": \"a short explanation of the safety violation\" / null\n"
                "}"
            )

            prompt_content = f"User Prompt: {user_input or 'N/A'}\nProposed Assistant Response: {text}"

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt_content}
            ]

            response = eval_llm.invoke(messages)
            content = response.content.strip()

            # Clean JSON markdown fences if the LLM outputted them
            if content.startswith("```"):
                content = re.sub(r"^```(?:json)?\n|```$", "", content, flags=re.MULTILINE).strip()

            result = json.loads(content)
            return {
                "flagged": result.get("flagged", False),
                "policy": result.get("policy"),
                "reason": result.get("reason")
            }
        except Exception as e:
            print(f"[GUARDRAILS] Cognitive audit failed: {e}")
            return {"flagged": False, "policy": None, "reason": None}

    def validate_output(self, text: str, user_input: Optional[str] = None) -> Dict[str, Any]:
        """Validate LLM output and check safety policies before it reaches the user."""
        if not text:
            return {"text": text, "flagged": False, "reason": None, "hitl_required": False, "hitl_policy": None}

        processed_text = text
        flagged = False
        reason = None
        hitl_required = False
        hitl_policy = None

        # ── Stage 1: Deterministic Safeguards ───────────────────────
        
        # 1. Competitor Block Check
        for comp in self.competitors:
            if comp.lower() in processed_text.lower():
                return {
                    "text": f"I'm sorry, I cannot discuss {comp} or other competitors.",
                    "flagged": True,
                    "reason": f"Competitor Blocked: {comp}",
                    "hitl_required": False,
                    "hitl_policy": None
                }

        # 2. Data Compliance Check (Secrets in output)
        if self.data_compliance_enabled:
            scrubbed = self.detect_secrets(processed_text)
            if scrubbed != processed_text:
                processed_text = scrubbed
                # Secret leak is a high-security risk; require Human-in-the-Loop review
                hitl_required = True
                hitl_policy = "data_compliance"
                reason = "Sensitive credentials/API keys leak scrubbed and paused for manual security review."

        # ── Stage 2: Cognitive LLM Audits ───────────────────────────
        
        cognitive_audit_ran = False
        cognitive_flagged = False
        
        if self.bias_enabled or self.hallucination_enabled or self.regulatory_disclaimer_enabled:
            audit = self.detect_cognitive_violations(processed_text, user_input=user_input)
            cognitive_audit_ran = True
            
            if audit.get("flagged"):
                cognitive_flagged = True
                hitl_required = True
                hitl_policy = audit.get("policy") or "cognitive_safety"
                reason = audit.get("reason") or "Cognitive safety audit flagged response."
                
                # Append regulatory disclaimer text if flagged
                if hitl_policy == "regulatory_disclaimer":
                    disclaimer = (
                        "\n\n*Disclaimer: This response contains information related to professional advice topics. "
                        "AgentClamp AI does not provide professional advice. Consult a certified professional.*"
                    )
                    if disclaimer not in processed_text:
                        processed_text += disclaimer

        # Fallback to heuristics if cognitive audit is disabled or did not flag
        if not cognitive_flagged:
            # 3. Bias Generalization Check
            if self.bias_enabled:
                bias_patterns = ["all women are", "all men are", "all politicians are", "always inferior", "inherently lazy"]
                text_lower = processed_text.lower()
                for pattern in bias_patterns:
                    if pattern in text_lower:
                        processed_text += "\n\n⚠️ *[Bias Warning]: This response may contain generalizations or stereotypes. Evaluated against fairness policies.*"
                        hitl_required = True
                        hitl_policy = "bias_detection"
                        reason = f"Potential bias stereotype '{pattern}' detected."
                        break

            # 4. Hallucination Check (numeric bounds & confidence check)
            if self.hallucination_enabled and not hitl_required:
                hallucination_keywords = ["highly speculative", "made up this number", "guessing the answer", "don't quote me on this"]
                text_lower = processed_text.lower()
                for kw in hallucination_keywords:
                    if kw in text_lower:
                        processed_text += "\n\n⚠️ *[Hallucination Warning]: Potential ungrounded claims or unconfident generation detected.*"
                        hitl_required = True
                        hitl_policy = "hallucination_check"
                        reason = f"Low confidence keyword '{kw}' flagged as potential hallucination."
                        break

            # 5. Regulatory advice aspects (Finance, Medicine, Law disclaimers)
            if self.regulatory_disclaimer_enabled and not hitl_required:
                triggers = {
                    "financial": ["invest in", "buy stock", "stock portfolio", "financial returns", "crypto returns", "get rich"],
                    "medical": ["take this pill", "medical cure for", "prescribe", "take antibiotics", "diagnose your symptoms"],
                    "legal": ["lawsuit advice", "sue them", "legally binding contract", "file a claim in court"]
                }
                text_lower = processed_text.lower()
                triggered_area = None
                for area, keywords in triggers.items():
                    for kw in keywords:
                        if kw in text_lower:
                            triggered_area = area
                            break
                    if triggered_area:
                        break

                if triggered_area:
                    disclaimer = (
                        f"\n\n*Disclaimer: This response contains information related to {triggered_area} topics. "
                        "AgentClamp AI does not provide professional advice. Consult a certified professional.*"
                    )
                    if disclaimer not in processed_text:
                        processed_text += disclaimer
                    hitl_required = True
                    hitl_policy = "regulatory_disclaimer"
                    reason = f"Regulatory warning: Sensitive {triggered_area} context flagged."

        return {
            "text": processed_text,
            "flagged": flagged,
            "reason": reason,
            "hitl_required": hitl_required,
            "hitl_policy": hitl_policy
        }

def apply_guardrails_to_stream(text_chunk: str, config: Dict[str, Any]) -> str:
    """Helper for streaming responses."""
    return text_chunk

