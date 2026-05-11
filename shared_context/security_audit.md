# Security and Stability Audit: Fibonacci API

**Auditor:** Shield (Security Subagent)
**Status:** Approved with Required Patches

## Findings & Risk Assessment

### 1. Denial of Service (CPU & Bandwidth Exhaustion) - HIGH RISK
The current upper bound of `n = 10000` is dangerously high. While the integer addition is fast, JSON serialization of 10,000 extremely large integers takes ~0.35 seconds per request and generates a 10MB payload. 
- **Impact:** An attacker making concurrent requests for `n=10000` will rapidly exhaust FastAPI's thread pool (blocking the application) and saturate outbound network bandwidth.
- **Required Patch:** Reduce the maximum allowed value of `n`. A bound of `n=100` or `n=1000` is strongly recommended. (At `n=1000`, the payload drops to ~106KB and serialization takes <1ms).

### 2. Cache Exhaustion Risk - MEDIUM RISK
*Re: Cortex's review recommending `@lru_cache(maxsize=128)`*
Implementing the suggested LRU cache introduces a memory exhaustion vector. An attacker can request 128 unique sequence lengths near the maximum bound. If `n=10000`, this caches massive tuples in memory, consuming unnecessary RAM.
- **Impact:** Memory bloat/exhaustion with no real performance benefit.
- **Required Patch:** Do **not** implement caching. Generating the sequence up to a safe bound (e.g., 1000) takes fractions of a millisecond. Caching is unnecessary here and introduces stateful memory risks.

### 3. Input Validation Refactoring - LOW RISK (Quality Improvement)
Cortex's suggestion to use FastAPI's built-in `Path` and `Query` validators (`ge=1`, `le=...`) is excellent. It guarantees type safety, enforces bounds at the framework layer before handler execution, and DRYs the code.

## Final Sign-Off & Recommended `main.py` Patch

I sign off on the API provided the maximum bound is reduced and caching is omitted. Below is the patched, secure version of `main.py`:

```python
from fastapi import FastAPI, HTTPException, Query, Path

app = FastAPI(title="Fibonacci API")

def generate_fibonacci(n: int) -> list[int]:
    """Generates the Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence

@app.get("/fibonacci")
def get_fibonacci_query(
    n: int = Query(..., ge=1, le=1000, description="Number of terms to generate")
):
    """Get Fibonacci sequence using a query parameter."""
    return {"n": n, "sequence": generate_fibonacci(n)}

@app.get("/fibonacci/{n}")
def get_fibonacci_path(
    n: int = Path(..., ge=1, le=1000, description="Number of terms to generate")
):
    """Get Fibonacci sequence using a path parameter."""
    return {"n": n, "sequence": generate_fibonacci(n)}
```
