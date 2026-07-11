# GrapeVision — AGROEXPORT S.A.

Sistema de clasificación de uva de mesa con YOLOv8 (demo).
Stack: React 19 + Vite · FastAPI · SQLite

---

## Correr localmente

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

---

## Despliegue GRATUITO en internet

### Opción A — Railway (recomendado, más fácil)

1. Crea cuenta en https://railway.app (gratis, no pide tarjeta)
2. Instala Railway CLI: `npm install -g @railway/cli`
3. En la carpeta `backend/`:
   ```bash
   railway login
   railway init        # nombre: grapevision-api
   railway up
   ```
4. Copia la URL pública que Railway asigna (ej: https://grapevision-api.up.railway.app)

5. En la carpeta `frontend/`, crea `.env.production`:
   ```
   VITE_API_URL=https://TU-URL.up.railway.app
   ```
6. Sube el frontend a **Vercel** (gratis):
   ```bash
   npm install -g vercel
   vercel          # sigue los pasos, detecta Vite automáticamente
   ```

### Opción B — Render (backend) + Vercel (frontend)

**Backend en Render:**
1. https://render.com → New → Web Service → conecta tu repo de GitHub
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Plan: Free (750h/mes gratis)
5. Copia tu URL pública (ej: https://grapevision.onrender.com)

**Frontend en Vercel:**
1. Sube el proyecto a GitHub
2. https://vercel.com → Import Project → selecciona la carpeta `frontend`
3. En Environment Variables añade:
   `VITE_API_URL = https://TU-URL.onrender.com`
4. Deploy → en 2 minutos tienes URL pública gratis

### Opción C — Todo en un solo servicio (Replit, más simple para demo)

1. https://replit.com → Create Repl → Upload folder
2. Sube toda la carpeta del proyecto
3. Configura el run command: `uvicorn backend.main:app --host 0.0.0.0 --port 8000`
4. El frontend sirve los archivos estáticos desde FastAPI (añadir StaticFiles)

---

## Variables de entorno

| Variable    | Descripción                   | Default              |
|-------------|-------------------------------|----------------------|
| DB_PATH     | Ruta del archivo SQLite       | grapevision.db       |
| VITE_API_URL| URL del backend desde React   | http://localhost:8000|

---

## Endpoints principales

| Método | Ruta                 | Descripción                    |
|--------|----------------------|--------------------------------|
| POST   | /lotes               | Registrar nuevo lote           |
| GET    | /lotes               | Listar lotes registrados       |
| POST   | /predict             | Clasificar imagen (mock YOLO)  |
| POST   | /clasificaciones     | Guardar resultado              |
| GET    | /clasificaciones     | Listar historial               |
| POST   | /validaciones        | Registrar validación supervisor|
| GET    | /validaciones/stats  | Estadísticas de precisión      |
| GET    | /health              | Health check                   |
| GET    | /docs                | Swagger UI automático          |
