Set-Location "c:\workspace\acm\frontend"
$env:Path = "C:\Program Files\nodejs;" + $env:Path
$env:VITE_API_URL = "http://127.0.0.1:8000/api/v1"
& "C:\Program Files\nodejs\npm.cmd" run dev -- --host 127.0.0.1 --port 5173 --strictPort
