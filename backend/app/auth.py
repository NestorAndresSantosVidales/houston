"""
Simplified authorization layer.

Maps demo bearer tokens to permission scopes. Designed so real Auth0
JWT verification can be dropped in by replacing the `resolve_token`
function — everything else stays the same.

Scopes:
  read:memory      — read anchors and consensus
  write:memory     — insert new anchors
  update:latent    — modify consensus weights
  admin:agents     — remove / restore agents
  review:quarantine — approve / reject quarantined items
"""
from __future__ import annotations

from fastapi import HTTPException, Request
from typing import List, Optional


DEMO_TOKENS: dict[str, dict] = {
    "demo-admin-token": {
        "actor": "admin@houston.ai",
        "scopes": [
            "read:memory",
            "write:memory",
            "update:latent",
            "admin:agents",
            "review:quarantine",
        ],
    },
    "demo-viewer-token": {
        "actor": "viewer@houston.ai",
        "scopes": ["read:memory"],
    },
    "demo-analyst-token": {
        "actor": "analyst@houston.ai",
        "scopes": ["read:memory", "write:memory", "update:latent"],
    },
}


class AuthContext:
    def __init__(self, actor: str, scopes: List[str]) -> None:
        self.actor = actor
        self.scopes = scopes

    def require(self, scope: str) -> None:
        if scope not in self.scopes:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied. Required scope: {scope}",
            )

    def has_scope(self, scope: str) -> bool:
        return scope in self.scopes


def resolve_token(token: str) -> Optional[AuthContext]:
    """
    Resolve a bearer token to an AuthContext.
    In production: validate JWT signature here, extract claims.
    """
    payload = DEMO_TOKENS.get(token)
    if not payload:
        return None
    return AuthContext(actor=payload["actor"], scopes=payload["scopes"])


def get_auth(request: Request) -> AuthContext:
    """
    FastAPI dependency that extracts and validates the bearer token.
    Returns AuthContext or raises 401/403.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        # In demo mode, default to admin context so the UI works without headers
        return AuthContext(actor="demo-admin@houston.ai", scopes=list(
            DEMO_TOKENS["demo-admin-token"]["scopes"]
        ))

    token = auth_header[len("Bearer "):]
    ctx = resolve_token(token)
    if ctx is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return ctx
