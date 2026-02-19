<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Rutas HTTP


### Listado de Leads
```bash
curl -X GET 'http://localhost:8000/api/leads?page=1&limit=20&search=null' \
  --header 'Authorization: Bearer token'
```

### Registro de nuevos leads
```bash
curl -X PATCH 'http://localhost:8000/api/leads' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Mattias",
    "lastname": "Duarte",
    "source": "WHATSAPP",
    "status": "NEW",
    "priority": "LOW"
}' \
  --header 'Authorization: Bearer'
```