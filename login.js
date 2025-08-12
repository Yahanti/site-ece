// api/login.js
const bcrypt = require('bcrypt');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido.' });
  }

  const { password } = req.body;
  const hashedPassword = process.env.ADMIN_PASSWORD_HASH;

  if (!hashedPassword) {
    return res.status(500).json({ success: false, message: 'Senha do administrador não configurada.' });
  }

  const isPasswordCorrect = await bcrypt.compare(password, hashedPassword);

  if (isPasswordCorrect) {
    return res.status(200).json({ success: true, message: 'Login bem-sucedido!' });
  } else {
    return res.status(401).json({ success: false, message: 'Senha incorreta.' });
  }
}