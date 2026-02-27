import httpx
import time
from eth_account import Account
from eth_account.messages import encode_defunct

# Generate a random account
acct = Account.create("random seed for testing the api endpoint 12345")
message_text = "Sign this message to authenticate with NovaX Terminal."
msg = encode_defunct(text=message_text)
signed_msg = acct.sign_message(msg)

payload = {
    "address": acct.address,
    "message": message_text,
    "signature": signed_msg.signature.hex()
}

print(f"Testing with address: {acct.address}")

try:
    response = httpx.post("http://localhost:8000/api/auth/web3", json=payload, timeout=10.0)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Connection Failed: {e}")
