# Cortex Review: Python Fibonacci API

## Overview
The provided implementation by Forge is solid, utilizing FastAPI effectively and correctly implementing an iterative O(n) solution for generating the Fibonacci sequence. This avoids the catastrophic O(2^n) performance issues associated with naive recursive implementations. 

## Code Analysis & Edge Cases
1. **Algorithmic Efficiency:** The `generate_fibonacci(n)` function runs in O(n) time and uses O(n) space, which is optimal given the requirement to return the entire sequence.
2. **Denial of Service Prevention:** The inclusion of an upper bound check (`n > 10000`) is excellent for preventing CPU and memory exhaustion attacks.
3. **Zero and Negative Handling:** Edge cases for `n <= 0` are handled appropriately with HTTP 400 errors.

## Recommended Optimizations

### 1. Refactor Validation using FastAPI Built-ins
Currently, the bounds checking (`n <= 0` and `n > 10000`) is done manually inside the route handlers and duplicated across both endpoints. We can leverage FastAPI's `Query` and `Path` built-in validators (`ge=1`, `le=10000`) to handle this automatically at the framework level, drying up the code.

### 2. Caching / Memoization (Optional)
If this API is expected to handle high traffic where the same sequence lengths are frequently requested, we could implement caching. For Python, `functools.lru_cache` could be applied to `generate_fibonacci`. However, be cautious: caching large lists can consume significant memory. A better approach for purely returning the sequence might be a global pre-computed array if `n` is strictly capped at 10,000, or just relying on the fast O(n) generation since Python handles simple addition loops very quickly.

## Code Enhancements

Here is an enhanced version of `main.py` applying the suggested refactoring using FastAPI's built-in validation:

```python
from fastapi import FastAPI, HTTPException, Query, Path
from functools import lru_cache

app = FastAPI(title="Fibonacci API")

@lru_cache(maxsize=128)
def generate_fibonacci(n: int) -> tuple[int, ...]:
    """
    Generates the Fibonacci sequence up to n terms.
    Returns a tuple to make it hashable and cache-friendly.
    """
    if n <= 0:
        return ()
    elif n == 1:
        return (0,)
    
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return tuple(sequence)

@app.get("/fibonacci")
def get_fibonacci_query(
    n: int = Query(..., ge=1, le=10000, description="Number of terms to generate")
):
    """Get Fibonacci sequence using a query parameter."""
    return {"n": n, "sequence": generate_fibonacci(n)}

@app.get("/fibonacci/{n}")
def get_fibonacci_path(
    n: int = Path(..., ge=1, le=10000, description="Number of terms to generate")
):
    """Get Fibonacci sequence using a path parameter."""
    return {"n": n, "sequence": generate_fibonacci(n)}
```

**Changes Made:**
- Replaced manual `if n <= 0` and `if n > 10000` checks with FastAPI's `ge=1` and `le=10000` inside `Query` and `Path`. This makes the code DRY and lets FastAPI auto-generate validation errors.
- Added `@lru_cache` to `generate_fibonacci` for performance optimization on repeated requests.
- Modified `generate_fibonacci` to return a `tuple` instead of a `list`. Tuples are immutable, which prevents callers from accidentally modifying the cached object. FastAPI automatically converts tuples to JSON arrays in the response.