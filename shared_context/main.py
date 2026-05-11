from fastapi import FastAPI, HTTPException, Query

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
def get_fibonacci_query(n: int = Query(..., description="Number of terms to generate")):
    """Get Fibonacci sequence using a query parameter."""
    if n <= 0:
        raise HTTPException(status_code=400, detail="Number of terms (n) must be a positive integer.")
    if n > 10000:
        raise HTTPException(status_code=400, detail="Number of terms (n) is too large.")
    return {"n": n, "sequence": generate_fibonacci(n)}

@app.get("/fibonacci/{n}")
def get_fibonacci_path(n: int):
    """Get Fibonacci sequence using a path parameter."""
    if n <= 0:
        raise HTTPException(status_code=400, detail="Number of terms (n) must be a positive integer.")
    if n > 10000:
        raise HTTPException(status_code=400, detail="Number of terms (n) is too large.")
    return {"n": n, "sequence": generate_fibonacci(n)}
