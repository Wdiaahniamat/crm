import os
import json
from pywebpush import webpush, WebPushException

VAPID_KEY_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "vapid_keys.json")

def get_or_create_vapid_keys():
    """
    Returns (public_key, private_key, subscriber) dictionary.
    Priority order:
      1. Environment variables VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (recommended for cloud deployments)
      2. Persisted file data/vapid_keys.json (local / single-instance deployments)
      3. Auto-generate and save a new keypair (first-run fallback)
    Using env variables prevents key loss on server restarts where the filesystem is ephemeral.
    """
    subscriber = os.getenv("VAPID_SUBSCRIBER", "mailto:admin@xebright.tech")

    # 1. Try environment variables first (stable across restarts / deployments)
    env_public = os.getenv("VAPID_PUBLIC_KEY", "").strip()
    env_private = os.getenv("VAPID_PRIVATE_KEY", "").strip()
    if env_public and env_private:
        print("[VAPID] Loaded keys from environment variables.")
        return {
            "public_key": env_public,
            "private_key": env_private,
            "subscriber": subscriber
        }

    # 2. Try loading from persisted file
    os.makedirs(os.path.dirname(VAPID_KEY_FILE), exist_ok=True)
    if os.path.exists(VAPID_KEY_FILE):
        try:
            with open(VAPID_KEY_FILE, "r") as f:
                data = json.load(f)
                if "public_key" in data and "private_key" in data:
                    print("[VAPID] Loaded keys from file.")
                    return data
        except Exception:
            pass

    # 3. Generate new VAPID keypair and persist it
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        import base64

        private_key = ec.generate_private_key(ec.SECP256R1())

        # Format raw private key to URL-safe base64
        private_bytes = private_key.private_numbers().private_value.to_bytes(32, byteorder='big')
        private_b64 = base64.urlsafe_b64encode(private_bytes).rstrip(b'=').decode('utf-8')

        # Format raw public key to uncompressed point format (65 bytes), then URL-safe base64
        public_numbers = private_key.public_key().public_numbers()
        x = public_numbers.x.to_bytes(32, byteorder='big')
        y = public_numbers.y.to_bytes(32, byteorder='big')
        public_bytes = b'\x04' + x + y
        public_b64 = base64.urlsafe_b64encode(public_bytes).rstrip(b'=').decode('utf-8')

        keys = {
            "public_key": public_b64,
            "private_key": private_b64,
            "subscriber": subscriber
        }

        with open(VAPID_KEY_FILE, "w") as f:
            json.dump(keys, f, indent=2)

        print("[VAPID] Generated and saved new VAPID keypair.")
        print(f"[VAPID] ⚠️  Set these as environment variables to prevent key loss on restart:")
        print(f"[VAPID]   VAPID_PUBLIC_KEY={public_b64}")
        print(f"[VAPID]   VAPID_PRIVATE_KEY={private_b64}")

        return keys
    except Exception as e:
        print(f"[VAPID ERROR] Failed to generate keys: {e}")
        return {
            "public_key": "",
            "private_key": "",
            "subscriber": subscriber
        }
