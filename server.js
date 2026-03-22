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

// Configuración de correo electrónico
// IMPORTANTE: Cambia estos datos con tu correo
const emailConfig = {
  // Para Gmail, usa estas credenciales
  user: 'ochamale45@gmail.com',      // <--- CAMBIA ESTO
  pass: 'fjtu bafd eyxk ysvh',        // <--- CAMBIA ESTO (ver notas abajo)
  to: 'tabletoscar024@gmail.com' // <--- CAMBIA ESTO (a donde quieres recibir)
};

// Crear transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass
  }
});

// Verificar conexión de correo
transporter.verify((error, success) => {
  if (error) {
    console.log('⚠️ Error en configuración de correo:', error);
  } else {
    console.log('✅ Configuración de correo OK');
  }
});

// Crear tablas y datos iniciales
db.serialize(() => {
  // Tabla municipios
  db.run(`CREATE TABLE IF NOT EXISTS municipios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
  )`);
  
  // Tabla comunidades
  db.run(`CREATE TABLE IF NOT EXISTS comunidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    municipio_id INTEGER
  )`);
  
  // Tabla registros
  db.run(`CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    departamento TEXT,
    municipio TEXT,
    comunidad TEXT,
    tipo_actividad TEXT,
    fecha TEXT,
    total_participantes INTEGER,
    hombres INTEGER,
    mujeres INTEGER,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Insertar municipios de Santa Rosa
  db.get("SELECT COUNT(*) as count FROM municipios", (err, row) => {
    if (err) return;
    if (row.count === 0) {
      const municipios = [
        'Cuilapa', 'Barberena', 'Casillas', 'Chiquimulilla', 'Guazacapán',
        'Nueva Santa Rosa', 'Oratorio', 'Pueblo Nuevo Viñas', 'San Juan Tecuaco',
        'San Rafael Las Flores', 'Santa Cruz Naranjo', 'Santa María Ixhuatán',
        'Santa Rosa de Lima', 'Taxisco'
      ];
      
      municipios.forEach(m => {
        db.run("INSERT INTO municipios (nombre) VALUES (?)", [m]);
      });
      
      setTimeout(() => {
        const comunidadesData = {
          'Cuilapa': ['Centro', 'El Jícaro', 'El Molino', 'Las Pozas', 'Los Encuentros'],
          'Barberena': ['Centro', 'El Zapote', 'San José La Máquina', 'El Progreso', 'Las Flores'],
          'Casillas': ['Centro', 'El Aguacate', 'El Cuje', 'El Pino', 'La Trinidad'],
          'Chiquimulilla': ['Centro', 'El Rosario', 'Las Lisas', 'Monterrico', 'El Pumpo'],
          'Guazacapán': ['Centro', 'El Cedro', 'El Rodeo', 'Las Flores', 'Los Limones'],
          'Nueva Santa Rosa': ['Centro', 'El Manzanote', 'El Naranjo', 'La Libertad', 'Las Mesas'],
          'Oratorio': ['Centro', 'El Chagüitón', 'El Morán', 'La Paz', 'Los Amates'],
          'Pueblo Nuevo Viñas': ['Centro', 'El Espino', 'El Rodeo', 'La Máquina', 'Las Crucitas'],
          'San Juan Tecuaco': ['Centro', 'El Cacao', 'El Cerrito', 'La Ceiba', 'San José'],
          'San Rafael Las Flores': ['Centro', 'El Durazno', 'El Manzanote', 'Las Flores', 'Los Limones'],
          'Santa Cruz Naranjo': ['Centro', 'El Camalote', 'El Pinal', 'La Cebadilla', 'Las Brisas'],
          'Santa María Ixhuatán': ['Centro', 'El Amatillo', 'El Cerron', 'Las Trojes', 'Paso de Ovejas'],
          'Santa Rosa de Lima': ['Centro', 'El Jute', 'El Tinto', 'La Esperanza', 'Las Ánimas'],
          'Taxisco': ['Centro', 'El Jobo', 'La Avellana', 'Las Marías', 'San Antonio']
        };
        
        municipios.forEach((municipio, idx) => {
          const municipioId = idx + 1;
          const comunidades = comunidadesData[municipio];
          if (comunidades) {
            comunidades.forEach(comunidad => {
              db.run("INSERT INTO comunidades (nombre, municipio_id) VALUES (?, ?)", 
                [comunidad, municipioId]);
            });
          }
        });
      }, 100);
    }
  });
});

// API Endpoints
app.get('/api/municipios', (req, res) => {
  db.all("SELECT id, nombre FROM municipios ORDER BY nombre", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/comunidades/:municipioId', (req, res) => {
  const { municipioId } = req.params;
  db.all("SELECT id, nombre FROM comunidades WHERE municipio_id = ? ORDER BY nombre", 
    [municipioId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Función para enviar correo
async function enviarCorreo(datos) {
  const { departamento, municipio, comunidad, tipo_actividad, fecha, total_participantes, hombres, mujeres } = datos;
  
  const htmlCorreo = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f4; }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 20px; border-radius: 0 0 10px 10px; }
        .field { margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-left: 4px solid #667eea; }
        .label { font-weight: bold; color: #2c3e50; display: inline-block; width: 150px; }
        .value { color: #555; }
        .footer { text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 12px; }
        h2 { color: #2c3e50; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📋 NUEVO REGISTRO DE ACTIVIDAD</h2>
          <p>Departamento de Santa Rosa, Guatemala</p>
        </div>
        <div class="content">
          <div class="field">
            <span class="label">📌 Departamento:</span>
            <span class="value">${departamento}</span>
          </div>
          <div class="field">
            <span class="label">🏘️ Municipio:</span>
            <span class="value">${municipio}</span>
          </div>
          <div class="field">
            <span class="label">🏠 Comunidad:</span>
            <span class="value">${comunidad}</span>
          </div>
          <div class="field">
            <span class="label">🎯 Tipo de Actividad:</span>
            <span class="value">${tipo_actividad}</span>
          </div>
          <div class="field">
            <span class="label">📅 Fecha:</span>
            <span class="value">${fecha}</span>
          </div>
          <div class="field">
            <span class="label">👥 Total Participantes:</span>
            <span class="value">${total_participantes}</span>
          </div>
          <div class="field">
            <span class="label">👨 Hombres:</span>
            <span class="value">${hombres}</span>
          </div>
          <div class="field">
            <span class="label">👩 Mujeres:</span>
            <span class="value">${mujeres}</span>
          </div>
        </div>
        <div class="footer">
          <p>Este reporte fue generado automáticamente el ${new Date().toLocaleString('es-GT')}</p>
          <p>Sistema de Registro de Actividades - Santa Rosa</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const mailOptions = {
    from: emailConfig.user,
    to: emailConfig.to,
    subject: `📋 Nuevo Registro - ${municipio} - ${tipo_actividad}`,
    html: htmlCorreo
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar correo:', error);
    return false;
  }
}

// Endpoint para guardar y enviar correo
app.post('/api/guardar', async (req, res) => {
  const { departamento, municipio, comunidad, tipo_actividad, fecha, total_participantes, hombres, mujeres } = req.body;
  
  // Primero guardar en base de datos
  db.run(`INSERT INTO registros 
    (departamento, municipio, comunidad, tipo_actividad, fecha, total_participantes, hombres, mujeres) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [departamento, municipio, comunidad, tipo_actividad, fecha, total_participantes, hombres, mujeres],
    async function(err) {
      if (err) {
        console.error('Error en BD:', err);
        return res.status(500).json({ error: 'Error al guardar en base de datos' });
      }
      
      // Enviar correo electrónico
      const emailEnviado = await enviarCorreo({
        departamento,
        municipio,
        comunidad,
        tipo_actividad,
        fecha,
        total_participantes,
        hombres,
        mujeres
      });
      
      if (emailEnviado) {
        res.json({ 
          success: true, 
          message: '✅ Registro guardado y correo enviado exitosamente',
          id: this.lastID 
        });
      } else {
        res.json({ 
          success: true, 
          message: '⚠️ Registro guardado pero hubo un error al enviar el correo',
          id: this.lastID 
        });
      }
    }
  );
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📧 Correo configurado para enviar a: ${emailConfig.to}`);
});