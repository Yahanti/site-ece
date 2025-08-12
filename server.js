const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: __dirname + '/.env' }); // Carrega as variáveis do .env

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do MongoDB
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectToDatabase() {
    try {
        await client.connect();
        console.log("Conectado ao MongoDB!");
        return client.db();
    } catch (error) {
        console.error("Erro ao conectar ao MongoDB:", error);
        process.exit(1);
    }
}

let db;
connectToDatabase().then(database => {
    db = database;
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
});

app.use(express.json());
app.use(cors());

// Rotas para Hires
app.get('/api/hires', async (req, res) => {
    try {
        const hires = await db.collection('hires').find().toArray();
        res.json(hires);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar contratações.' });
    }
});

app.post('/api/hires', async (req, res) => {
    try {
        const newHire = req.body;
        newHire.status = 'pending';
        const result = await db.collection('hires').insertOne(newHire);
        await db.collection('audit').insertOne({
            timestamp: new Date(),
            action: `Nova Contratação Submetida`,
            target: newHire.nick,
            admin: newHire.submittedBy
        });
        res.status(201).json({ ...newHire, _id: result.insertedId });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar contratação.' });
    }
});

app.put('/api/hires/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNick } = req.body;
        const { ObjectId } = require('mongodb');

        const result = await db.collection('hires').updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: status } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Contratação não encontrada.' });
        }

        const hire = await db.collection('hires').findOne({ _id: new ObjectId(id) });
        await db.collection('audit').insertOne({
            timestamp: new Date(),
            action: `${status === 'approved' ? 'Aprovação' : 'Recusa'} de Contratação`,
            target: hire.nick,
            admin: adminNick
        });
        
        res.json(hire);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar status.' });
    }
});

app.delete('/api/hires/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { ObjectId } = require('mongodb');
        const hireToDelete = await db.collection('hires').findOne({ _id: new ObjectId(id) });
        
        if (!hireToDelete) {
            return res.status(404).json({ message: 'Contratação não encontrada.' });
        }

        await db.collection('hires').deleteOne({ _id: new ObjectId(id) });
        await db.collection('audit').insertOne({
            timestamp: new Date(),
            action: 'Exclusão de Contratação',
            target: hireToDelete.nick,
            admin: req.query.adminNick
        });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir contratação.' });
    }
});

// Rotas para Students
app.get('/api/students', async (req, res) => {
    try {
        const students = await db.collection('students').find().toArray();
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar membros.' });
    }
});

app.post('/api/students', async (req, res) => {
    try {
        const newStudent = req.body;
        const existingStudent = await db.collection('students').findOne({ nick: newStudent.nick });
        if (existingStudent) {
            return res.status(409).json({ message: 'Membro já existe.' });
        }
        newStudent.canApply = false;
        await db.collection('students').insertOne(newStudent);
        res.status(201).json(newStudent);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar membro.' });
    }
});

app.delete('/api/students/:nick', async (req, res) => {
    try {
        const nickToRemove = req.params.nick;
        const result = await db.collection('students').deleteOne({ nick: nickToRemove });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Membro não encontrado.' });
        }

        await db.collection('audit').insertOne({
            timestamp: new Date(),
            action: 'Remoção de Membro',
            target: nickToRemove,
            admin: req.query.adminNick
        });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover membro.' });
    }
});

app.put('/api/students/:nick/permission', async (req, res) => {
    try {
        const nickToUpdate = req.params.nick;
        const { canApply, adminNick } = req.body;

        const result = await db.collection('students').updateOne(
            { nick: nickToUpdate },
            { $set: { canApply: canApply } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Membro não encontrado.' });
        }
        
        const updatedStudent = await db.collection('students').findOne({ nick: nickToUpdate });
        await db.collection('audit').insertOne({
            timestamp: new Date(),
            action: `Permissão de Aplicar ${canApply ? 'concedida' : 'revogada'}`,
            target: nickToUpdate,
            admin: adminNick
        });

        res.json(updatedStudent);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar permissão.' });
    }
});

// Rota para Auditoria
app.get('/api/audit', async (req, res) => {
    try {
        const audit = await db.collection('audit').find().toArray();
        res.json(audit);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar log de auditoria.' });
    }
});

// A rota inicial do frontend no Vercel (opcional, pode ser feito no vercel.json)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});