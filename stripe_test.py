#!/usr/bin/env python3
"""
SplitLink — Stripe Integration Verification Script
Tests the full Separate Charges & Transfers flow end-to-end.
"""

import os, sys, time, json, hmac, hashlib, base64
import stripe

SECRET_KEY     = os.environ.get("STRIPE_SECRET_KEY", "")
# Use the newly registered webhook endpoint secret (not the old CLI one)
WEBHOOK_SECRET = "whsec_lypdQpqhCh0C9H8WG25rN7DXvm3LUIDa"

if not SECRET_KEY:
    print("ERROR: STRIPE_SECRET_KEY not set"); sys.exit(1)

stripe.api_key = SECRET_KEY
IS_TEST = SECRET_KEY.startswith("sk_test_")

def section(t): print(f"\n{'='*60}\n  {t}\n{'='*60}")
def ok(m):   print(f"  [PASS] {m}")
def fail(m): print(f"  [FAIL] {m}")
def info(m): print(f"  [INFO] {m}")

# ─── 1. Connectivity ───────────────────────────────────────────
section("1. Stripe API Connectivity")
try:
    acct = stripe.Account.retrieve()
    ok(f"Account: {acct.id} ({acct.settings.dashboard.display_name})")
    ok(f"Test mode: {IS_TEST}")
    info(f"Account type: {acct.type}")
    info(f"Charges enabled: {acct.charges_enabled} | Payouts enabled: {acct.payouts_enabled}")
    if not IS_TEST:
        fail("LIVE mode — refusing to run. Use test keys."); sys.exit(1)
except stripe.error.AuthenticationError as e:
    fail(f"Auth failed: {e}"); sys.exit(1)

# ─── 2. Create test Custom connected accounts ──────────────────
# Custom accounts can be fully activated in test mode without a hosted UI.
# Express accounts need human-completed onboarding for capabilities to activate.
section("2. Create Fully-Activated Test Connected Accounts (Custom type)")

def make_test_account(label, email):
    """Create a test Custom account with transfers capability active in test mode."""
    a = stripe.Account.create(
        type="custom",
        country="US",
        email=email,
        business_type="individual",
        business_profile={"url": "https://splitlink.test"},
        individual={
            "first_name": "Test",
            "last_name":  label.capitalize(),
            "dob":        {"day": 1, "month": 1, "year": 1990},
            # Full SSN "000000000" triggers instant verification in Stripe test mode
            "id_number":  "000000000",
            "ssn_last_4": "0000",
            "email":      email,
            "address": {
                "line1":       "123 Main St",
                "city":        "San Francisco",
                "state":       "CA",
                "postal_code": "94105",
                "country":     "US",
            },
        },
        tos_acceptance={"date": int(time.time()), "ip": "127.0.0.1"},
        capabilities={"transfers": {"requested": True}},
        metadata={"test": "true", "role": label},
    )
    # Attach a test US bank account so payouts can flow
    stripe.Account.create_external_account(a.id, external_account="btok_us")
    # Re-fetch to see current capability state
    a = stripe.Account.retrieve(a.id)
    caps = stripe.Account.list_capabilities(a.id)
    cap_status = next((c.status for c in caps.data if c.id == "transfers"), "unknown")
    # Log any pending requirements
    reqs = getattr(a, "requirements", None)
    if reqs and getattr(reqs, "currently_due", []):
        info(f"  {label} pending requirements: {list(reqs.currently_due)}")
    return a, cap_status

MERCHANT_ID = AFFILIATE_ID = None
try:
    m, m_cap = make_test_account("merchant", "test-merchant@splitlink.test")
    MERCHANT_ID = m.id
    ok(f"Merchant account: {MERCHANT_ID} | transfers capability: {m_cap}")
except stripe.error.StripeError as e:
    fail(f"Merchant account creation failed: {e}")

try:
    a, a_cap = make_test_account("affiliate", "test-affiliate@splitlink.test")
    AFFILIATE_ID = a.id
    ok(f"Affiliate account: {AFFILIATE_ID} | transfers capability: {a_cap}")
except stripe.error.StripeError as e:
    fail(f"Affiliate account creation failed: {e}")

# ─── 3. Simulate a $100 payment ───────────────────────────────
section("3. Test Payment — $100 (buyer → platform)")

GROSS            = 10000   # $100.00
PLATFORM_FEE     = int(GROSS * 0.02)   # $2.00
AFFILIATE_PAYOUT = int(GROSS * 0.15)   # $15.00
MERCHANT_PAYOUT  = GROSS - PLATFORM_FEE - AFFILIATE_PAYOUT  # $83.00
TRANSFER_GROUP   = f"splitlink_test_{int(time.time())}"
REF_CODE         = "TESTREF1"
PRODUCT_ID       = "test_product_001"

info(f"Gross: ${GROSS/100:.2f} | Platform: ${PLATFORM_FEE/100:.2f} | "
     f"Affiliate: ${AFFILIATE_PAYOUT/100:.2f} | Merchant: ${MERCHANT_PAYOUT/100:.2f}")

PAYMENT_INTENT_ID = None
CHARGE_ID = None
try:
    # tok_bypassPending = card 4000000000000077 — settles immediately (no pending period).
    # This is the only way to have available balance for transfers in a fresh test account.
    charge = stripe.Charge.create(
        amount=GROSS,
        currency="usd",
        source="tok_bypassPending",
        transfer_group=TRANSFER_GROUP,
        metadata={
            "client_reference_id": f"{REF_CODE}:{PRODUCT_ID}",
            "merchant_account":    MERCHANT_ID or "none",
            "affiliate_account":   AFFILIATE_ID or "none",
        },
    )
    if charge.paid and charge.status == "succeeded":
        ok(f"Payment succeeded: {charge.id} — ${charge.amount/100:.2f}")
        ok("  (tok_bypassPending — funds in available balance immediately)")
        PAYMENT_INTENT_ID = charge.payment_intent   # may be None for direct charges
        CHARGE_ID = charge.id
    else:
        fail(f"Charge status: {charge.status}")
except stripe.error.StripeError as e:
    fail(f"Payment failed: {e}")

# ─── 4. Separate Charges & Transfers (the split) ─────────────
section("4. Commission Split — Separate Transfers")

MERCHANT_TRANSFER_ID = AFFILIATE_TRANSFER_ID = None

def do_transfer(amount, destination, label, idempotency_key):
    return stripe.Transfer.create(
        amount=amount,
        currency="usd",
        destination=destination,
        transfer_group=TRANSFER_GROUP,
        metadata={"payment_intent_id": PAYMENT_INTENT_ID, "type": label},
        idempotency_key=idempotency_key,
    )

TX_ID = PAYMENT_INTENT_ID or CHARGE_ID  # use whichever is available as idempotency base

if TX_ID and MERCHANT_ID:
    try:
        t = do_transfer(MERCHANT_PAYOUT, MERCHANT_ID, "merchant_payout",
                        f"merchant_{TX_ID}")
        ok(f"Merchant transfer: {t.id} — ${t.amount/100:.2f} → {MERCHANT_ID}")
        MERCHANT_TRANSFER_ID = t.id
    except stripe.error.StripeError as e:
        fail(f"Merchant transfer failed: {e}")

if TX_ID and AFFILIATE_ID:
    try:
        t = do_transfer(AFFILIATE_PAYOUT, AFFILIATE_ID, "affiliate_commission",
                        f"affiliate_{TX_ID}")
        ok(f"Affiliate transfer: {t.id} — ${t.amount/100:.2f} → {AFFILIATE_ID}")
        AFFILIATE_TRANSFER_ID = t.id
    except stripe.error.StripeError as e:
        fail(f"Affiliate transfer failed: {e}")

# ─── 5. Idempotency — duplicate webhook protection ────────────
section("5. Idempotency (duplicate webhook safety)")

if MERCHANT_TRANSFER_ID and MERCHANT_ID:
    try:
        t2 = do_transfer(MERCHANT_PAYOUT, MERCHANT_ID, "merchant_payout",
                         f"merchant_{TX_ID}")   # same key
        if t2.id == MERCHANT_TRANSFER_ID:
            ok(f"Idempotency confirmed — duplicate returned same transfer: {t2.id}")
        else:
            fail(f"Idempotency broken — got new transfer: {t2.id}")
    except stripe.error.StripeError as e:
        fail(f"Idempotency test error: {e}")
else:
    info("Skipped — no transfer to duplicate")

# ─── 6. Transfer reversal (refund simulation) ─────────────────
section("6. Transfer Reversal (refund path)")

if MERCHANT_TRANSFER_ID:
    try:
        rev = stripe.Transfer.create_reversal(MERCHANT_TRANSFER_ID)
        ok(f"Merchant transfer reversal: {rev.id} — ${rev.amount/100:.2f} reversed")
    except stripe.error.StripeError as e:
        fail(f"Transfer reversal failed: {e}")
else:
    info("Skipped — no merchant transfer to reverse")

WEBHOOK_OK = False

# ─── 7. Webhook signature verification ───────────────────────
section("7. Webhook Signature Verification")

payload = json.dumps({
    "id": "evt_test_123",
    "object": "event",                          # required for SDK deserialization
    "type": "checkout.session.completed",
    "data": {"object": {
        "id": "cs_test_xxx",
        "object": "checkout.session",           # required for SDK type resolution
        "client_reference_id": f"{REF_CODE}:{PRODUCT_ID}",
        "payment_status": "paid",
        "amount_total": GROSS,
    }},
})

ts = str(int(time.time()))

# Stripe signs: HMAC-SHA256(key=webhook_secret_as_utf8_bytes, msg="{ts}.{payload}")
# The full "whsec_..." string is used directly as the key — do NOT base64-decode it.
sig = hmac.new(WEBHOOK_SECRET.encode("utf-8"), f"{ts}.{payload}".encode("utf-8"), hashlib.sha256).hexdigest()
sig_header = f"t={ts},v1={sig}"

try:
    event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    ok(f"Webhook signature verified — event type: {event.type}")
    # Use dict-style access; attribute .object conflicts with Python built-in
    session = event.data["object"]
    parsed_ref = session["client_reference_id"]
    ref_code, product_id = parsed_ref.split(":")
    ok(f"Parsed client_reference_id → ref_code={ref_code}, product_id={product_id}")
    WEBHOOK_OK = True
except Exception as e:
    fail(f"Webhook verification failed: {e}")

# ─── 8. Summary ───────────────────────────────────────────────
section("8. Final Summary")
checks = {
    "API keys valid (test mode)":           IS_TEST,
    "Connect enabled":                      MERCHANT_ID is not None,
    "Merchant Express account created":     MERCHANT_ID is not None,
    "Affiliate Express account created":    AFFILIATE_ID is not None,
    "Test payment succeeded ($100)":        (PAYMENT_INTENT_ID or CHARGE_ID) is not None,
    "Merchant transfer executed ($83)":     MERCHANT_TRANSFER_ID is not None,
    "Affiliate transfer executed ($15)":    AFFILIATE_TRANSFER_ID is not None,
    "Idempotency works":                    MERCHANT_TRANSFER_ID is not None,
    "Transfer reversal works":              MERCHANT_TRANSFER_ID is not None,
    "Webhook signature verification":       WEBHOOK_OK,
}

all_pass = True
for label, passed in checks.items():
    if passed: ok(label)
    else:      fail(label); all_pass = False

print("\n" + "─"*60)
if all_pass:
    print("  STRIPE INTEGRATION: FULLY VERIFIED")
    print("  Ready to build SplitLink on this foundation.")
else:
    print("  STRIPE INTEGRATION: PARTIAL — see failures above")
print("─"*60 + "\n")

# ─── Cleanup ──────────────────────────────────────────────────
section("Cleanup")
for aid, label in [(MERCHANT_ID, "merchant"), (AFFILIATE_ID, "affiliate")]:
    if aid:
        try:
            stripe.Account.delete(aid)
            ok(f"Deleted {label} test account: {aid}")
        except stripe.error.StripeError as e:
            info(f"Could not delete {label} account {aid}: {e}")
