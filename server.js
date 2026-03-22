const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Base de datos SQLite
const db = new sqlite3.Database('./santa_rosa.db');

// Configuración de correo
const emailConfig = {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  to: process.env.EMAIL_TO
};

// Transporter de correo
let transporter = null;
if (emailConfig.user && emailConfig.pass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: emailConfig.user, pass: emailConfig.pass }
  });
  console.log('✅ Correo configurado');
} else {
  console.log('⚠️ Sin configuración de correo');
}

// Inicializar base de datos
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS municipios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL)`);
  db.run(`CREATE TABLE IF NOT EXISTS comunidades (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, municipio_id INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    departamento TEXT, municipio TEXT, comunidad TEXT, tipo_actividad TEXT,
    fecha TEXT, total_participantes INTEGER, hombres INTEGER, mujeres INTEGER,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.get("SELECT COUNT(*) as count FROM municipios", (err, row) => {
    if (!err && row.count === 0) {
      const municipios = ['Cuilapa', 'Barberena', 'Casillas', 'Chiquimulilla', 'Guazacapán',
        'Nueva Santa Rosa', 'Oratorio', 'Pueblo Nuevo Viñas', 'San Juan Tecuaco',
        'San Rafael Las Flores', 'Santa Cruz Naranjo', 'Santa María Ixhuatán',
        'Santa Rosa de Lima', 'Taxisco'];
      
      municipios.forEach(m => db.run("INSERT INTO municipios (nombre) VALUES (?)", [m]));
      
      setTimeout(() => {
        const comunidadesData = {
          'Cuilapa': ['Centro', 'El Jícaro', 'El Molino', 'Las Pozas'],
          'Barberena': ['Centro', 'El Zapote', 'San José La Máquina', 'El Progreso'],
          'Casillas': ['Centro', 'El Aguacate', 'El Cuje', 'El Pino'],
          'Chiquimulilla': ['Centro', 'El Rosario', 'Las Lisas', 'Monterrico'],
          'Guazacapán': ['Centro', 'El Cedro', 'El Rodeo', 'Las Flores'],
          'Nueva Santa Rosa': ['Centro', 'El Manzanote', 'El Naranjo', 'La Libertad'],
          'Oratorio': ['Centro', 'El Chagüitón', 'El Morán', 'La Paz'],
          'Pueblo Nuevo Viñas': ['Centro', 'El Espino', 'El Rodeo', 'La Máquina'],
          'San Juan Tecuaco': ['Centro', 'El Cacao', 'El Cerrito', 'La Ceiba'],
          'San Rafael Las Flores': ['Centro', 'El Durazno', 'El Manzanote', 'Las Flores'],
          'Santa Cruz Naranjo': ['Centro', 'El Camalote', 'El Pinal', 'La Cebadilla'],
          'Santa María Ixhuatán': ['Centro', 'El Amatillo', 'El Cerron', 'Las Trojes'],
          'Santa Rosa de Lima': ['Centro', 'El Jute', 'El Tinto', 'La Esperanza'],
          'Taxisco': ['Centro', 'El Jobo', 'La Avellana', 'Las Marías']
        };
        
        municipios.forEach((m, idx) => {
          const mid = idx + 1;
          const comunidades = comunidadesData[m];
          if (comunidades) {
            comunidades.forEach(c => db.run("INSERT INTO comunidades (nombre, municipio_id) VALUES (?, ?)", [c, mid]));
          }
        });
      }, 100);
    }
  });
});

// Endpoints API
app.get('/api/municipios', (req, res) => {
  db.all("SELECT id, nombre FROM municipios ORDER BY nombre", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/comunidades/:municipioId', (req, res) => {
  db.all("SELECT id, nombre FROM comunidades WHERE municipio_id = ? ORDER BY nombre", [req.params.municipioId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Función para enviar correo
async function enviarCorreo(datos) {
  if (!transporter) return false;
  
  const { departamento, municipio, comunidad, tipo_actividad, fecha, total_participantes, hombres, mujeres } = datos;
  
  const html = `
    <h2>📋 Nuevo Registro de Actividad</h2>
    <p><strong>Departamento:</strong> ${departamento}</p>
    <p><strong>Municipio:</strong> ${municipio}</p>
    <p><strong>Comunidad:</strong> ${comunidad}</p>
    <p><strong>Tipo:</strong> ${tipo_actividad}</p>
    <p><strong>Fecha:</strong> ${fecha}</p>
    <p><strong>Total:</strong> ${total_participantes}</p>
    <p><strong>Hombres:</strong> ${hombres}</p>
    <p><strong>Mujeres:</strong> ${mujeres}</p>
    <hr>
    <p>Reporte generado el ${new Date().toLocaleString('es-GT')}</p>
  `;
  
  try {
    await transporter.sendMail({
      from: emailConfig.user,
      to: emailConfig.to,
      subject: `📋 Nuevo Registro - ${municipio}`,
      html
    });
    return true;
  } catch (error) {
    console.error('Error correo:', error.message);
    return false;
  }
}

// ENDPOINT PRINCIPAL - GUARDAR
app.post('/api/guardar', async (req, res) => {
  console.log('📝 POST /api/guardar recibido');
  console.log('Body:', req.body);
  
  const { departamento, municipio, comunidad, tipo_actividad, fecha, total_participantes, hombres, mujeres } = req.body;
  
  if (!municipio || !comunidad || !tipo_actividad || !fecha) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  
  db.run(`INSERT INTO registros 
    (departamento, municipio, comunidad, tipo_actividad, fecha, total_participantes, hombres, mujeres) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [departamento, municipio, comunidad, tipo_actividad, fecha, total_participantes, hombres, mujeres],
    async function(err) {
      if (err) {
        console.error('Error BD:', err);
        return res.status(500).json({ error: 'Error al guardar' });
      }
      
      console.log('✅ Guardado ID:', this.lastID);
      
      const emailOk = await enviarCorreo(req.body);
      
      res.json({ 
        success: true, 
        message: emailOk ? '✅ Guardado y correo enviado' : '⚠️ Guardado, error en correo',
        id: this.lastID 
      });
    }
  );
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor en puerto ${PORT}`);
  console.log(`📧 Correo: ${emailConfig.to || 'no configurado'}`);
});