// api/login.js

// Importa a biblioteca 'bcrypt' para comparar a senha.
// Você precisará instalá-la com 'npm install bcrypt' ou 'yarn add bcrypt'
const bcrypt = require('bcrypt');

// Seu endpoint que vai processar o login
export default async function handler(req, res) {
  // Apenas aceitamos requisições do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido.' });
  }

  // A senha digitada pelo usuário está no corpo da requisição
  const { password } = req.body;

  // IMPORTANTE: A senha real nunca deve estar no seu código!
  // Ela deve ser uma variável de ambiente no Vercel.
  const hashedPassword = process.env.ADMIN_PASSWORD_HASH;

  // Verifica se a senha digitada é igual à senha criptografada.
  // Usamos 'bcrypt.compare' para isso, que é a forma segura.
  const isPasswordCorrect = await bcrypt.compare(password, hashedPassword);

  if (isPasswordCorrect) {
    // Se a senha estiver correta, retorna uma mensagem de sucesso
    return res.status(200).json({ success: true, message: 'Login bem-sucedido!' });
  } else {
    // Se a senha estiver incorreta, retorna um erro
    return res.status(401).json({ success: false, message: 'Senha incorreta.' });
  }
}
