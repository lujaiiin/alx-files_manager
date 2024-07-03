import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static getStatus(request, response) {
    response
      .status(200)
      .json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  }

  static async getStats(request, response) {
    response
      .status(200)
      .json({
        users: await dbClient.nbUsers(),
        files: await dbClient.nbFiles(),
      });
  }
}

export default AppController;
module.exports = AppController;
