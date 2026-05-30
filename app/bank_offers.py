import logging
import re

from .calculators import credit_traffic_light

logger = logging.getLogger(__name__)

_FALLBACK_OFFERS: list[dict] = [
    # Т-Банк
    {"bank_name": "Т-Банк",            "domain": "tbank.ru",           "rate": 13.9, "loan_months": 12,  "offer_url": "https://tbank.ru/credits/cash/"},
    {"bank_name": "Т-Банк",            "domain": "tbank.ru",           "rate": 14.9, "loan_months": 36,  "offer_url": "https://tbank.ru/credits/cash/"},
    {"bank_name": "Т-Банк",            "domain": "tbank.ru",           "rate": 15.9, "loan_months": 60,  "offer_url": "https://tbank.ru/credits/cash/"},
    # Сбербанк
    {"bank_name": "Сбербанк",          "domain": "sber.ru",            "rate": 14.5, "loan_months": 24,  "offer_url": "https://sber.ru/credits/consumer"},
    {"bank_name": "Сбербанк",          "domain": "sber.ru",            "rate": 15.9, "loan_months": 60,  "offer_url": "https://sber.ru/credits/consumer"},
    # Альфа-Банк
    {"bank_name": "Альфа-Банк",        "domain": "alfabank.ru",        "rate": 14.5, "loan_months": 24,  "offer_url": "https://alfabank.ru/get-money/credit/cash/"},
    {"bank_name": "Альфа-Банк",        "domain": "alfabank.ru",        "rate": 16.9, "loan_months": 60,  "offer_url": "https://alfabank.ru/get-money/credit/cash/"},
    # ВТБ
    {"bank_name": "ВТБ",               "domain": "vtb.ru",             "rate": 15.4, "loan_months": 36,  "offer_url": "https://vtb.ru/personal/kredit/nalichnymi/"},
    {"bank_name": "ВТБ",               "domain": "vtb.ru",             "rate": 17.4, "loan_months": 84,  "offer_url": "https://vtb.ru/personal/kredit/nalichnymi/"},
    # Газпромбанк
    {"bank_name": "Газпромбанк",       "domain": "gazprombank.ru",     "rate": 15.9, "loan_months": 36,  "offer_url": "https://gazprombank.ru/personal/kredit/"},
    {"bank_name": "Газпромбанк",       "domain": "gazprombank.ru",     "rate": 17.9, "loan_months": 60,  "offer_url": "https://gazprombank.ru/personal/kredit/"},
    # Россельхозбанк
    {"bank_name": "Россельхозбанк",    "domain": "rshb.ru",            "rate": 16.5, "loan_months": 36,  "offer_url": "https://rshb.ru/natural/loans/consumer/"},
    {"bank_name": "Россельхозбанк",    "domain": "rshb.ru",            "rate": 18.5, "loan_months": 60,  "offer_url": "https://rshb.ru/natural/loans/consumer/"},
    # МТС Банк
    {"bank_name": "МТС Банк",          "domain": "mtsbank.ru",         "rate": 15.9, "loan_months": 24,  "offer_url": "https://mtsbank.ru/personal/credits/cash/"},
    {"bank_name": "МТС Банк",          "domain": "mtsbank.ru",         "rate": 17.4, "loan_months": 48,  "offer_url": "https://mtsbank.ru/personal/credits/cash/"},
    # Почта Банк
    {"bank_name": "Почта Банк",        "domain": "pochtabank.ru",      "rate": 17.9, "loan_months": 36,  "offer_url": "https://pochtabank.ru/product/credit"},
    {"bank_name": "Почта Банк",        "domain": "pochtabank.ru",      "rate": 19.9, "loan_months": 60,  "offer_url": "https://pochtabank.ru/product/credit"},
    # Совкомбанк
    {"bank_name": "Совкомбанк",        "domain": "sovcombank.ru",      "rate": 17.9, "loan_months": 24,  "offer_url": "https://sovcombank.ru/credits/nalichnymi/"},
    {"bank_name": "Совкомбанк",        "domain": "sovcombank.ru",      "rate": 19.9, "loan_months": 60,  "offer_url": "https://sovcombank.ru/credits/nalichnymi/"},
    # Росбанк
    {"bank_name": "Росбанк",           "domain": "rosbank.ru",         "rate": 16.9, "loan_months": 36,  "offer_url": "https://rosbank.ru/credits/cash/"},
    {"bank_name": "Росбанк",           "domain": "rosbank.ru",         "rate": 18.9, "loan_months": 60,  "offer_url": "https://rosbank.ru/credits/cash/"},
    # Уралсиб
    {"bank_name": "Уралсиб",           "domain": "uralsib.ru",         "rate": 17.5, "loan_months": 36,  "offer_url": "https://uralsib.ru/credits/kredit-nalichnymi/"},
    # Промсвязьбанк
    {"bank_name": "Промсвязьбанк",     "domain": "psbank.ru",          "rate": 17.9, "loan_months": 36,  "offer_url": "https://psbank.ru/personal/credits/nalichnye/"},
    # Ренессанс Кредит
    {"bank_name": "Ренессанс Кредит",  "domain": "rencredit.ru",       "rate": 19.9, "loan_months": 24,  "offer_url": "https://rencredit.ru/credits/nalichnymi/"},
    {"bank_name": "Ренессанс Кредит",  "domain": "rencredit.ru",       "rate": 22.9, "loan_months": 12,  "offer_url": "https://rencredit.ru/credits/nalichnymi/"},
    # МКБ
    {"bank_name": "МКБ",               "domain": "mkb.ru",             "rate": 18.5, "loan_months": 36,  "offer_url": "https://mkb.ru/personal/credits/nalichnymi/"},
    # ОТП Банк
    {"bank_name": "ОТП Банк",          "domain": "otpbank.ru",         "rate": 19.9, "loan_months": 24,  "offer_url": "https://otpbank.ru/credits/cash/"},
    # Ак Барс Банк
    {"bank_name": "Ак Барс Банк",      "domain": "akbars.ru",          "rate": 18.9, "loan_months": 36,  "offer_url": "https://akbars.ru/individuals/credits/consumer/"},
    # Банк БСПБ
    {"bank_name": "Банк БСПБ",         "domain": "bspb.ru",            "rate": 19.5, "loan_months": 36,  "offer_url": "https://bspb.ru/personal/credits/consumer"},
    # Абсолют Банк
    {"bank_name": "Абсолют Банк",      "domain": "absolutbank.ru",     "rate": 19.9, "loan_months": 48,  "offer_url": "https://absolutbank.ru/personal/credits/"},
    # Хоум Банк
    {"bank_name": "Хоум Банк",         "domain": "hcfbank.ru",         "rate": 21.9, "loan_months": 24,  "offer_url": "https://hcfbank.ru/credits/cash/"},
    # УБРиР
    {"bank_name": "УБРиР",             "domain": "ubrir.ru",           "rate": 20.9, "loan_months": 36,  "offer_url": "https://ubrir.ru/individuals/credits/kredit-nalichnymi/"},
    # Банк Зенит
    {"bank_name": "Банк Зенит",        "domain": "zenit.ru",           "rate": 21.5, "loan_months": 36,  "offer_url": "https://zenit.ru/personal/credits/cash/"},
    # СКБ-Банк
    {"bank_name": "СКБ-Банк",          "domain": "skbbank.ru",         "rate": 22.5, "loan_months": 24,  "offer_url": "https://skbbank.ru/private/credits/"},
    # Банк ДОМ.РФ
    {"bank_name": "Банк ДОМ.РФ",      "domain": "domrfbank.ru",       "rate": 17.9, "loan_months": 84,  "offer_url": "https://domrfbank.ru/products/credits/"},
    # РНКБ Банк
    {"bank_name": "РНКБ Банк",         "domain": "rncb.ru",            "rate": 19.9, "loan_months": 36,  "offer_url": "https://rncb.ru/individuals/credits/consumer/"},
    # Русский Стандарт
    {"bank_name": "Русский Стандарт",  "domain": "rsb.ru",             "rate": 26.9, "loan_months": 12,  "offer_url": "https://rsb.ru/credits/cash/"},
    # Кредит Европа Банк
    {"bank_name": "Кредит Европа",     "domain": "crediteurope.ru",    "rate": 24.9, "loan_months": 24,  "offer_url": "https://crediteurope.ru/credits/cash/"},
    # Синара Банк
    {"bank_name": "Синара Банк",       "domain": "sinara.ru",          "rate": 22.9, "loan_months": 36,  "offer_url": "https://sinara.ru/personal/credits/"},
    # Экспобанк
    {"bank_name": "Экспобанк",         "domain": "expobank.ru",        "rate": 21.9, "loan_months": 48,  "offer_url": "https://expobank.ru/personal/credits/"},
    # Банк Авангард
    {"bank_name": "Банк Авангард",     "domain": "avangard.ru",        "rate": 24.5, "loan_months": 12,  "offer_url": "https://avangard.ru/individuals/credits/"},
    # Металлинвестбанк
    {"bank_name": "Металлинвестбанк",  "domain": "metallinvestbank.ru","rate": 23.9, "loan_months": 36,  "offer_url": "https://metallinvestbank.ru/natural/credits/"},
    # Кубань Кредит
    {"bank_name": "Кубань Кредит",     "domain": "kubankredit.ru",     "rate": 22.0, "loan_months": 24,  "offer_url": "https://kubankredit.ru/individuals/credits/"},
    # СДМ-Банк
    {"bank_name": "СДМ-Банк",          "domain": "sdm.ru",             "rate": 21.0, "loan_months": 36,  "offer_url": "https://sdm.ru/individuals/credits/"},
    # Банк Центр-Инвест
    {"bank_name": "Банк Центр-Инвест", "domain": "centrinvest.ru",     "rate": 20.5, "loan_months": 48,  "offer_url": "https://centrinvest.ru/individuals/credits/"},
    # Левобережный Банк
    {"bank_name": "Левобережный Банк", "domain": "nskbl.ru",           "rate": 23.5, "loan_months": 24,  "offer_url": "https://nskbl.ru/individuals/credits/"},
    # Инбанк
    {"bank_name": "Инбанк",            "domain": "inbank.ru",          "rate": 23.0, "loan_months": 24,  "offer_url": "https://inbank.ru/credits/"},
    # АТБ
    {"bank_name": "АТБ",               "domain": "atb24.ru",           "rate": 24.0, "loan_months": 36,  "offer_url": "https://atb24.ru/credits/"},
]


def get_fallback_offers() -> list[dict]:
    return list(_FALLBACK_OFFERS)


# ── Validation (used when LLM-extracted offers are re-enabled) ─────────────────

_GEO_SLDS = {
    "spb", "msk", "ekb", "nsk", "nn", "kzn", "rnd",
    "moscow", "peterburg", "petersburg", "russia", "siberia",
    "city", "region", "oblast",
}
_SKIP_WORDS = {"банк", "банка", "банке", "банком", "банков"}
_TRANSLIT = str.maketrans({
    'а': 'a',  'б': 'b',  'в': 'v',  'г': 'g',  'д': 'd',
    'е': 'e',  'ё': 'e',  'ж': 'zh', 'з': 'z',  'и': 'i',
    'й': 'y',  'к': 'k',  'л': 'l',  'м': 'm',  'н': 'n',
    'о': 'o',  'п': 'p',  'р': 'r',  'с': 's',  'т': 't',
    'у': 'u',  'ф': 'f',  'х': 'kh', 'ц': 'ts', 'ч': 'ch',
    'ш': 'sh', 'щ': 'sch','ъ': '',   'ы': 'y',  'ь': '',
    'э': 'e',  'ю': 'yu', 'я': 'ya',
})


def _domain_matches_bank(bank_name: str, domain: str) -> bool:
    sld = domain.split(".")[0].lower()
    if sld in _GEO_SLDS:
        return False
    words = [w.lower() for w in re.split(r"[\s\-/]+", bank_name) if w.lower() not in _SKIP_WORDS and w]
    if not words:
        return True
    for word in words:
        lat = word.translate(_TRANSLIT)
        if len(lat) <= 3:
            if lat in sld:
                return True
        else:
            if lat[:4] in sld:
                return True
    return False


def _is_valid_offer(offer: dict) -> bool:
    rate = float(offer.get("rate") or 0)
    bank_name = offer.get("bank_name", "")
    domain = offer.get("domain", "")
    if not (5.0 <= rate <= 60.0):
        logger.warning(f"[bank_offers] filtered (rate out of range): {bank_name} rate={rate}")
        return False
    if not _domain_matches_bank(bank_name, domain):
        logger.warning(f"[bank_offers] filtered (domain mismatch): {bank_name} domain={domain}")
        return False
    return True


# ── Scoring ────────────────────────────────────────────────────────────────────

def _score(rate: float, months: int, loan_rate: float, loan_months: int) -> float:
    rate_part = max(0.0, 1 - abs(rate - loan_rate) / loan_rate) * 40 if loan_rate > 0 else 40.0
    months_part = max(0.0, 1 - abs(months - loan_months) / loan_months) * 60 if loan_months > 0 else 60.0
    return rate_part + months_part


def score_offers(
    offers: list[dict],
    loan_rate: float,
    loan_months: int,
    loan_amount: float,
    trusted: bool = False,
) -> list[dict]:
    result = []
    seen_banks: set[str] = set()

    for offer in offers:
        bank_name = offer.get("bank_name")
        domain = offer.get("domain")
        if not bank_name or not domain:
            continue

        if not trusted:
            if not _is_valid_offer(offer):
                continue
            if bank_name in seen_banks:
                logger.warning(f"[bank_offers] filtered (duplicate): {bank_name}")
                continue
            seen_banks.add(bank_name)

        rate = float(offer.get("rate") or 0)
        months = int(offer.get("loan_months") or loan_months)

        calc = credit_traffic_light(
            monthly_income=999_999.0,
            current_payments=0.0,
            new_loan_amount=loan_amount,
            new_loan_rate_annual=rate,
            new_loan_months=months,
        )

        result.append({
            "bank_name": bank_name,
            "domain": domain,
            "rate": rate,
            "loan_months": months,
            "monthly_payment": calc["monthly_payment"],
            "score": round(_score(rate, months, loan_rate, loan_months)),
            "logo_url": f"https://img.logo.dev/{domain}?token=free",
            "offer_url": offer.get("offer_url") or f"https://{domain}",
        })

    result.sort(key=lambda x: x["score"], reverse=True)
    return result[:6]
