"""Bounded recovery for connection establishment, before a model request is sent."""
from __future__ import annotations

import asyncio
import json
import logging
import random
import socket
import ssl
import time
from collections.abc import Awaitable, Callable
from typing import TypeVar

import httpx

from .model_call import ModelCallTracker, model_error_chain, model_error_diagnostics

_T = TypeVar("_T")
_LOGGER = logging.getLogger("uvicorn.error.tasklattice.model")


def _transient_connection(error: BaseException) -> bool:
    # Certificate and permanent DNS errors need configuration repair. Never
    # retry read/write failures: the provider may already have billed the call.
    return not any(isinstance(e, ssl.SSLCertVerificationError)
                   or (isinstance(e, socket.gaierror) and e.errno != socket.EAI_AGAIN)
                   for e in model_error_chain(error))


async def with_connection_retry(operation: Callable[[], Awaitable[_T]], *,
                                deadline: float, call: ModelCallTracker) -> _T:
    """At most two connection attempts within one shared monotonic deadline.

    The deadline includes connection, response, and backoff time. Cancellation
    propagates immediately. HTTP statuses and invalid model outputs do not retry.
    """
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise TimeoutError("Model call deadline exceeded")
    async with asyncio.timeout(remaining):
        for attempt in range(2):
            try:
                return await operation()
            except (httpx.ConnectError, httpx.ConnectTimeout) as error:
                delay = random.uniform(0.1, 0.2)
                retry = attempt == 0 and _transient_connection(error) and deadline - time.monotonic() > delay + 0.05
                _LOGGER.warning("%s", json.dumps({"event": "model_connection_failure",
                    "call_id": call.call_id, "attempt": attempt + 1, "will_retry": retry,
                    "planned_backoff_ms": round(delay * 1000) if retry else 0,
                    **model_error_diagnostics(error)}))
                if not retry:
                    raise
                started = time.monotonic()
                try:
                    await asyncio.sleep(delay)
                finally:
                    call.backoff_ms += max(0, round((time.monotonic() - started) * 1000))
                call.retries += 1
    raise AssertionError("Unreachable connection retry state")
