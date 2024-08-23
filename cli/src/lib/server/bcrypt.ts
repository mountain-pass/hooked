import bcryptjs from 'bcryptjs'

const bcrypt = {
  generateSalt: () => bcryptjs.genSaltSync(10),
  compare: (password: string, hashedPassword: string) => bcryptjs.compareSync(password, hashedPassword),
  hash: (password: string, salt: string) => bcryptjs.hashSync(password, salt)
}

export default bcrypt
