const express = require('express');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const uuid4 = require('uuid4');
const cors = require('cors');
const multer = require('multer');
const path = require('path');


const app = express()
app.use(cors());

app.use(express.json());

app.use('/uploads', express.static('uploads'));

const OK = 200;
const INTENAL_SERVER_ERROE = 500;
const CREADTED = 201;
const NOT_FOUND = 404;


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Extrahiere die Dateiendung und füge sie dem Dateinamen hinzu
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + Date.now() + ext);
    }
});

const upload = multer({ storage: storage });


// Lese die Daten asynchron mit Promises siehe import oben ^
function getVisitors() {
    return fs.readFile('data.json', 'utf8')
        .then(data => JSON.parse(data))
        .catch(error => {
            console.error('Error reading from data.json:', error);
            return [];
        });
}

app.get('/api/visitors', (_, res) => {
    getVisitors()
        .then(visitor => res.json(visitor))
        .catch(() => res.status(INTENAL_SERVER_ERROE).send('Error fetching the posts'));
});

app.post('/api/visitors',
    [
        body('name').trim().isAlpha().withMessage('Der Vorname ist erforderlich.'),
        body('surname').trim().isAlpha().withMessage('Der Nachname ist erforderlich.'),
        body('email').trim().isEmail().withMessage('Eine gültige E-Mail-Adresse ist erforderlich.'),
        body('msg').trim().withMessage('Eine Nachricht ist erforderlich.')
    ],
    upload.single('image'), (req, res) => {
        // Ergebnisse der Validierung
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Wenn Fehler vorhanden sind, sende sie zurück zum Client
            return res.status(400).json({ errors: errors.array() });
        }
        getVisitors()
            .then(visitor => {
                const newVisitor = {
                    id: uuid4(),
                    name: req.body.name,
                    surname: req.body.surname,
                    email: req.body.email,
                    msg: req.body.msg,
                    UserImg: `/uploads/${req.body.file?.filename}`
                };
                visitor.push(newVisitor)
                return fs.writeFile('data.json', JSON.stringify(visitor, null, 2), 'utf8').then(() => newVisitor);
            })
            .then(newVisitor => res.status(CREADTED).json(newVisitor))
            .catch(error => {
                console.error(`Error writing on data.json ${error}`);
                res.status(INTENAL_SERVER_ERROE).send('Erros saving guest')
            })
    })

// endpoint not found handler
app.use((_, res) => {
    res.status(NOT_FOUND).json({
        success: false,
        error: "Route not found",
    });
});

const PORT = 420;
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});