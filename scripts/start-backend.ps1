Set-Location "c:\workspace\acm\backend"
$env:PYTHONPATH = "src"
& "c:\workspace\acm\backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
