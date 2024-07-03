import hsa1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import UsersCollection from '../utils/users';

class AuthController {
  static async getConnect(request, response) {
    const { authorization } = request.headers;
    if (!authorization || !authorization.startsWith('Basic ')) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const base64Credentials = authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
      'ascii',
    );
    const [email, password] = credentials.split(':');
    if (!email || !password) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const user = await UsersCollection.getUser({
      email,
      password: hsa1(password),
    });
    if (!user || user.length === 0) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    await redisClient.set(
      `auth_${token}`,
      user[0]._id.toString(),
      60 * 60 * 60 * 24,
    );
    return response.status(200).json({ token });
  }

  static async getDisconnect(request, response) {
    const token = request.headers['x-token'];
    if (!token || (await redisClient.get(`auth_${token}`)) === null) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    redisClient.del(`auth_${token}`);
    return response.status(204).send();
  }
}

export default AuthController;
module.exports = AuthController;
