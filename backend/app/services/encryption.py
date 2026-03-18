"""Fernet encryption service for credential storage."""

import os
from pathlib import Path

from cryptography.fernet import Fernet


def _getKeyPath() -> Path:
    """Get the path to the secret key file."""
    return Path("./db_query/.secret_key")


def _getOrGenerateKey() -> bytes:
    """Get existing key or generate a new one."""
    # First check environment variable
    envKey = os.environ.get("DB_QUERY_SECRET_KEY")
    if envKey:
        return envKey.encode()

    # Then check file
    keyPath = _getKeyPath()
    if keyPath.exists():
        return keyPath.read_bytes()

    # Generate new key
    keyPath.parent.mkdir(parents=True, exist_ok=True)
    newKey = Fernet.generate_key()
    keyPath.write_bytes(newKey)
    # Restrict permissions on key file
    keyPath.chmod(0o600)
    return newKey


_fernet: Fernet | None = None


def _getFernet() -> Fernet:
    """Get the Fernet instance (singleton)."""
    global _fernet
    if _fernet is None:
        key = _getOrGenerateKey()
        _fernet = Fernet(key)
    return _fernet


def encryptValue(plaintext: str) -> str:
    """Encrypt a plaintext string.

    Args:
        plaintext: The string to encrypt.

    Returns:
        The encrypted string (base64-encoded).
    """
    fernet = _getFernet()
    encrypted = fernet.encrypt(plaintext.encode())
    return encrypted.decode()


def decryptValue(ciphertext: str) -> str:
    """Decrypt a ciphertext string.

    Args:
        ciphertext: The encrypted string (base64-encoded).

    Returns:
        The decrypted plaintext string.

    Raises:
        cryptography.fernet.InvalidToken: If decryption fails.
    """
    fernet = _getFernet()
    decrypted = fernet.decrypt(ciphertext.encode())
    return decrypted.decode()
